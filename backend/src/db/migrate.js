import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./pool.js";

const migrationsDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "migrations"
);

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename text PRIMARY KEY,
      checksum text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function getMigrationFiles() {
  const entries = await fs.readdir(migrationsDir);

  return entries
    .filter((entry) => entry.endsWith(".sql"))
    .sort((first, second) => first.localeCompare(second));
}

function checksum(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

export async function runMigrations() {
  const client = await pool.connect();

  try {
    await ensureMigrationsTable(client);

    const appliedResult = await client.query(
      "SELECT filename, checksum FROM schema_migrations"
    );
    const appliedMigrations = new Map(
      appliedResult.rows.map((row) => [row.filename, row.checksum])
    );

    const files = await getMigrationFiles();
    const appliedNow = [];

    for (const filename of files) {
      const filePath = path.join(migrationsDir, filename);
      const sql = await fs.readFile(filePath, "utf8");
      const fileChecksum = checksum(sql);
      const appliedChecksum = appliedMigrations.get(filename);

      if (appliedChecksum) {
        if (appliedChecksum !== fileChecksum) {
          throw new Error(
            `Migration ${filename} wurde seit der Anwendung verändert.`
          );
        }

        continue;
      }

      await client.query("BEGIN");

      try {
        await client.query(sql);
        await client.query(
          `
          INSERT INTO schema_migrations (filename, checksum)
          VALUES ($1, $2)
          `,
          [filename, fileChecksum]
        );
        await client.query("COMMIT");
        appliedNow.push(filename);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }

    return appliedNow;
  } finally {
    client.release();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const applied = await runMigrations();

    if (applied.length === 0) {
      console.log("Keine neuen Migrationen.");
    } else {
      console.log(`Angewendete Migrationen: ${applied.join(", ")}`);
    }
  } catch (error) {
    console.error("Migrationen fehlgeschlagen:");
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
