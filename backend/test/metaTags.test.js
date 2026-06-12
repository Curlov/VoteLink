import test from "node:test";
import assert from "node:assert/strict";
import { nanoid } from "nanoid";
import { app } from "../src/app.js";
import { pool } from "../src/db/pool.js";
import {
  activatePollByToken,
  createPoll,
  deletePollAdminByToken,
} from "../src/models/poll.model.js";

function requestHtml(server, path) {
  const { port } = server.address();

  return fetch(`http://127.0.0.1:${port}${path}`, {
    headers: {
      accept: "text/html",
    },
  });
}

test(
  "Express liefert Poll-Routen mit dynamischen, escaped Meta-Tags aus",
  {
    skip:
      process.env.RUN_DB_TESTS === "1"
        ? false
        : "DB-Integrationstest läuft über npm run test:db.",
  },
  async () => {
    let adminToken;
    let server;
    const originalPublicAppUrl = process.env.PUBLIC_APP_URL;

    try {
      process.env.PUBLIC_APP_URL = "https://votelink.example";
      const publicId = nanoid(10);
      const createResult = await createPoll({
        publicId,
        adminToken: nanoid(32),
        activationToken: nanoid(32),
        title: 'Meta <Poll> "Test"',
        description: 'Beschreibung mit <script>alert("x")</script> & Text',
        creatorName: "Meta Test",
        creatorEmail: "meta@example.com",
        isAnonymous: true,
        allowMultipleVotes: false,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        options: ["A", "B"],
      });

      assert.equal(createResult.success, true);
      adminToken = createResult.poll.admin_token;
      await activatePollByToken(createResult.poll.activation_token);

      server = app.listen(0, "127.0.0.1");
      await new Promise((resolve) => server.once("listening", resolve));

      const response = await requestHtml(server, `/p/${publicId}`);
      const html = await response.text();

      assert.equal(response.status, 200);
      assert.match(
        html,
        /<title>Meta &lt;Poll&gt; &quot;Test&quot; \| VoteLink<\/title>/
      );
      assert.match(
        html,
        /<meta name="description" content="Beschreibung mit &lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt; &amp; Text" \/>/
      );
      assert.match(
        html,
        /<meta property="og:title" content="Meta &lt;Poll&gt; &quot;Test&quot; \| VoteLink" \/>/
      );
      assert.match(html, /<meta property="og:type" content="website" \/>/);
      assert.match(
        html,
        new RegExp(
          `<meta property="og:url" content="https://votelink\\.example/p/${publicId}" />`
        )
      );
      assert.match(
        html,
        /<meta property="og:image" content="https:\/\/votelink\.example\/icon-512\.png" \/>/
      );
      assert.match(html, /<meta name="twitter:card" content="summary_large_image" \/>/);
      assert.doesNotMatch(html, /admin_token|activation_token|creatorEmail|meta@example\.com/);
    } finally {
      if (server) {
        await new Promise((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
        });
      }

      if (adminToken) {
        await deletePollAdminByToken(adminToken);
      }

      if (originalPublicAppUrl === undefined) {
        delete process.env.PUBLIC_APP_URL;
      } else {
        process.env.PUBLIC_APP_URL = originalPublicAppUrl;
      }

      await pool.end();
    }
  }
);
