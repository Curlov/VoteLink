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
  const [isPublicLinkCopied, setIsPublicLinkCopied] = useState(false);
  const [isEmbedCodeCopied, setIsEmbedCodeCopied] = useState(false);

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

  async function handleCopyLink(url) {
    try {
      setError("");
      await navigator.clipboard.writeText(url);
      setIsPublicLinkCopied(true);
      if (copyResetTimeoutRef.current) {
        window.clearTimeout(copyResetTimeoutRef.current);
      }
      copyResetTimeoutRef.current = window.setTimeout(() => {
        setIsPublicLinkCopied(false);
      }, 2000);
    } catch {
      setError("Der Link konnte nicht kopiert werden.");
    }
  }

  async function handleCopyEmbedCode(embedCode) {
    try {
      setError("");
      await navigator.clipboard.writeText(embedCode);
      setIsEmbedCodeCopied(true);
      if (copyResetTimeoutRef.current) {
        window.clearTimeout(copyResetTimeoutRef.current);
      }
      copyResetTimeoutRef.current = window.setTimeout(() => {
        setIsEmbedCodeCopied(false);
      }, 2000);
    } catch {
      setError("Der Embed-Code konnte nicht kopiert werden.");
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
        <p style={{ color: "red" }}>Fehler: {error}</p>
      </main>
    );
  }

  const appBaseUrl = window.location.origin;
  const publicUrl = `${appBaseUrl}/p/${poll.publicId}`;
  const adminUrl = `${appBaseUrl}/admin/${adminToken}`;
  const embedUrl = `${appBaseUrl}/embed/${poll.publicId}`;
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
    border: "1px solid #ccc",
    background: "#fff",
    color: "#222",
    font: "inherit",
  };
  const inlineCopyButtonStyle = {
    marginLeft: "10px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "4px",
    verticalAlign: "baseline",
  };
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
          margin: "32px auto",
          borderRadius: "24px",
          overflow: "hidden",
          border: "1px solid #ddd",
          boxShadow: "0 12px 32px rgba(0, 0, 0, 0.12)",
          background: "#fff",
          color: "#222",
          textAlign: "left",
        }}
      >
        <div
          style={{
            position: "relative",
            padding: "28px 36px",
            background: "#f3f3f3",
            borderBottom: "1px solid #ddd",
          }}
        >
          <p
            style={{
              marginBottom: "6px",
              color: "#666",
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
                color: "#222",
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
                color: "#555",
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
              color: "#555",
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
              <strong style={{ color: isExpired ? "#991b1b" : "#15803d" }}>
                {isExpired ? "Abgelaufen" : "Aktiv"}
              </strong>
            </p>
            <p>
              Start: {dateTimeFormat.format(new Date(poll.createdAt))}
              {poll.expiresAt &&
                ` · Ende: ${dateTimeFormat.format(new Date(poll.expiresAt))}`}
            </p>
            <p>
              Öffentlicher Link:{" "}
              <a href={`/p/${poll.publicId}`}>{publicUrl}</a>
              <button
                type="button"
                onClick={() => handleCopyLink(publicUrl)}
                className="vl-button vl-button-secondary vl-button-small"
                style={{
                  ...inlineCopyButtonStyle,
                  borderColor: isPublicLinkCopied ? "#15803d" : "#ccc",
                }}
              >
                Kopieren
                <span
                  aria-hidden="true"
                  style={{
                    width: "16px",
                    color: "#15803d",
                    opacity: isPublicLinkCopied ? 1 : 0,
                    fontWeight: "900",
                    fontSize: "1rem",
                    lineHeight: "1",
                  }}
                >
                  ✓
                </span>
              </button>
            </p>
            <div
              style={{
                display: "grid",
                gap: "8px",
              }}
            >
              <div>
                <strong style={{ color: "#333" }}>Embed-Code</strong>
                <p style={{ color: "#777", fontSize: "0.88rem" }}>
                  Zum Einbetten dieser Abstimmung auf einer Website.
                </p>
              </div>
              <pre
                style={{
                  margin: 0,
                  maxWidth: "100%",
                  overflowX: "auto",
                  padding: "12px",
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  background: "#f7f7f7",
                  color: "#333",
                  fontSize: "0.82rem",
                  lineHeight: 1.45,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                <code
                  style={{
                    display: "block",
                    padding: 0,
                    background: "transparent",
                    color: "inherit",
                    font: "inherit",
                  }}
                >
                  {embedCode}
                </code>
              </pre>
              <div>
                <button
                  type="button"
                  onClick={() => handleCopyEmbedCode(embedCode)}
                  className="vl-button vl-button-secondary vl-button-small"
                  style={{
                    ...inlineCopyButtonStyle,
                    marginLeft: 0,
                    borderColor: isEmbedCodeCopied ? "#15803d" : "#ccc",
                  }}
                >
                  Kopieren
                  <span
                    aria-hidden="true"
                    style={{
                      width: "16px",
                      color: "#15803d",
                      opacity: isEmbedCodeCopied ? 1 : 0,
                      fontWeight: "900",
                      fontSize: "1rem",
                      lineHeight: "1",
                    }}
                  >
                    ✓
                  </span>
                </button>
              </div>
            </div>
            <p>
              Admin-Link:{" "}
              <a href={`/admin/${adminToken}`}>{adminUrl}</a>
              <br />
              <span style={{ color: "#777", fontSize: "0.88rem" }}>
                Verwaltungslink nur für den Ersteller. Nicht weitergeben.
              </span>
            </p>
            <p style={{ color: "#777", fontSize: "0.9rem", lineHeight: "1.45" }}>
              Abgelaufene Free-Abstimmungen werden nach der konfigurierten
              Aufbewahrungsfrist automatisch gelöscht. Sofortiges Löschen ist
              jederzeit über den Tab "Löschen" möglich.
            </p>
            {adminMessage && (
              <p style={{ color: "#15803d", fontWeight: "700" }}>
                {adminMessage}
              </p>
            )}
            {error && (
              <p style={{ color: "#991b1b", fontWeight: "700" }}>
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
              borderTop: "1px solid #ddd",
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
            <h3 style={{ margin: 0, color: "#222" }}>Abstimmung bearbeiten</h3>
            <label style={{ color: "#333", fontWeight: "700" }}>
              Titel
              <input
                type="text"
                value={editTitle}
                onChange={(event) => setEditTitle(event.target.value)}
                style={inputStyle}
              />
            </label>
            <label style={{ color: "#333", fontWeight: "700" }}>
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
            <h3 style={{ margin: 0, color: "#222" }}>Laufzeit verwalten</h3>
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
            <h3 style={{ marginTop: 0, color: "#7f1d1d" }}>
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
              <strong style={{ color: "#991b1b" }}>
                Teilnehmerlimit erreicht
              </strong>
            )}
          </div>

          <div style={{ display: "grid", gap: "12px" }}>
            {poll.options.map((option) => (
              <div key={option.id}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "16px",
                    marginBottom: "6px",
                    fontSize: "0.95rem",
                  }}
                >
                  <span>{option.text}</span>
                  <strong>
                    {option.voteCount} · {option.percentage}%
                  </strong>
                </div>
                <div
                  style={{
                    height: "10px",
                    borderRadius: "999px",
                    background: "#e5e5e5",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${option.percentage}%`,
                      height: "100%",
                      background: "#333",
                    }}
                  />
                </div>
                {!poll.isAnonymous && option.voterNames.length > 0 && (
                  <p
                    style={{
                      marginTop: "6px",
                      color: "#777",
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
