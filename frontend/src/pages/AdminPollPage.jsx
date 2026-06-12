import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  closeAdminPoll,
  deleteAdminPoll,
  extendAdminPoll,
  getAdminPoll,
  updateAdminPoll,
} from "../api/pollsApi";
import { LegalInfo } from "../components/LegalInfo";
import {
  copyTextToClipboard,
  getAbsoluteAppUrl,
  shareOrCopyUrl,
} from "../utils/shareUtils";

export function AdminPollPage() {
  const { adminToken } = useParams();
  const navigate = useNavigate();
  const copyResetTimeoutRef = useRef(null);

  const [poll, setPoll] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [adminMessage, setAdminMessage] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [extensionDays, setExtensionDays] = useState(7);
  const [isSaving, setIsSaving] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isExtending, setIsExtending] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState("results");
  const [copiedShareItem, setCopiedShareItem] = useState("");

  useEffect(() => {
    async function loadAdminPoll() {
      try {
        setError("");
        setIsLoading(true);

        const response = await getAdminPoll(adminToken);
        setPoll(response.poll);
        setEditTitle(response.poll.title);
        setEditDescription(response.poll.description || "");
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    loadAdminPoll();
  }, [adminToken]);

  useEffect(() => {
    return () => {
      if (copyResetTimeoutRef.current) {
        window.clearTimeout(copyResetTimeoutRef.current);
      }
    };
  }, []);

  async function handleUpdatePoll(event) {
    event.preventDefault();

    try {
      setError("");
      setAdminMessage("");
      setIsSaving(true);

      const response = await updateAdminPoll(adminToken, {
        title: editTitle,
        description: editDescription,
      });

      setPoll(response.poll);
      setEditTitle(response.poll.title);
      setEditDescription(response.poll.description || "");
      setAdminMessage(response.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleClosePoll() {
    try {
      setError("");
      setAdminMessage("");
      setIsClosing(true);

      const response = await closeAdminPoll(adminToken);

      setPoll(response.poll);
      setAdminMessage(response.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsClosing(false);
    }
  }

  async function handleExtendPoll() {
    try {
      setError("");
      setAdminMessage("");
      setIsExtending(true);

      const response = await extendAdminPoll(adminToken, extensionDays);

      setPoll(response.poll);
      setAdminMessage(response.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsExtending(false);
    }
  }

  async function handleDeletePoll() {
    if (
      !window.confirm(
        "Diese Abstimmung und alle Stimmen dauerhaft löschen?"
      )
    ) {
      return;
    }

    try {
      setError("");
      setAdminMessage("");
      setIsDeleting(true);

      await deleteAdminPoll(adminToken);
      navigate("/");
    } catch (err) {
      setError(err.message);
      setIsDeleting(false);
    }
  }

  async function handleCopyShareValue(value, shareItem, errorMessage) {
    try {
      setError("");
      await copyTextToClipboard(value);
      setCopiedShareItem(shareItem);
      if (copyResetTimeoutRef.current) {
        window.clearTimeout(copyResetTimeoutRef.current);
      }
      copyResetTimeoutRef.current = window.setTimeout(() => {
        setCopiedShareItem("");
      }, 2000);
    } catch {
      setError(errorMessage);
    }
  }

  async function handleSharePublicLink() {
    try {
      setError("");
      const result = await shareOrCopyUrl({
        title: poll.title,
        text: poll.description || "Stimme bei dieser VoteLink-Abstimmung ab.",
        url: getAbsoluteAppUrl(`/p/${poll.publicId}`),
      });

      if (result === "copied") {
        setCopiedShareItem("public-share");
        if (copyResetTimeoutRef.current) {
          window.clearTimeout(copyResetTimeoutRef.current);
        }
        copyResetTimeoutRef.current = window.setTimeout(() => {
          setCopiedShareItem("");
        }, 2000);
      }
    } catch {
      setError("Der Link konnte nicht geteilt oder kopiert werden.");
    }
  }

  if (isLoading) {
    return (
      <main>
        <p>Adminbereich wird geladen...</p>
      </main>
    );
  }

  if (error && !poll) {
    return (
      <main>
        <p className="vl-text-error">Fehler: {error}</p>
      </main>
    );
  }

  const publicUrl = getAbsoluteAppUrl(`/p/${poll.publicId}`);
  const adminUrl = getAbsoluteAppUrl(`/admin/${adminToken}`);
  const embedUrl = getAbsoluteAppUrl(`/embed/${poll.publicId}`);
  const embedCode = `<iframe
  src="${embedUrl}"
  width="100%"
  height="360"
  style="border:0;border-radius:16px;"
  loading="lazy"
></iframe>`;
  const isExpired = poll.expiresAt && new Date(poll.expiresAt) <= new Date();
  const dateTimeFormat = new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    marginTop: "6px",
    padding: "10px 14px",
    borderRadius: "12px",
    border: "1px solid var(--border)",
    background: "var(--card)",
    color: "var(--text)",
    font: "inherit",
  };
  const isPublicLinkCopied = copiedShareItem === "public-link";
  const isPublicShareCopied = copiedShareItem === "public-share";
  const isEmbedCodeCopied = copiedShareItem === "embed-code";
  const tabs = [
    { id: "results", label: "Ergebnisse" },
    { id: "edit", label: "Bearbeiten" },
    { id: "runtime", label: "Laufzeit" },
    { id: "danger", label: "Löschen" },
  ];

  return (
    <main>
      <section
        style={{
          maxWidth: "820px",
          margin: "var(--vl-page-top-space) auto",
          borderRadius: "14px",
          overflow: "hidden",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow)",
          background: "var(--card)",
          color: "var(--text)",
          textAlign: "left",
        }}
      >
        <div
          style={{
            position: "relative",
            padding: "28px 36px",
            background: "#fbfbfe",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <p
            style={{
              marginBottom: "6px",
              color: "var(--primary)",
              fontSize: "0.9rem",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Adminbereich
          </p>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "16px",
            }}
          >
            <h2
              style={{
                margin: 0,
                flex: "1 1 280px",
                color: "var(--text)",
                fontSize: "2rem",
                lineHeight: "1.15",
              }}
            >
              {poll.title}
            </h2>
          </div>
          {poll.description && (
            <p
              style={{
                marginTop: "12px",
                color: "var(--muted)",
                lineHeight: "1.5",
              }}
            >
              {poll.description}
            </p>
          )}
          <div
            style={{
              position: "absolute",
              right: "16px",
              bottom: "16px",
            }}
          >
            <LegalInfo />
          </div>
        </div>

        <div
          style={{
            padding: "28px 36px",
            display: "grid",
            gap: "18px",
          }}
        >
          <div
            style={{
              display: "grid",
              gap: "8px",
              color: "var(--muted)",
              fontSize: "0.95rem",
            }}
          >
            <p>
              Ersteller:{" "}
              {poll.creatorName
                ? `${poll.creatorName} · ${poll.creatorEmail}`
                : poll.creatorEmail}
            </p>
            <p>
              Typ:{" "}
              {poll.allowMultipleVotes
                ? "Mehrfachauswahl"
                : "Einzelauswahl"}
            </p>
            <p>
              Teilnahme: {poll.isAnonymous ? "anonym" : "mit Namen"}
            </p>
            <p>
              Status:{" "}
              <strong
                style={{
                  color: isExpired ? "var(--warning-text)" : "var(--success-text)",
                }}
              >
                {isExpired ? "Abgelaufen" : "Aktiv"}
              </strong>
            </p>
            <p>
              Start: {dateTimeFormat.format(new Date(poll.createdAt))}
              {poll.expiresAt &&
                ` · Ende: ${dateTimeFormat.format(new Date(poll.expiresAt))}`}
            </p>
            <section className="vl-share-panel" aria-label="Teilen und Einbetten">
              <div className="vl-share-panel-header">
                <div>
                  <h3>Teilen & Einbetten</h3>
                  <p>
                    Teile den Abstimmungslink oder binde die kompakte Ansicht
                    auf einer Website ein.
                  </p>
                </div>
              </div>

              <div className="vl-share-block">
                <div className="vl-share-block-header">
                  <div>
                    <strong>Öffentlicher Abstimmungslink</strong>
                    <p>Für Teilnehmer, die abstimmen sollen.</p>
                  </div>
                </div>
                <a href={`/p/${poll.publicId}`} className="vl-share-url">
                  {publicUrl}
                </a>
                <div className="vl-share-actions">
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyShareValue(
                        publicUrl,
                        "public-link",
                        "Der Link konnte nicht kopiert werden."
                      )
                    }
                    className={`vl-button vl-button-secondary vl-button-small ${
                      isPublicLinkCopied ? "vl-button-success" : ""
                    }`}
                  >
                    {isPublicLinkCopied ? "Kopiert" : "Link kopieren"}
                  </button>
                  <button
                    type="button"
                    onClick={handleSharePublicLink}
                    className={`vl-button vl-button-secondary vl-button-small ${
                      isPublicShareCopied ? "vl-button-success" : ""
                    }`}
                  >
                    {isPublicShareCopied ? "Kopiert" : "Teilen"}
                  </button>
                  <a
                    href={`/p/${poll.publicId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="vl-button vl-button-secondary vl-button-link vl-button-small"
                  >
                    Umfrage öffnen
                  </a>
                </div>
              </div>

              <div className="vl-share-block">
                <div className="vl-share-block-header">
                  <div>
                    <strong>Embed-/iframe-Code</strong>
                    <p>Zum Einbetten einer kompakten Ergebnisansicht.</p>
                  </div>
                  <a href={`/embed/${poll.publicId}`} target="_blank" rel="noreferrer">
                    Embed-Seite öffnen
                  </a>
                </div>
                <pre className="vl-share-code">
                  <code>{embedCode}</code>
                </pre>
                <div className="vl-share-actions">
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyShareValue(
                        embedCode,
                        "embed-code",
                        "Der Embed-Code konnte nicht kopiert werden."
                      )
                    }
                    className={`vl-button vl-button-secondary vl-button-small ${
                      isEmbedCodeCopied ? "vl-button-success" : ""
                    }`}
                  >
                    {isEmbedCodeCopied
                      ? "Kopiert"
                      : "Einbettungscode kopieren"}
                  </button>
                </div>
              </div>
            </section>
            <p>
              Admin-Link:{" "}
              <a href={`/admin/${adminToken}`}>{adminUrl}</a>
              <br />
              <span style={{ color: "var(--muted)", fontSize: "0.88rem" }}>
                Verwaltungslink nur für den Ersteller. Nicht weitergeben.
              </span>
            </p>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", lineHeight: "1.45" }}>
              Abgelaufene Free-Abstimmungen werden nach der konfigurierten
              Aufbewahrungsfrist automatisch gelöscht. Sofortiges Löschen ist
              jederzeit über den Tab "Löschen" möglich.
            </p>
            {adminMessage && (
              <p style={{ color: "var(--primary-hover)", fontWeight: "700" }}>
                {adminMessage}
              </p>
            )}
            {error && (
              <p style={{ color: "var(--danger-text)", fontWeight: "700" }}>
                Fehler: {error}
              </p>
            )}
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
              paddingTop: "14px",
              borderTop: "1px solid var(--border)",
            }}
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`vl-button ${
                    isActive ? "" : "vl-button-secondary"
                  }`}
                  style={{
                    padding: "9px 14px",
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {activeTab === "edit" && (
          <form
            onSubmit={handleUpdatePoll}
            style={{
              display: "grid",
              gap: "12px",
            }}
          >
            <h3 style={{ margin: 0, color: "var(--text)" }}>Abstimmung bearbeiten</h3>
            <label style={{ color: "var(--text)", fontWeight: "700" }}>
              Titel
              <input
                type="text"
                value={editTitle}
                onChange={(event) => setEditTitle(event.target.value)}
                style={inputStyle}
              />
            </label>
            <label style={{ color: "var(--text)", fontWeight: "700" }}>
              Beschreibung
              <textarea
                value={editDescription}
                onChange={(event) => setEditDescription(event.target.value)}
                style={{
                  ...inputStyle,
                  minHeight: "92px",
                  resize: "vertical",
                  lineHeight: "1.5",
                }}
              />
            </label>
            <div>
              <button
                type="submit"
                disabled={isSaving}
                className="vl-button"
                style={{
                  cursor: isSaving ? "not-allowed" : "pointer",
                }}
              >
                {isSaving ? "Speichern..." : "Speichern"}
              </button>
            </div>
          </form>
          )}

          {activeTab === "runtime" && (
          <div
            style={{
              display: "grid",
              gap: "14px",
            }}
          >
            <h3 style={{ margin: 0, color: "var(--text)" }}>Laufzeit verwalten</h3>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "10px",
                alignItems: "center",
              }}
            >
              <select
                value={extensionDays}
                onChange={(event) => setExtensionDays(Number(event.target.value))}
                style={{
                  ...inputStyle,
                  width: "auto",
                  marginTop: 0,
                }}
              >
                <option value={1}>1 Tag</option>
                <option value={7}>7 Tage</option>
                <option value={14}>14 Tage</option>
                <option value={28}>28 Tage</option>
              </select>
              <button
                type="button"
                onClick={handleExtendPoll}
                disabled={isExtending}
                className="vl-button vl-button-secondary"
                style={{
                  cursor: isExtending ? "not-allowed" : "pointer",
                }}
              >
                {isExtending ? "Verlängern..." : "Verlängern"}
              </button>
              <button
                type="button"
                onClick={handleClosePoll}
                disabled={isClosing || isExpired}
                className="vl-button vl-button-secondary"
                style={{
                  cursor: isClosing || isExpired ? "not-allowed" : "pointer",
                  opacity: isExpired ? 0.6 : 1,
                }}
              >
                {isClosing ? "Schließen..." : "Jetzt schließen"}
              </button>
            </div>
          </div>
          )}

          {activeTab === "danger" && (
          <div
            style={{
              display: "grid",
              gap: "12px",
            }}
          >
            <h3 style={{ marginTop: 0, color: "var(--danger-text)" }}>
              Abstimmung löschen
            </h3>
            <button
              type="button"
              onClick={handleDeletePoll}
              disabled={isDeleting}
              className="vl-button vl-button-danger"
              style={{
                cursor: isDeleting ? "not-allowed" : "pointer",
              }}
            >
              {isDeleting ? "Löschen..." : "Dauerhaft löschen"}
            </button>
          </div>
          )}

          {activeTab === "results" && (
            <>
          <div
            style={{
              display: "flex",
              gap: "14px",
              flexWrap: "wrap",
              paddingTop: "4px",
            }}
          >
            <strong>
              Teilnehmer: {poll.totalVoters}/{poll.maxVoters}
            </strong>
            {poll.allowMultipleVotes && (
              <strong>Auswahlen: {poll.totalVotes}</strong>
            )}
            {poll.isParticipantLimitReached && (
              <strong style={{ color: "var(--warning-text)" }}>
                Teilnehmerlimit erreicht
              </strong>
            )}
          </div>

          <div
            className="vl-compact-results"
            data-option-count={poll.options.length}
            data-result-density={poll.options.length > 10 ? "dense" : "normal"}
          >
            {poll.options.map((option) => (
              <div key={option.id}>
                <div
                  className="vl-result-option"
                  style={{
                    "--value": `${option.percentage}%`,
                  }}
                >
                  <span className="vl-result-option-title">{option.text}</span>
                  <span className="vl-result-option-value">
                    {option.voteCount} · {option.percentage}%
                  </span>
                </div>
                {!poll.isAnonymous && option.voterNames.length > 0 && (
                  <p
                    style={{
                      marginTop: "6px",
                      color: "var(--muted)",
                      fontSize: "0.85rem",
                      lineHeight: "1.4",
                    }}
                  >
                    {option.voterNames.join(", ")}
                  </p>
                )}
              </div>
            ))}
          </div>
            </>
          )}

        </div>
      </section>
    </main>
  );
}
