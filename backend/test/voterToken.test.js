import test from "node:test";
import assert from "node:assert/strict";
import { hashVoterToken, normalizeVoterToken } from "../src/utils/voterToken.js";

test("normalizeVoterToken akzeptiert ausreichend lange Tokens", () => {
  assert.equal(
    normalizeVoterToken("  1234567890abcdef  "),
    "1234567890abcdef"
  );
});

test("normalizeVoterToken lehnt fehlende oder kurze Tokens ab", () => {
  assert.equal(normalizeVoterToken(null), null);
  assert.equal(normalizeVoterToken("short"), null);
});

test("hashVoterToken speichert nicht den Klartext", () => {
  const token = "1234567890abcdef";
  const hash = hashVoterToken(token);

  assert.notEqual(hash, token);
  assert.equal(hash.length, 64);
  assert.equal(hashVoterToken(` ${token} `), hash);
});
