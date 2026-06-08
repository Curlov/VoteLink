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

export async function sendPollCreatedEmail({ to, title, publicUrl, adminUrl }) {
  if (!isMailConfigured()) {
    console.info(
      "E-Mail-Versand übersprungen: SMTP_HOST oder MAIL_FROM fehlt."
    );
    return {
      skipped: true,
    };
  }

  const transporter = getTransporter();
  const safeTitle = escapeHtml(title);
  const safePublicUrl = escapeHtml(publicUrl);
  const safeAdminUrl = escapeHtml(adminUrl);

  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject: `VoteLink: Deine Abstimmung "${title}"`,
    text: [
      `Deine Abstimmung "${title}" wurde erstellt.`,
      "",
      `Öffentlicher Link: ${publicUrl}`,
      `Admin-Link: ${adminUrl}`,
      "",
      "Bewahre den Admin-Link gut auf. Über ihn kannst du die Abstimmung verwalten.",
    ].join("\n"),
    html: `
      <p>Deine Abstimmung <strong>${safeTitle}</strong> wurde erstellt.</p>
      <p>
        Öffentlicher Link:<br>
        <a href="${safePublicUrl}">${safePublicUrl}</a>
      </p>
      <p>
        Admin-Link:<br>
        <a href="${safeAdminUrl}">${safeAdminUrl}</a>
      </p>
      <p>Bewahre den Admin-Link gut auf. Über ihn kannst du die Abstimmung verwalten.</p>
    `,
  });

  return {
    skipped: false,
  };
}
