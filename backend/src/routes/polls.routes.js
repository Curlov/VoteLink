import express from "express";
import {
  createPollController,
  getPollController,
  voteController,
  getResultsController,
  getAdminPollController,
} from "../controllers/polls.controller.js";

export const pollsRouter = express.Router();

pollsRouter.post("/", createPollController);
pollsRouter.get("/admin/:adminToken", getAdminPollController);
pollsRouter.get("/:publicId", getPollController);
pollsRouter.post("/:publicId/vote", voteController);
pollsRouter.get("/:publicId/results", getResultsController);
