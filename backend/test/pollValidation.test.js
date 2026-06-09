import test from "node:test";
import assert from "node:assert/strict";
import {
  cleanAdminPollUpdateInput,
  cleanCreatePollInput,
  cleanDurationDays,
  getExpiresAt,
} from "../src/utils/pollValidation.js";

test("cleanCreatePollInput normalisiert gültige Eingaben", () => {
  const now = new Date("2026-06-08T12:00:00.000Z");
  const result = cleanCreatePollInput(
    {
      title: "  Teamessen  ",
      description: "  Freitag oder Montag?  ",
      creatorName: "  Anna  ",
      creatorEmail: "  ANNA@example.com  ",
      isAnonymous: false,
      allowMultipleVotes: true,
      durationDays: "7",
      options: ["  Freitag ", "", " Montag "],
    },
    now
  );

  assert.equal(result.success, true);
  assert.deepEqual(result.poll, {
    title: "Teamessen",
    description: "Freitag oder Montag?",
    creatorName: "Anna",
    creatorEmail: "anna@example.com",
    isAnonymous: false,
    allowMultipleVotes: true,
    expiresAt: new Date("2026-06-15T12:00:00.000Z"),
    options: ["Freitag", "Montag"],
  });
});

test("cleanCreatePollInput lehnt zu wenige Optionen ab", () => {
  const result = cleanCreatePollInput({
    title: "Roadmap",
    creatorName: "Anna",
    creatorEmail: "team@example.com",
    options: ["Nur eine Option", "   "],
  });

  assert.equal(result.success, false);
  assert.equal(
    result.error,
    "Eine Abstimmung braucht mindestens 2 gültige Optionen."
  );
});

test("cleanCreatePollInput verlangt einen Ersteller-Namen", () => {
  const result = cleanCreatePollInput({
    title: "Roadmap",
    creatorName: "   ",
    creatorEmail: "team@example.com",
    options: ["A", "B"],
  });

  assert.equal(result.success, false);
  assert.equal(result.error, "Bitte gib deinen Namen an.");
});

test("cleanCreatePollInput begrenzt kostenlose Abstimmungen auf 6 Optionen", () => {
  const result = cleanCreatePollInput({
    title: "Roadmap",
    creatorName: "Anna",
    creatorEmail: "team@example.com",
    options: ["A", "B", "C", "D", "E", "F", "G"],
  });

  assert.equal(result.success, false);
  assert.equal(
    result.error,
    "Kostenlose Abstimmungen können maximal 6 Optionen enthalten."
  );
});

test("cleanDurationDays erlaubt nur definierte Laufzeiten", () => {
  assert.deepEqual(cleanDurationDays(14), {
    success: true,
    durationDays: 14,
  });
  assert.deepEqual(cleanDurationDays(3), {
    success: false,
    error: "Bitte wähle eine gültige Laufzeit aus.",
  });
});

test("getExpiresAt addiert volle Tage auf den Referenzzeitpunkt", () => {
  assert.equal(
    getExpiresAt(1, new Date("2026-06-08T16:00:00.000Z")).toISOString(),
    "2026-06-09T16:00:00.000Z"
  );
});

test("cleanAdminPollUpdateInput normalisiert Titel und Beschreibung", () => {
  const result = cleanAdminPollUpdateInput({
    title: "  Neuer Titel  ",
    description: "  Neuer Text  ",
  });

  assert.deepEqual(result, {
    success: true,
    update: {
      title: "Neuer Titel",
      description: "Neuer Text",
    },
  });
});

test("cleanAdminPollUpdateInput verlangt mindestens eine Änderung", () => {
  const result = cleanAdminPollUpdateInput({});

  assert.equal(result.success, false);
  assert.equal(result.error, "Es wurden keine Änderungen übergeben.");
});

test("Validierung behandelt leere Request-Bodies kontrolliert", () => {
  assert.equal(cleanCreatePollInput(null).success, false);
  assert.deepEqual(cleanAdminPollUpdateInput(null), {
    success: false,
    error: "Es wurden keine Änderungen übergeben.",
  });
});
