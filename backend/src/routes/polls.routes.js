import express from "express";
import {
  createPollController,
  activatePollController,
  getPollController,
  getParticipationController,
  voteController,
  getResultsController,
  reportPollController,
  listOperatorPollsController,
  addIgnoredCreatorEmailController,
  removeIgnoredCreatorEmailController,
  updateOperatorPollStatusController,
  deleteOperatorPollController,
  getAdminPollController,
  updateAdminPollController,
  closeAdminPollController,
  extendAdminPollController,
  deleteAdminPollController,
} from "../controllers/polls.controller.js";

export const pollsRouter = express.Router();

pollsRouter.post("/", createPollController);
pollsRouter.post("/activate/:activationToken", activatePollController);
pollsRouter.get("/operator/admin", listOperatorPollsController);
pollsRouter.post("/operator/admin/ignored-emails", addIgnoredCreatorEmailController);
pollsRouter.delete("/operator/admin/ignored-emails/:email", removeIgnoredCreatorEmailController);
pollsRouter.patch("/operator/admin/:publicId/status", updateOperatorPollStatusController);
pollsRouter.delete("/operator/admin/:publicId", deleteOperatorPollController);
pollsRouter.get("/admin/:adminToken", getAdminPollController);
pollsRouter.patch("/admin/:adminToken", updateAdminPollController);
pollsRouter.post("/admin/:adminToken/close", closeAdminPollController);
pollsRouter.post("/admin/:adminToken/extend", extendAdminPollController);
pollsRouter.delete("/admin/:adminToken", deleteAdminPollController);
pollsRouter.get("/:publicId", getPollController);
pollsRouter.post("/:publicId/participation", getParticipationController);
pollsRouter.post("/:publicId/report", reportPollController);
pollsRouter.post("/:publicId/vote", voteController);
pollsRouter.get("/:publicId/results", getResultsController);
