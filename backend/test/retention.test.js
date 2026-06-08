import test from "node:test";
import assert from "node:assert/strict";
import { cleanRetentionDays } from "../src/utils/retention.js";

test("cleanRetentionDays nutzt 14 Tage als Default", () => {
  assert.equal(cleanRetentionDays(undefined), 14);
  assert.equal(cleanRetentionDays(""), 14);
});

test("cleanRetentionDays akzeptiert sinnvolle Ganzzahlen", () => {
  assert.equal(cleanRetentionDays("7"), 7);
  assert.equal(cleanRetentionDays(0), 0);
});

test("cleanRetentionDays lehnt unsichere Werte ab", () => {
  assert.equal(cleanRetentionDays(-1), 14);
  assert.equal(cleanRetentionDays(1.5), 14);
  assert.equal(cleanRetentionDays(500), 14);
});
