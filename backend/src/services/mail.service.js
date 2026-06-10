import nodemailer from "nodemailer";

function isMailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.MAIL_FROM);
}

function getTransporter() {
  const port = Number(process.env.SMTP_PORT || 587);

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 8000,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASSWORD
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
          }
        : undefined,
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatDateTime(value) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function normalizeHeaderText(value) {
  return String(value).replace(/[\r\n]+/g, " ").trim();
}

export function buildPollCreatedEmail({
  title,
  publicUrl,
  adminUrl,
  activationUrl,
  expiresAt,
}) {
  const normalizedTitle = normalizeHeaderText(title);
  const safeTitle = escapeHtml(normalizedTitle);
  const safePublicUrl = escapeHtml(publicUrl);
  const safeAdminUrl = escapeHtml(adminUrl);
  const safeActivationUrl = escapeHtml(activationUrl);
  const formattedExpiresAt = formatDateTime(expiresAt);
  const safeFormattedExpiresAt = escapeHtml(formattedExpiresAt);

  return {
    subject: `VoteLink: Abstimmung "${normalizedTitle}" aktivieren`,
    text: [
      `Deine Abstimmung "${normalizedTitle}" wurde erstellt.`,
      ...(formattedExpiresAt ? [`Laufzeit bis: ${formattedExpiresAt}`] : []),
      "",
      "Aktivierung erforderlich",
      "Bitte aktiviere die Abstimmung über diesen Link:",
      activationUrl,
      "",
      "Teilnehmer-Link",
      "Nach der Aktivierung kannst du diesen Link an Teilnehmer weitergeben:",
      publicUrl,
      "",
      "Admin-Link",
      "Nur für dich als Ersteller bestimmt:",
      adminUrl,
      "",
      "Wichtig: Gib den Admin-Link nicht weiter. Mit ihm kann die Abstimmung verwaltet, geschlossen oder dauerhaft gelöscht werden.",
      "",
      "Hinweis: Die Abstimmung ist erst nach Aktivierung über den E-Mail-Link öffentlich erreichbar.",
    ].join("\n"),
    html: `
      <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #222; line-height: 1.5;">
        <h1 style="font-size: 22px; margin: 0 0 12px;">Abstimmung aktivieren</h1>
        <p style="margin: 0 0 18px;">
          <strong>${safeTitle}</strong> wurde erstellt.${
            safeFormattedExpiresAt
              ? ` Laufzeit bis <strong>${safeFormattedExpiresAt}</strong>.`
              : ""
          }
        </p>

        <div style="padding: 16px; border: 1px solid #bbf7d0; border-radius: 8px; margin-bottom: 14px; background: #f0fdf4;">
          <p style="margin: 0 0 6px; font-weight: 700; color: #166534;">Aktivierung erforderlich</p>
          <p style="margin: 0 0 10px; color: #166534;">Bitte bestätige deine E-Mail-Adresse, bevor die Abstimmung öffentlich erreichbar ist.</p>
          <a href="${safeActivationUrl}" style="color: #166534; word-break: break-word;">${safeActivationUrl}</a>
        </div>

        <div style="padding: 16px; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 14px; background: #f7f7f7;">
          <p style="margin: 0 0 6px; font-weight: 700;">Teilnehmer-Link</p>
          <p style="margin: 0 0 10px; color: #555;">Nach der Aktivierung kannst du diesen Link an Teilnehmer weitergeben.</p>
          <a href="${safePublicUrl}" style="color: #1d4ed8; word-break: break-word;">${safePublicUrl}</a>
        </div>

        <div style="padding: 16px; border: 1px solid #f3c7c7; border-radius: 8px; background: #fff7f7; margin-bottom: 14px;">
          <p style="margin: 0 0 6px; font-weight: 700; color: #7f1d1d;">Admin-Link</p>
          <p style="margin: 0 0 10px; color: #7f1d1d;">Nur für dich. Nicht weitergeben.</p>
          <a href="${safeAdminUrl}" style="color: #991b1b; word-break: break-word;">${safeAdminUrl}</a>
          <p style="margin: 10px 0 0; color: #7f1d1d;">
            Mit diesem Link kann die Abstimmung verwaltet, geschlossen oder dauerhaft gelöscht werden.
          </p>
        </div>

        <p style="margin: 0; color: #555;">
          Die Abstimmung ist erst nach Aktivierung über den E-Mail-Link öffentlich erreichbar.
        </p>
      </div>
    `,
  };
}

export async function sendPollCreatedEmail({
  to,
  title,
  publicUrl,
  adminUrl,
  activationUrl,
  expiresAt,
}) {
  if (!isMailConfigured()) {
    console.info(
      "E-Mail-Versand übersprungen: SMTP_HOST oder MAIL_FROM fehlt."
    );
    return {
      skipped: true,
    };
  }

  const transporter = getTransporter();
  const email = buildPollCreatedEmail({
    title,
    publicUrl,
    adminUrl,
    activationUrl,
    expiresAt,
  });

  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject: email.subject,
    text: email.text,
    html: email.html,
  });

  return {
    skipped: false,
  };
}
