import test from "node:test";
import assert from "node:assert/strict";
import { buildPollCreatedEmail } from "../src/services/mail.service.js";

test("buildPollCreatedEmail trennt Teilnehmer-Link und Admin-Link klar", () => {
  const email = buildPollCreatedEmail({
    title: 'Team <Planung>\nSommer',
    publicUrl: "https://example.com/p/public123",
    adminUrl: "https://example.com/admin/secret456",
    activationUrl: "https://example.com/activate/activate789",
    expiresAt: new Date("2026-06-15T12:00:00.000Z"),
  });

  assert.equal(
    email.subject,
    'VoteLink: Abstimmung "Team <Planung> Sommer" aktivieren'
  );
  assert.match(email.text, /Aktivierung erforderlich/);
  assert.match(email.text, /https:\/\/example\.com\/activate\/activate789/);
  assert.match(email.text, /Teilnehmer-Link/);
  assert.match(email.text, /Nach der Aktivierung/);
  assert.match(email.text, /Admin-Link/);
  assert.match(email.text, /Nur für dich/);
  assert.match(email.text, /Gib den Admin-Link nicht weiter/);
  assert.match(email.text, /https:\/\/example\.com\/p\/public123/);
  assert.match(email.text, /https:\/\/example\.com\/admin\/secret456/);

  assert.match(email.html, /Team &lt;Planung&gt;/);
  assert.match(email.html, /Aktivierung erforderlich/);
  assert.match(email.html, /Teilnehmer-Link/);
  assert.match(email.html, /Admin-Link/);
  assert.match(email.html, /Nicht weitergeben/);
});
