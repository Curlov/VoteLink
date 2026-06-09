import { FREE_POLL_OPTION_LIMIT } from "./pollOptions.js";

export const ALLOWED_DURATION_DAYS = [1, 7, 14, 28];

export function getExpiresAt(durationDays, now = new Date()) {
  return new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
}

export function cleanDurationDays(durationDays) {
  const cleanedDurationDays = Number(durationDays);

  if (!ALLOWED_DURATION_DAYS.includes(cleanedDurationDays)) {
    return {
      success: false,
      error: "Bitte wähle eine gültige Laufzeit aus.",
    };
  }

  return {
    success: true,
    durationDays: cleanedDurationDays,
  };
}

export function cleanCreatePollInput(body = {}, now = new Date()) {
  const input = body && typeof body === "object" ? body : {};
  const {
    title,
    description = "",
    creatorName = "",
    creatorEmail = "",
    isAnonymous = true,
    allowMultipleVotes = false,
    durationDays = 7,
    options,
  } = input;

  if (!title || title.trim().length < 3) {
    return {
      success: false,
      error: "Der Titel muss mindestens 3 Zeichen lang sein.",
    };
  }

  const cleanedCreatorName = String(creatorName).trim();
  const cleanedCreatorEmail = String(creatorEmail).trim().toLowerCase();

  if (cleanedCreatorName.length < 1) {
    return {
      success: false,
      error: "Bitte gib deinen Namen an.",
    };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanedCreatorEmail)) {
    return {
      success: false,
      error: "Bitte gib eine gültige E-Mail-Adresse an.",
    };
  }

  if (!Array.isArray(options) || options.length < 2) {
    return {
      success: false,
      error: "Eine Abstimmung braucht mindestens 2 Optionen.",
    };
  }

  const cleanedOptions = options
    .map((option) => String(option).trim())
    .filter((option) => option.length > 0);

  if (cleanedOptions.length < 2) {
    return {
      success: false,
      error: "Eine Abstimmung braucht mindestens 2 gültige Optionen.",
    };
  }

  if (cleanedOptions.length > FREE_POLL_OPTION_LIMIT) {
    return {
      success: false,
      error: `Kostenlose Abstimmungen können maximal ${FREE_POLL_OPTION_LIMIT} Optionen enthalten.`,
    };
  }

  const cleanedDuration = cleanDurationDays(durationDays);

  if (!cleanedDuration.success) {
    return cleanedDuration;
  }

  return {
    success: true,
    poll: {
      title: title.trim(),
      description: String(description).trim(),
      creatorName: cleanedCreatorName,
      creatorEmail: cleanedCreatorEmail,
      isAnonymous: Boolean(isAnonymous),
      allowMultipleVotes: Boolean(allowMultipleVotes),
      expiresAt: getExpiresAt(cleanedDuration.durationDays, now),
      options: cleanedOptions,
    },
  };
}

export function cleanAdminPollUpdateInput(body = {}) {
  const input = body && typeof body === "object" ? body : {};
  const update = {};

  if (Object.hasOwn(input, "title")) {
    const title = String(input.title).trim();

    if (title.length < 3) {
      return {
        success: false,
        error: "Der Titel muss mindestens 3 Zeichen lang sein.",
      };
    }

    update.title = title;
  }

  if (Object.hasOwn(input, "description")) {
    update.description = String(input.description).trim();
  }

  if (!Object.hasOwn(update, "title") && !Object.hasOwn(update, "description")) {
    return {
      success: false,
      error: "Es wurden keine Änderungen übergeben.",
    };
  }

  return {
    success: true,
    update,
  };
}
