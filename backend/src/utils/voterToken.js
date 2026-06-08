import crypto from "node:crypto";

const MIN_TOKEN_LENGTH = 16;

export function normalizeVoterToken(voterToken) {
  if (typeof voterToken !== "string") {
    return null;
  }

  const normalizedToken = voterToken.trim();

  if (normalizedToken.length < MIN_TOKEN_LENGTH) {
    return null;
  }

  return normalizedToken;
}

export function hashVoterToken(voterToken) {
  const normalizedToken = normalizeVoterToken(voterToken);

  if (!normalizedToken) {
    return null;
  }

  return crypto.createHash("sha256").update(normalizedToken).digest("hex");
}
