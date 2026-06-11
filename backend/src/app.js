import express from "express";
import cors from "cors";
import { pollsRouter } from "./routes/polls.routes.js";
import { pool } from "./db/pool.js";

export const app = express();

function getCorsOptions() {
  const allowedOriginInput = process.env.CORS_ORIGIN;

  if (!allowedOriginInput || allowedOriginInput.trim() === "*") {
    if (process.env.NODE_ENV === "production") {
      throw new Error("CORS_ORIGIN muss in Produktion gesetzt sein.");
    }

    return {};
  }

  const allowedOrigins = allowedOriginInput
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return {
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Nicht erlaubter CORS-Origin."));
    },
  };
}

app.disable("x-powered-by");
if (process.env.TRUST_PROXY === "1") {
  app.set("trust proxy", 1);
}
app.use(cors(getCorsOptions()));
app.use(express.json({ limit: "100kb" }));

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    app: "votelink",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/health/db", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT NOW() AS server_time, current_database() AS database"
    );

    res.json({
      status: "ok",
      database: result.rows[0].database,
      serverTime: result.rows[0].server_time,
    });
  } catch (error) {
    res.status(503).json({
      status: "error",
      error: "Datenbank ist nicht erreichbar.",
    });
  }
});

app.use("/api/polls", pollsRouter);
