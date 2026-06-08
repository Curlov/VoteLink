import test from "node:test";
import assert from "node:assert/strict";
import { pool } from "../src/db/pool.js";
import { nanoid } from "nanoid";
import {
  closePollAdminByToken,
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

    try {
      const createdPoll = await createPoll({
        publicId: nanoid(10),
        adminToken: nanoid(32),
        title: "Integration Test Poll",
        description: "",
        creatorName: "",
        creatorEmail: "integration@example.com",
        isAnonymous: true,
        allowMultipleVotes: false,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        options: ["A", "B"],
      });

      const publicId = createdPoll.public_id;
      adminToken = createdPoll.admin_token;

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

      voteResult = await createVote({
        publicId,
        optionIds: [secondOption.id],
        voterToken: secondToken,
      });
      assert.equal(voteResult.success, false);
      assert.equal(voteResult.status, 403);

      adminPoll = await extendPollAdminByToken(adminToken, 1);
      assert.ok(new Date(adminPoll.expiresAt) > new Date());

      voteResult = await createVote({
        publicId,
        optionIds: [secondOption.id],
        voterToken: secondToken,
      });
      assert.equal(voteResult.success, true);

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
      if (adminToken) {
        await pool.query(
          `
          DELETE FROM poll_participations
          WHERE poll_id IN (SELECT id FROM polls WHERE admin_token = $1)
          `,
          [adminToken]
        );
        await pool.query(
          `
          DELETE FROM votes
          WHERE poll_id IN (SELECT id FROM polls WHERE admin_token = $1)
          `,
          [adminToken]
        );
        await pool.query(
          `
          DELETE FROM poll_options
          WHERE poll_id IN (SELECT id FROM polls WHERE admin_token = $1)
          `,
          [adminToken]
        );
        await pool.query("DELETE FROM polls WHERE admin_token = $1", [
          adminToken,
        ]);
      }

      await pool.end();
    }
  }
);
