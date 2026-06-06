import { nanoid } from "nanoid";
import {
  createPoll,
  getPollByPublicId,
  createVote,
  getPollResultsByPublicId,
  getPollAdminByToken,
} from "../models/poll.model.js";

export async function createPollController(req, res) {
  try {
    const {
      title,
      description = "",
      creatorName = "",
      creatorEmail = "",
      isAnonymous = true,
      allowMultipleVotes = false,
      durationDays = 7,
      options,
    } = req.body;

    if (!title || title.trim().length < 3) {
      return res.status(400).json({
        error: "Der Titel muss mindestens 3 Zeichen lang sein.",
      });
    }

    const cleanedCreatorName = String(creatorName).trim();
    const cleanedCreatorEmail = String(creatorEmail).trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanedCreatorEmail)) {
      return res.status(400).json({
        error: "Bitte gib eine gültige E-Mail-Adresse an.",
      });
    }

    if (!Array.isArray(options) || options.length < 2) {
      return res.status(400).json({
        error: "Eine Abstimmung braucht mindestens 2 Optionen.",
      });
    }

    const cleanedOptions = options
      .map((option) => String(option).trim())
      .filter((option) => option.length > 0);

    if (cleanedOptions.length < 2) {
      return res.status(400).json({
        error: "Eine Abstimmung braucht mindestens 2 gültige Optionen.",
      });
    }

    const allowedDurationDays = [1, 7, 14, 28];
    const cleanedDurationDays = Number(durationDays);

    if (!allowedDurationDays.includes(cleanedDurationDays)) {
      return res.status(400).json({
        error: "Bitte wähle eine gültige Laufzeit aus.",
      });
    }

    const expiresAt = new Date(
      Date.now() + cleanedDurationDays * 24 * 60 * 60 * 1000
    );

    const poll = await createPoll({
      publicId: nanoid(10),
      adminToken: nanoid(32),
      title: title.trim(),
      description: description.trim(),
      creatorName: cleanedCreatorName,
      creatorEmail: cleanedCreatorEmail,
      isAnonymous: Boolean(isAnonymous),
      allowMultipleVotes: Boolean(allowMultipleVotes),
      expiresAt,
      options: cleanedOptions,
    });

    res.status(201).json({
      message: "Abstimmung wurde erstellt.",
      poll: {
        publicId: poll.public_id,
        adminToken: poll.admin_token,
        title: poll.title,
        description: poll.description,
        creatorName: poll.creator_name,
        creatorEmail: poll.creator_email,
        isAnonymous: poll.is_anonymous,
        allowMultipleVotes: poll.allow_multiple_votes,
        createdAt: poll.created_at,
        expiresAt: poll.expires_at,
      },
      links: {
        publicUrl: `/p/${poll.public_id}`,
        adminUrl: `/admin/${poll.admin_token}`,
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Die Abstimmung konnte nicht erstellt werden.",
    });
  }
}

export async function getPollController(req, res) {
  try {
    const { publicId } = req.params;

    const poll = await getPollByPublicId(publicId);

    if (!poll) {
      return res.status(404).json({
        error: "Abstimmung wurde nicht gefunden.",
      });
    }

    res.json({
      poll: {
        publicId: poll.publicId,
        title: poll.title,
        description: poll.description,
        creatorName: poll.creatorName,
        creatorEmail: poll.creatorEmail,
        isAnonymous: poll.isAnonymous,
        allowMultipleVotes: poll.allowMultipleVotes,
        createdAt: poll.createdAt,
        expiresAt: poll.expiresAt,
        options: poll.options,
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Die Abstimmung konnte nicht geladen werden.",
    });
  }
}

export async function voteController(req, res) {
  try {
    const { publicId } = req.params;
    const { optionId, optionIds, voterName = "" } = req.body;

    const selectedOptionIds = Array.isArray(optionIds) ? optionIds : [optionId];
    const cleanedOptionIds = [
      ...new Set(
        selectedOptionIds
          .map((selectedOptionId) => Number(selectedOptionId))
          .filter(
            (selectedOptionId) =>
              Number.isInteger(selectedOptionId) && selectedOptionId > 0
          )
      ),
    ];

    if (cleanedOptionIds.length === 0) {
      return res.status(400).json({
        error: "Es wurde keine gültige Option ausgewählt.",
      });
    }

    const result = await createVote({
      publicId,
      optionIds: cleanedOptionIds,
      voterName,
    });

    if (!result.success) {
      return res.status(result.status).json({
        error: result.error,
      });
    }

    res.status(201).json({
      message:
        result.votes.length === 1
          ? "Stimme wurde gespeichert."
          : "Stimmen wurden gespeichert.",
      vote: {
        id: result.votes[0].id,
        createdAt: result.votes[0].created_at,
      },
      votes: result.votes.map((vote) => ({
        id: vote.id,
        createdAt: vote.created_at,
      })),
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Die Stimme konnte nicht gespeichert werden.",
    });
  }
}

export async function getResultsController(req, res) {
  try {
    const { publicId } = req.params;

    const results = await getPollResultsByPublicId(publicId);

    if (!results) {
      return res.status(404).json({
        error: "Abstimmung wurde nicht gefunden.",
      });
    }

    res.json({
      results,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Die Ergebnisse konnten nicht geladen werden.",
    });
  }
}

export async function getAdminPollController(req, res) {
  try {
    const { adminToken } = req.params;

    const poll = await getPollAdminByToken(adminToken);

    if (!poll) {
      return res.status(404).json({
        error: "Admin-Link wurde nicht gefunden.",
      });
    }

    res.json({
      poll,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Der Adminbereich konnte nicht geladen werden.",
    });
  }
}
