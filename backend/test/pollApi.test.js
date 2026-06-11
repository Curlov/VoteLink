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

    try {
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
        optionIds: [firstOption.id],
        voterToken: firstToken,
      });
      assert.equal(voteResult.success, true);

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
        optionIds: [secondOption.id],
        voterToken: secondToken,
      });
      assert.equal(voteResult.success, true);

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
