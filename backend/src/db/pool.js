import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

export function createPoolConfig(env = process.env) {
  const ssl =
    env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined;

  if (env.DATABASE_URL) {
    return {
      connectionString: env.DATABASE_URL,
      ssl,
    };
  }

  return {
    host: env.DB_HOST,
    port: env.DB_PORT ? Number(env.DB_PORT) : undefined,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    ssl,
  };
}

export const pool = new Pool(createPoolConfig());
