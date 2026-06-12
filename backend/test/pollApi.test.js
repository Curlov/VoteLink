import test from "node:test";
import assert from "node:assert/strict";
import { pool } from "../src/db/pool.js";
import { nanoid } from "nanoid";
import {
  closePollAdminByToken,
  activatePollByToken,
  createPoll,
  createVote,
  deletePollAdminByToken,
  extendPollAdminByToken,
  getParticipationByPublicId,
  getPollAdminByToken,
  getPollByPublicId,
  getPollResultsByPublicId,
  updatePollAdminByToken,
} from "../src/models/poll.model.js";

test(
  "Poll Model blockiert doppelte Stimmen und erlaubt Admin-Aktionen",
  {
    skip:
      process.env.RUN_DB_TESTS === "1"
        ? false
        : "DB-Integrationstest läuft über npm run test:db.",
  },
  async () => {
    let adminToken;
    let publicId;
    let multiAdminToken;
    let multiPublicId;

    try {
      const questionSchemaResult = await pool.query(
        `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'poll_questions'
        `
      );
      const questionColumns = new Set(
        questionSchemaResult.rows.map((row) => row.column_name)
      );

      assert.equal(questionColumns.has("poll_id"), true);
      assert.equal(questionColumns.has("question_text"), true);
      assert.equal(questionColumns.has("question_type"), true);
      assert.equal(questionColumns.has("allow_multiple_votes"), true);

      const optionQuestionColumnResult = await pool.query(
        `
        SELECT is_nullable
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'poll_options'
          AND column_name = 'question_id'
        `
      );

      assert.equal(optionQuestionColumnResult.rows[0]?.is_nullable, "NO");
      const createResult = await createPoll({
        publicId: nanoid(10),
        adminToken: nanoid(32),
        activationToken: nanoid(32),
        title: "Integration Test Poll",
        description: "",
        creatorName: "",
        creatorEmail: "integration@example.com",
        isAnonymous: true,
        allowMultipleVotes: false,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        options: ["A", "B"],
      });
      assert.equal(createResult.success, true);
      const createdPoll = createResult.poll;

      publicId = createdPoll.public_id;
      adminToken = createdPoll.admin_token;

      assert.equal(createdPoll.status, "pending");
      assert.equal(await getPollByPublicId(publicId), null);
      const questionResult = await pool.query(
        `
        SELECT
          pq.id,
          pq.question_text,
          pq.question_type,
          pq.allow_multiple_votes,
          pq.position,
          COUNT(po.id)::int AS option_count
        FROM poll_questions pq
        LEFT JOIN poll_options po
          ON po.question_id = pq.id
        WHERE pq.poll_id = $1
        GROUP BY pq.id
        `,
        [createdPoll.id]
      );

      assert.equal(questionResult.rowCount, 1);
      assert.equal(questionResult.rows[0].question_text, createdPoll.title);
      assert.equal(questionResult.rows[0].question_type, "single_choice");
      assert.equal(questionResult.rows[0].allow_multiple_votes, false);
      assert.equal(questionResult.rows[0].position, 0);
      assert.equal(questionResult.rows[0].option_count, 2);

      const optionQuestionResult = await pool.query(
        `
        SELECT COUNT(DISTINCT question_id)::int AS question_count
        FROM poll_options
        WHERE poll_id = $1
        `,
        [createdPoll.id]
      );

      assert.equal(optionQuestionResult.rows[0].question_count, 1);
      const storedTokenResult = await pool.query(
        `
        SELECT admin_token, activation_token
        FROM polls
        WHERE public_id = $1
        `,
        [publicId]
      );
      assert.notEqual(storedTokenResult.rows[0].admin_token, adminToken);
      assert.notEqual(
        storedTokenResult.rows[0].activation_token,
        createdPoll.activation_token
      );
      assert.equal(storedTokenResult.rows[0].admin_token.length, 64);
      assert.equal(storedTokenResult.rows[0].activation_token.length, 64);

      const activatedPoll = await activatePollByToken(
        createdPoll.activation_token
      );
      assert.equal(activatedPoll.publicId, publicId);
      const activatedAgainPoll = await activatePollByToken(
        createdPoll.activation_token
      );
      assert.equal(activatedAgainPoll.publicId, publicId);
      let poll = await getPollByPublicId(publicId);
      const [firstOption, secondOption] = poll.options;

      assert.equal(poll.options.length, 2);
      assert.equal(poll.questions.length, 1);
      assert.equal(poll.questions[0].text, "Integration Test Poll");
      assert.equal(poll.questions[0].questionType, "single_choice");
      assert.equal(poll.questions[0].allowMultipleVotes, false);
      assert.deepEqual(poll.questions[0].options, poll.options);

      const firstToken = "1234567890abcdef-first-api-test-token";
      const secondToken = "1234567890abcdef-second-api-test-token";

      let participation = await getParticipationByPublicId({
        publicId,
        voterToken: firstToken,
      });
      assert.equal(participation.success, true);
      assert.equal(participation.hasVoted, false);

      let voteResult = await createVote({
        publicId,
        optionId: firstOption.id,
        voterToken: firstToken,
      });
      assert.equal(voteResult.success, true);
      const results = await getPollResultsByPublicId(publicId);
      assert.equal(results.totalVotes, 1);
      assert.equal(results.totalVoters, 1);
      assert.equal(results.options.length, 2);
      assert.equal(results.options[0].voteCount, 1);
      assert.equal(results.options[0].percentage, 100);
      assert.equal(results.options[1].voteCount, 0);
      assert.equal(results.options[1].percentage, 0);
      assert.equal(results.questions.length, 1);
      assert.equal(results.questions[0].text, "Integration Test Poll");
      assert.equal(results.questions[0].questionType, "single_choice");
      assert.equal(results.questions[0].allowMultipleVotes, false);
      assert.equal(results.questions[0].totalVotes, 1);
      assert.deepEqual(results.questions[0].options, results.options);

      participation = await getParticipationByPublicId({
        publicId,
        voterToken: firstToken,
      });
      assert.equal(participation.success, true);
      assert.equal(participation.hasVoted, true);

      voteResult = await createVote({
        publicId,
        optionIds: [secondOption.id],
        voterToken: firstToken,
      });
      assert.equal(voteResult.success, false);
      assert.equal(voteResult.status, 409);

      let adminPoll = await closePollAdminByToken(adminToken);
      assert.ok(adminPoll.expiresAt);
      assert.equal(adminPoll.status, "expired");
      assert.equal(adminPoll.options.length, 2);
      assert.equal(adminPoll.questions.length, 1);
      assert.deepEqual(adminPoll.questions[0].options, adminPoll.options);

      voteResult = await createVote({
        publicId,
        optionIds: [secondOption.id],
        voterToken: secondToken,
      });
      assert.equal(voteResult.success, false);
      assert.equal(voteResult.status, 403);

      adminPoll = await extendPollAdminByToken(adminToken, 1);
      assert.ok(new Date(adminPoll.expiresAt) > new Date());
      assert.equal(adminPoll.status, "active");

      voteResult = await createVote({
        publicId,
        answers: [
          {
            questionId: poll.questions[0].id,
            optionIds: [secondOption.id],
          },
        ],
        voterToken: secondToken,
      });
      assert.equal(voteResult.success, true);
      const multiCreateResult = await createPoll({
        publicId: nanoid(10),
        adminToken: nanoid(32),
        activationToken: nanoid(32),
        title: "Integration Multi Question Poll",
        description: "",
        creatorName: "Integration",
        creatorEmail: "integration-multi@example.com",
        isAnonymous: true,
        allowMultipleVotes: false,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        options: ["Termin A", "Termin B"],
      });
      assert.equal(multiCreateResult.success, true);
      const multiCreatedPoll = multiCreateResult.poll;

      multiPublicId = multiCreatedPoll.public_id;
      multiAdminToken = multiCreatedPoll.admin_token;
      await activatePollByToken(multiCreatedPoll.activation_token);

      const extraQuestionResult = await pool.query(
        `
        INSERT INTO poll_questions (
          poll_id,
          question_text,
          question_type,
          allow_multiple_votes,
          position
        )
        VALUES ($1, 'Essen?', 'single_choice', true, 1)
        RETURNING id
        `,
        [multiCreatedPoll.id]
      );
      const extraQuestionId = extraQuestionResult.rows[0].id;
      await pool.query(
        `
        INSERT INTO poll_options (poll_id, question_id, option_text, position)
        VALUES
          ($1, $2, 'Vegetarisch', 0),
          ($1, $2, 'Fleisch', 1)
        `,
        [multiCreatedPoll.id, extraQuestionId]
      );
      const extraOptionsResult = await pool.query(
        `
        SELECT id
        FROM poll_options
        WHERE question_id = $1
        ORDER BY position ASC
        `,
        [extraQuestionId]
      );

      const multiPoll = await getPollByPublicId(multiPublicId);
      const defaultQuestion = multiPoll.questions[0];
      const extraQuestion = multiPoll.questions[1];
      const [defaultFirstOption, defaultSecondOption] = defaultQuestion.options;
      const [extraFirstOption, extraSecondOption] = extraOptionsResult.rows;
      voteResult = await createVote({
        publicId: multiPublicId,
        answers: [
          {
            questionId: extraQuestion.id,
            optionIds: [defaultFirstOption.id],
          },
        ],
        voterToken: "1234567890abcdef-wrong-question-token",
      });
      assert.equal(voteResult.success, false);
      assert.equal(voteResult.status, 400);
      assert.match(voteResult.error, /angegebenen Frage/);

      voteResult = await createVote({
        publicId: multiPublicId,
        answers: [
          {
            questionId: defaultQuestion.id,
            optionIds: [firstOption.id],
          },
        ],
        voterToken: "1234567890abcdef-foreign-option-token",
      });
      assert.equal(voteResult.success, false);
      assert.equal(voteResult.status, 400);
      assert.match(voteResult.error, /dieser Abstimmung/);

      voteResult = await createVote({
        publicId: multiPublicId,
        answers: [
          {
            questionId: defaultQuestion.id,
            optionIds: [defaultFirstOption.id, defaultSecondOption.id],
          },
        ],
        voterToken: "1234567890abcdef-too-many-options-token",
      });
      assert.equal(voteResult.success, false);
      assert.equal(voteResult.status, 400);
      assert.match(voteResult.error, /nur eine Option/);

      voteResult = await createVote({
        publicId: multiPublicId,
        answers: [
          {
            questionId: defaultQuestion.id,
            optionIds: [defaultFirstOption.id],
          },
          {
            questionId: defaultQuestion.id,
            optionIds: [defaultSecondOption.id],
          },
        ],
        voterToken: "1234567890abcdef-duplicate-question-token",
      });
      assert.equal(voteResult.success, false);
      assert.equal(voteResult.status, 400);
      assert.match(voteResult.error, /mehrfach beantwortet/);

      voteResult = await createVote({
        publicId: multiPublicId,
        answers: [
          {
            questionId: extraQuestion.id,
            optionIds: [extraFirstOption.id, extraFirstOption.id],
          },
        ],
        voterToken: "1234567890abcdef-duplicate-option-token",
      });
      assert.equal(voteResult.success, false);
      assert.equal(voteResult.status, 400);
      assert.match(voteResult.error, /Option mehrfach/);
      voteResult = await createVote({
        publicId: multiPublicId,
        answers: [
          {
            questionId: defaultQuestion.id,
            optionIds: [defaultFirstOption.id],
          },
          {
            questionId: extraQuestion.id,
            optionIds: [extraFirstOption.id, extraSecondOption.id],
          },
        ],
        voterToken: "1234567890abcdef-multi-question-token",
      });
      assert.equal(voteResult.success, true);
      assert.equal(voteResult.votes.length, 3);

      const multiResults = await getPollResultsByPublicId(multiPublicId);
      assert.equal(multiResults.totalVotes, 3);
      assert.equal(multiResults.totalVoters, 1);
      assert.equal(multiResults.questions.length, 2);
      assert.equal(multiResults.questions[0].totalVotes, 1);
      assert.equal(multiResults.questions[0].options[0].voteCount, 1);
      assert.equal(multiResults.questions[0].options[0].percentage, 100);
      assert.equal(multiResults.questions[1].totalVotes, 2);
      assert.equal(multiResults.questions[1].options[0].voteCount, 1);
      assert.equal(multiResults.questions[1].options[0].percentage, 50);
      assert.equal(multiResults.questions[1].options[1].voteCount, 1);
      assert.equal(multiResults.questions[1].options[1].percentage, 50);
      assert.equal(await deletePollAdminByToken(multiAdminToken), true);
      multiAdminToken = null;
      multiPublicId = null;
      for (let participantIndex = 3; participantIndex <= 20; participantIndex++) {
        voteResult = await createVote({
          publicId,
          optionIds: [firstOption.id],
          voterToken: `1234567890abcdef-api-test-token-${participantIndex}`,
        });
        assert.equal(voteResult.success, true);
      }
      voteResult = await createVote({
        publicId,
        optionIds: [firstOption.id],
        voterToken: "1234567890abcdef-api-test-token-21",
      });
      assert.equal(voteResult.success, false);
      assert.equal(voteResult.status, 403);
      assert.match(voteResult.error, /Teilnehmerlimit von 20/);
      adminPoll = await updatePollAdminByToken(adminToken, {
        title: "Integration Test Poll Updated",
        description: "Updated by test",
      });
      assert.equal(adminPoll.title, "Integration Test Poll Updated");

      assert.equal(await deletePollAdminByToken(adminToken), true);

      poll = await getPollByPublicId(publicId);
      assert.equal(poll, null);
      assert.equal(await getPollAdminByToken(adminToken), null);
      adminToken = null;
    } finally {
      if (multiAdminToken) {
        await deletePollAdminByToken(multiAdminToken);
      }

      if (multiPublicId) {
        await pool.query(
          `
          DELETE FROM poll_participations
          WHERE poll_id IN (SELECT id FROM polls WHERE public_id = $1)
          `,
          [multiPublicId]
        );
        await pool.query(
          `
          DELETE FROM votes
          WHERE poll_id IN (SELECT id FROM polls WHERE public_id = $1)
          `,
          [multiPublicId]
        );
        await pool.query(
          `
          DELETE FROM poll_options
          WHERE poll_id IN (SELECT id FROM polls WHERE public_id = $1)
          `,
          [multiPublicId]
        );
        await pool.query("DELETE FROM polls WHERE public_id = $1", [
          multiPublicId,
        ]);
      }

      if (publicId) {
        await pool.query(
          `
          DELETE FROM poll_participations
          WHERE poll_id IN (SELECT id FROM polls WHERE public_id = $1)
          `,
          [publicId]
        );
        await pool.query(
          `
          DELETE FROM votes
          WHERE poll_id IN (SELECT id FROM polls WHERE public_id = $1)
          `,
          [publicId]
        );
        await pool.query(
          `
          DELETE FROM poll_options
          WHERE poll_id IN (SELECT id FROM polls WHERE public_id = $1)
          `,
          [publicId]
        );
        await pool.query("DELETE FROM polls WHERE public_id = $1", [publicId]);
      }

      await pool.end();
    }
  }
);
