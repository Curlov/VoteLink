import test from "node:test";
import assert from "node:assert/strict";

async function importFreshApp() {
  return import(`../src/app.js?test=${Date.now()}-${Math.random()}`);
}

async function loadDotenvOnce() {
  await import("../src/db/pool.js");
}

test("app startet in Produktion nicht mit offenem CORS", async () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalCorsOrigin = process.env.CORS_ORIGIN;

  try {
    await loadDotenvOnce();
    process.env.NODE_ENV = "production";
    delete process.env.CORS_ORIGIN;

    await assert.rejects(importFreshApp(), /CORS_ORIGIN muss/);
  } finally {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalCorsOrigin === undefined) {
      delete process.env.CORS_ORIGIN;
    } else {
      process.env.CORS_ORIGIN = originalCorsOrigin;
    }
  }
});

test("app startet in Produktion mit gesetztem CORS_ORIGIN", async () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalCorsOrigin = process.env.CORS_ORIGIN;

  try {
    await loadDotenvOnce();
    process.env.NODE_ENV = "production";
    process.env.CORS_ORIGIN = "https://example.com";

    const { app } = await importFreshApp();
    assert.equal(typeof app, "function");
  } finally {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalCorsOrigin === undefined) {
      delete process.env.CORS_ORIGIN;
    } else {
      process.env.CORS_ORIGIN = originalCorsOrigin;
    }
  }
});
