import express from "express";
import cors from "cors";
import { pollsRouter } from "./routes/polls.routes.js";

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

app.use("/api/polls", pollsRouter);
