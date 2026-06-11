import test from "node:test";
import assert from "node:assert/strict";
import { createPoolConfig } from "../src/db/pool.js";

test("createPoolConfig nutzt DATABASE_URL wenn vorhanden", () => {
  const config = createPoolConfig({
    DATABASE_URL: "postgres://user:pass@example.com:5432/votelink",
  });

  assert.deepEqual(config, {
    connectionString: "postgres://user:pass@example.com:5432/votelink",
    ssl: undefined,
  });
});

test("createPoolConfig kann SSL fuer gehostete Datenbanken aktivieren", () => {
  const config = createPoolConfig({
    DATABASE_URL: "postgres://user:pass@example.com:5432/votelink",
    DB_SSL: "true",
  });

  assert.deepEqual(config, {
    connectionString: "postgres://user:pass@example.com:5432/votelink",
    ssl: { rejectUnauthorized: false },
  });
});

test("createPoolConfig unterstuetzt einzelne DB Variablen", () => {
  const config = createPoolConfig({
    DB_HOST: "localhost",
    DB_PORT: "5432",
    DB_USER: "votelink",
    DB_PASSWORD: "secret",
    DB_NAME: "votelink",
  });

  assert.deepEqual(config, {
    host: "localhost",
    port: 5432,
    user: "votelink",
    password: "secret",
    database: "votelink",
    ssl: undefined,
  });
});
