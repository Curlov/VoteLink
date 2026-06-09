import { nanoid } from "nanoid";
import {
  createPoll,
  getPollByPublicId,
  getParticipationByPublicId,
  createVote,
  getPollResultsByPublicId,
  getPollAdminByToken,
  updatePollAdminByToken,
  closePollAdminByToken,
  extendPollAdminByToken,
  deletePollAdminByToken,
} from "../models/poll.model.js";
import {
  cleanAdminPollUpdateInput,
  cleanCreatePollInput,
  cleanDurationDays,
} from "../utils/pollValidation.js";
import { sendPollCreatedEmail } from "../services/mail.service.js";

function getPublicBaseUrl(req) {
  const configuredBaseUrl = process.env.PUBLIC_APP_URL || req.get("origin");

  return String(configuredBaseUrl || "").replace(/\/$/, "");
}

export async function createPollController(req, res) {
  try {
    const cleanedInput = cleanCreatePollInput(req.body);

    if (!cleanedInput.success) {
      return res.status(400).json({
        error: cleanedInput.error,
      });
    }

    const cleanedPoll = cleanedInput.poll;

    const poll = await createPoll({
      publicId: nanoid(10),
      adminToken: nanoid(32),
      ...cleanedPoll,
    });
    const publicBaseUrl = getPublicBaseUrl(req);
    const publicUrl = publicBaseUrl
      ? `${publicBaseUrl}/p/${poll.public_id}`
      : `/p/${poll.public_id}`;
    const adminUrl = publicBaseUrl
      ? `${publicBaseUrl}/admin/${poll.admin_token}`
      : `/admin/${poll.admin_token}`;
    let emailDelivery = {
      attempted: false,
      sent: false,
      skipped: true,
    };

    try {
      const emailResult = await sendPollCreatedEmail({
        to: poll.creator_email,
        title: poll.title,
        publicUrl,
        adminUrl,
        expiresAt: poll.expires_at,
      });

      emailDelivery = {
        attempted: !emailResult.skipped,
        sent: !emailResult.skipped,
        skipped: emailResult.skipped,
      };
    } catch (emailError) {
      console.error("E-Mail mit Abstimmungslinks konnte nicht gesendet werden:");
      console.error(emailError.message);
      emailDelivery = {
        attempted: true,
        sent: false,
        skipped: false,
      };
    }

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
      emailDelivery,
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
    const { optionId, optionIds, voterName = "", voterToken } = req.body || {};

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
      voterToken,
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

export async function getParticipationController(req, res) {
  try {
    const { publicId } = req.params;
    const { voterToken } = req.body || {};

    const result = await getParticipationByPublicId({
      publicId,
      voterToken,
    });

    if (!result.success) {
      return res.status(result.status).json({
        error: result.error,
      });
    }

    res.json({
      hasVoted: result.hasVoted,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Der Teilnahmestatus konnte nicht geprüft werden.",
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

export async function updateAdminPollController(req, res) {
  try {
    const { adminToken } = req.params;
    const cleanedInput = cleanAdminPollUpdateInput(req.body);

    if (!cleanedInput.success) {
      return res.status(400).json({
        error: cleanedInput.error,
      });
    }

    const poll = await updatePollAdminByToken(adminToken, cleanedInput.update);

    if (!poll) {
      return res.status(404).json({
        error: "Admin-Link wurde nicht gefunden.",
      });
    }

    res.json({
      message: "Abstimmung wurde aktualisiert.",
      poll,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Die Abstimmung konnte nicht aktualisiert werden.",
    });
  }
}

export async function closeAdminPollController(req, res) {
  try {
    const { adminToken } = req.params;
    const poll = await closePollAdminByToken(adminToken);

    if (!poll) {
      return res.status(404).json({
        error: "Admin-Link wurde nicht gefunden.",
      });
    }

    res.json({
      message: "Abstimmung wurde geschlossen.",
      poll,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Die Abstimmung konnte nicht geschlossen werden.",
    });
  }
}

export async function extendAdminPollController(req, res) {
  try {
    const { adminToken } = req.params;
    const cleanedDuration = cleanDurationDays(req.body.durationDays);

    if (!cleanedDuration.success) {
      return res.status(400).json({
        error: cleanedDuration.error,
      });
    }

    const poll = await extendPollAdminByToken(
      adminToken,
      cleanedDuration.durationDays
    );

    if (!poll) {
      return res.status(404).json({
        error: "Admin-Link wurde nicht gefunden.",
      });
    }

    res.json({
      message: "Laufzeit wurde verlängert.",
      poll,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Die Laufzeit konnte nicht verlängert werden.",
    });
  }
}

export async function deleteAdminPollController(req, res) {
  try {
    const { adminToken } = req.params;
    const isDeleted = await deletePollAdminByToken(adminToken);

    if (!isDeleted) {
      return res.status(404).json({
        error: "Admin-Link wurde nicht gefunden.",
      });
    }

    res.status(204).send();
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Die Abstimmung konnte nicht gelöscht werden.",
    });
  }
}
