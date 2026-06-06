import { nanoid } from "nanoid";
import {
  createPoll,
  getPollByPublicId,
  createVote,
  getPollResultsByPublicId,
} from "../models/poll.model.js";

export async function createPollController(req, res) {
  try {
    const {
      title,
      description = "",
      isAnonymous = true,
      allowMultipleVotes = false,
      options,
    } = req.body;

    if (!title || title.trim().length < 3) {
      return res.status(400).json({
        error: "Der Titel muss mindestens 3 Zeichen lang sein.",
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

    const poll = await createPoll({
      publicId: nanoid(10),
      adminToken: nanoid(32),
      title: title.trim(),
      description: description.trim(),
      isAnonymous: Boolean(isAnonymous),
      allowMultipleVotes: Boolean(allowMultipleVotes),
      options: cleanedOptions,
    });

    res.status(201).json({
      message: "Abstimmung wurde erstellt.",
      poll: {
        publicId: poll.public_id,
        adminToken: poll.admin_token,
        title: poll.title,
        description: poll.description,
        isAnonymous: poll.is_anonymous,
        allowMultipleVotes: poll.allow_multiple_votes,
        createdAt: poll.created_at,
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
    const { optionId, voterName = "" } = req.body;

    if (!optionId) {
      return res.status(400).json({
        error: "Es wurde keine Option ausgewählt.",
      });
    }

    const result = await createVote({
      publicId,
      optionId,
      voterName,
    });

    if (!result.success) {
      return res.status(result.status).json({
        error: result.error,
      });
    }

    res.status(201).json({
      message: "Stimme wurde gespeichert.",
      vote: {
        id: result.vote.id,
        createdAt: result.vote.created_at,
      },
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
