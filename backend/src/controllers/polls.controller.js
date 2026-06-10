import { nanoid } from "nanoid";
import {
  createPoll,
  activatePollByToken,
  addIgnoredCreatorEmail,
  createPollReport,
  deletePollOperatorByPublicId,
  getPollByPublicId,
  getParticipationByPublicId,
  createVote,
  getPollResultsByPublicId,
  getPollAdminByToken,
  listIgnoredCreatorEmails,
  listOperatorPolls,
  removeIgnoredCreatorEmail,
  updateOperatorPollStatus,
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
import { getRequestIp } from "../utils/requestIp.js";
import { consumeRateLimit, getRateLimits } from "../utils/rateLimit.js";

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
    const requestIp = getRequestIp(req);
    const rateLimits = getRateLimits();
    const pollRateLimit = await consumeRateLimit({
      action: "create_poll_ip",
      key: requestIp,
      limit: rateLimits.pollsPerIpPerHour,
      windowSeconds: 60 * 60,
    });

    if (!pollRateLimit.allowed) {
      return res.status(429).json({
        error: `Es können maximal ${rateLimits.pollsPerIpPerHour} Umfragen pro Stunde erstellt werden.`,
      });
    }

    const emailRateLimit = await consumeRateLimit({
      action: "poll_email_address",
      key: cleanedPoll.creatorEmail,
      limit: rateLimits.emailsPerAddressPerHour,
      windowSeconds: 60 * 60,
    });

    if (!emailRateLimit.allowed) {
      return res.status(429).json({
        error: `Für diese E-Mail-Adresse sind maximal ${rateLimits.emailsPerAddressPerHour} E-Mail-Versuche pro Stunde möglich.`,
      });
    }

    const createResult = await createPoll({
      publicId: nanoid(10),
      adminToken: nanoid(32),
      activationToken: nanoid(32),
      creatorIp: requestIp,
      ...cleanedPoll,
    });

    if (!createResult.success) {
      return res.status(createResult.status).json({
        error: createResult.error,
      });
    }

    const poll = createResult.poll;
    const publicBaseUrl = getPublicBaseUrl(req);
    const publicUrl = publicBaseUrl
      ? `${publicBaseUrl}/p/${poll.public_id}`
      : `/p/${poll.public_id}`;
    const adminUrl = publicBaseUrl
      ? `${publicBaseUrl}/admin/${poll.admin_token}`
      : `/admin/${poll.admin_token}`;
    const activationUrl = publicBaseUrl
      ? `${publicBaseUrl}/activate/${poll.activation_token}`
      : `/activate/${poll.activation_token}`;
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
        activationUrl,
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

    const includeLinksInResponse = !emailDelivery.sent;

    res.status(201).json({
      message: "Abstimmung wurde erstellt.",
      poll: {
        publicId: poll.public_id,
        adminToken: includeLinksInResponse ? poll.admin_token : null,
        status: poll.status,
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
        publicUrl:
          includeLinksInResponse && poll.status === "active"
            ? `/p/${poll.public_id}`
            : null,
        adminUrl: includeLinksInResponse ? `/admin/${poll.admin_token}` : null,
        activationUrl:
          includeLinksInResponse && poll.activation_token
            ? `/activate/${poll.activation_token}`
            : null,
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

export async function activatePollController(req, res) {
  try {
    const { activationToken } = req.params;
    const poll = await activatePollByToken(activationToken);

    if (!poll) {
      return res.status(404).json({
        error: "Aktivierungslink ist ungültig oder wurde bereits verwendet.",
      });
    }

    res.json({
      message: "Abstimmung wurde aktiviert.",
      poll,
      links: {
        publicUrl: `/p/${poll.publicId}`,
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Die Abstimmung konnte nicht aktiviert werden.",
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

function cleanReportInput(body = {}) {
  const input = body && typeof body === "object" ? body : {};
  const reporterEmail = String(input.reporterEmail || "").trim().toLowerCase();
  const reason = String(input.reason || "").trim();
  const details = String(input.details || "").trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reporterEmail)) {
    return {
      success: false,
      error: "Bitte gib eine gültige E-Mail-Adresse an.",
    };
  }

  if (reason.length < 5) {
    return {
      success: false,
      error: "Bitte gib einen Grund für die Meldung an.",
    };
  }

  if (reason.length > 160 || details.length > 2000) {
    return {
      success: false,
      error: "Die Meldung ist zu lang.",
    };
  }

  return {
    success: true,
    report: {
      reporterEmail,
      reason,
      details,
    },
  };
}

export async function reportPollController(req, res) {
  try {
    const { publicId } = req.params;
    const cleanedInput = cleanReportInput(req.body);

    if (!cleanedInput.success) {
      return res.status(400).json({
        error: cleanedInput.error,
      });
    }

    const report = await createPollReport({
      publicId,
      reporterIp: getRequestIp(req),
      ...cleanedInput.report,
    });

    if (!report) {
      return res.status(404).json({
        error: "Abstimmung wurde nicht gefunden.",
      });
    }

    if (!report.success) {
      return res.status(report.status).json({
        error: report.error,
      });
    }

    res.status(201).json({
      message: "Danke, die Abstimmung wurde gemeldet.",
      report: report.report,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Die Meldung konnte nicht gespeichert werden.",
    });
  }
}

function isOperatorAuthorized(req) {
  const configuredToken = process.env.OPERATOR_ADMIN_TOKEN;

  if (!configuredToken) {
    return false;
  }

  const authHeader = req.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : "";

  return token && token === configuredToken;
}

export async function listOperatorPollsController(req, res) {
  try {
    if (!isOperatorAuthorized(req)) {
      return res.status(401).json({
        error: "Nicht autorisiert.",
      });
    }

    const [polls, ignoredCreatorEmails] = await Promise.all([
      listOperatorPolls(),
      listIgnoredCreatorEmails(),
    ]);

    res.json({
      polls,
      ignoredCreatorEmails,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Die Betreiberübersicht konnte nicht geladen werden.",
    });
  }
}

function cleanIgnoredEmailInput(body = {}) {
  const input = body && typeof body === "object" ? body : {};
  const email = String(input.email || "").trim().toLowerCase();
  const reason = String(input.reason || "").trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return {
      success: false,
      error: "Bitte gib eine gültige E-Mail-Adresse an.",
    };
  }

  if (reason.length > 1000) {
    return {
      success: false,
      error: "Der Grund ist zu lang.",
    };
  }

  return {
    success: true,
    entry: {
      email,
      reason,
    },
  };
}

export async function addIgnoredCreatorEmailController(req, res) {
  try {
    if (!isOperatorAuthorized(req)) {
      return res.status(401).json({
        error: "Nicht autorisiert.",
      });
    }

    const cleanedInput = cleanIgnoredEmailInput(req.body);

    if (!cleanedInput.success) {
      return res.status(400).json({
        error: cleanedInput.error,
      });
    }

    const entry = await addIgnoredCreatorEmail(cleanedInput.entry);

    res.status(201).json({
      message: "E-Mail-Adresse wurde zur Ignorierliste hinzugefügt.",
      entry,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Die E-Mail-Adresse konnte nicht hinzugefügt werden.",
    });
  }
}

export async function removeIgnoredCreatorEmailController(req, res) {
  try {
    if (!isOperatorAuthorized(req)) {
      return res.status(401).json({
        error: "Nicht autorisiert.",
      });
    }

    const email = String(req.params.email || "").trim().toLowerCase();
    const removed = await removeIgnoredCreatorEmail(email);

    if (!removed) {
      return res.status(404).json({
        error: "E-Mail-Adresse wurde nicht gefunden.",
      });
    }

    res.status(204).send();
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Die E-Mail-Adresse konnte nicht entfernt werden.",
    });
  }
}

export async function updateOperatorPollStatusController(req, res) {
  try {
    if (!isOperatorAuthorized(req)) {
      return res.status(401).json({
        error: "Nicht autorisiert.",
      });
    }

    const { publicId } = req.params;
    const status = String(req.body?.status || "").trim();
    const reason = String(req.body?.reason || "").trim();
    const updated = await updateOperatorPollStatus({
      publicId,
      status,
      reason,
    });

    if (!updated) {
      return res.status(404).json({
        error: "Abstimmung wurde nicht gefunden oder Status ist ungültig.",
      });
    }

    res.json({
      message: "Status wurde aktualisiert.",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Der Status konnte nicht aktualisiert werden.",
    });
  }
}

export async function deleteOperatorPollController(req, res) {
  try {
    if (!isOperatorAuthorized(req)) {
      return res.status(401).json({
        error: "Nicht autorisiert.",
      });
    }

    const { publicId } = req.params;
    const deleted = await deletePollOperatorByPublicId(publicId);

    if (!deleted) {
      return res.status(404).json({
        error: "Abstimmung wurde nicht gefunden.",
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

export async function voteController(req, res) {
  try {
    const { publicId } = req.params;
    const { optionId, optionIds, voterName = "", voterToken } = req.body || {};
    const rateLimits = getRateLimits();
    const voteRateLimit = await consumeRateLimit({
      action: "vote_ip",
      key: getRequestIp(req),
      limit: rateLimits.votesPerIpPerMinute,
      windowSeconds: 60,
    });

    if (!voteRateLimit.allowed) {
      return res.status(429).json({
        error: `Es sind maximal ${rateLimits.votesPerIpPerMinute} Stimmen pro Minute möglich.`,
      });
    }

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
