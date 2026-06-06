import express from "express";
import cors from "cors";
import { pollsRouter } from "./routes/polls.routes.js";

export const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    app: "votelink",
  });
});

app.use("/api/polls", pollsRouter);
