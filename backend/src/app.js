import express from "express";
import cors from "cors";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pollsRouter } from "./routes/polls.routes.js";
import { pool } from "./db/pool.js";
import { getPublicPollMetaByPublicId } from "./models/poll.model.js";

export const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDistPath = path.resolve(__dirname, "../../frontend/dist");
const frontendIndexPath = path.join(frontendDistPath, "index.html");
const defaultMeta = {
  title: "VoteLink",
  description: "Erstelle und teile einfache Online-Abstimmungen mit VoteLink.",
};

function getCorsOptions() {
  const allowedOriginInput = process.env.CORS_ORIGIN;

  if (!allowedOriginInput || allowedOriginInput.trim() === "*") {
    if (process.env.NODE_ENV === "production") {
      throw new Error("CORS_ORIGIN muss in Produktion gesetzt sein.");
    }

    return {};
  }

  const allowedOrigins = allowedOriginInput
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return {
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Nicht erlaubter CORS-Origin."));
    },
  };
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeText(value, maxLength) {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trim()}...`;
}

function getPublicBaseUrl(req) {
  const configuredBaseUrl = process.env.PUBLIC_APP_URL;
  const requestBaseUrl = `${req.protocol}://${req.get("host")}`;

  return String(configuredBaseUrl || requestBaseUrl).replace(/\/$/, "");
}

function getPollPublicIdFromPath(pathname) {
  const match = pathname.match(/^\/(?:p|poll)\/([^/?#]+)\/?$/);

  return match ? decodeURIComponent(match[1]) : null;
}

function buildFallbackDescription(poll) {
  const optionSummary = poll.options
    .map((option) => option.text)
    .filter(Boolean)
    .slice(0, 3)
    .join(", ");
  const mode = poll.allowMultipleVotes ? "Mehrfachauswahl" : "Einzelauswahl";
  const status = poll.status === "expired" ? "Die Abstimmung ist beendet." : "Stimme jetzt ab.";

  if (optionSummary) {
    return `${mode}: ${optionSummary}. ${status}`;
  }

  return status;
}

function buildMetaTags({ req, poll = null }) {
  const publicBaseUrl = getPublicBaseUrl(req);
  const pageUrl = `${publicBaseUrl}${req.originalUrl.split("?")[0]}`;
  const title = poll
    ? normalizeText(`${poll.title} | VoteLink`, 80)
    : defaultMeta.title;
  const description = poll
    ? normalizeText(poll.description || buildFallbackDescription(poll), 180)
    : defaultMeta.description;
  const imageUrl = process.env.PUBLIC_PREVIEW_IMAGE_URL || `${publicBaseUrl}/icon-512.png`;
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  const safeUrl = escapeHtml(pageUrl);
  const safeImageUrl = escapeHtml(imageUrl);

  return [
    `<title>${safeTitle}</title>`,
    `<meta name="description" content="${safeDescription}" />`,
    `<meta property="og:title" content="${safeTitle}" />`,
    `<meta property="og:description" content="${safeDescription}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:url" content="${safeUrl}" />`,
    `<meta property="og:image" content="${safeImageUrl}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${safeTitle}" />`,
    `<meta name="twitter:description" content="${safeDescription}" />`,
    `<meta name="twitter:image" content="${safeImageUrl}" />`,
  ].join("\n    ");
}

async function readFrontendIndex() {
  return fs.readFile(frontendIndexPath, "utf8");
}

function injectMetaTags(indexHtml, metaTags) {
  const metaBlockPattern =
    /<!--VOTELINK_META_START-->[\s\S]*?<!--VOTELINK_META_END-->/;

  if (metaBlockPattern.test(indexHtml)) {
    return indexHtml.replace(
      metaBlockPattern,
      `<!--VOTELINK_META_START-->\n    ${metaTags}\n    <!--VOTELINK_META_END-->`
    );
  }

  return indexHtml.replace(/<title>.*?<\/title>/s, metaTags);
}

app.disable("x-powered-by");
if (process.env.TRUST_PROXY === "1") {
  app.set("trust proxy", 1);
}
app.use(cors(getCorsOptions()));
app.use(express.json({ limit: "100kb" }));

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    app: "votelink",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/health/db", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT NOW() AS server_time, current_database() AS database"
    );

    res.json({
      status: "ok",
      database: result.rows[0].database,
      serverTime: result.rows[0].server_time,
    });
  } catch (error) {
    res.status(503).json({
      status: "error",
      error: "Datenbank ist nicht erreichbar.",
    });
  }
});

app.use("/api/polls", pollsRouter);

app.use(
  express.static(frontendDistPath, {
    index: false,
    maxAge: process.env.NODE_ENV === "production" ? "1y" : 0,
  })
);

app.use(async (req, res, next) => {
  if (req.method !== "GET" || req.path.startsWith("/api")) {
    next();
    return;
  }

  if (!req.accepts("html")) {
    next();
    return;
  }

  try {
    const indexHtml = await readFrontendIndex();
    const publicId = getPollPublicIdFromPath(req.path);
    const poll = publicId ? await getPublicPollMetaByPublicId(publicId) : null;
    const metaTags = buildMetaTags({ req, poll });

    res.type("html").send(injectMetaTags(indexHtml, metaTags));
  } catch (error) {
    if (error.code === "ENOENT") {
      next();
      return;
    }

    next(error);
  }
});
