import express from "express";
import {
  createPollController,
  getPollController,
  getParticipationController,
  voteController,
  getResultsController,
  getAdminPollController,
  updateAdminPollController,
  closeAdminPollController,
  extendAdminPollController,
  deleteAdminPollController,
} from "../controllers/polls.controller.js";

export const pollsRouter = express.Router();

pollsRouter.post("/", createPollController);
pollsRouter.get("/admin/:adminToken", getAdminPollController);
pollsRouter.patch("/admin/:adminToken", updateAdminPollController);
pollsRouter.post("/admin/:adminToken/close", closeAdminPollController);
pollsRouter.post("/admin/:adminToken/extend", extendAdminPollController);
pollsRouter.delete("/admin/:adminToken", deleteAdminPollController);
pollsRouter.get("/:publicId", getPollController);
pollsRouter.post("/:publicId/participation", getParticipationController);
pollsRouter.post("/:publicId/vote", voteController);
pollsRouter.get("/:publicId/results", getResultsController);
