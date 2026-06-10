import { useEffect, useState } from "react";
import {
  addIgnoredCreatorEmail,
  deleteOperatorPoll,
  getOperatorPolls,
  removeIgnoredCreatorEmail,
  updateOperatorPollStatus,
} from "../api/pollsApi";

const STORAGE_KEY = "votelink:operatorAdminToken";
const PAGE_SIZE = 25;

function getStatusButtonClass(pollStatus, buttonStatus, baseClass) {
  if (pollStatus !== buttonStatus) {
    return baseClass;
  }

  return `${baseClass} vl-button-success`;
}

export function OperatorAdminPage() {
  const [token, setToken] = useState(
    () => window.localStorage?.getItem(STORAGE_KEY) || ""
  );
  const [polls, setPolls] = useState([]);
  const [ignoredCreatorEmails, setIgnoredCreatorEmails] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [blockDialogPoll, setBlockDialogPoll] = useState(null);
  const [blockReason, setBlockReason] = useState("");
  const [isBlocking, setIsBlocking] = useState(false);
  const [deleteDialogPoll, setDeleteDialogPoll] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [ignoreDialogPoll, setIgnoreDialogPoll] = useState(null);
  const [ignoreReason, setIgnoreReason] = useState("");
  const [isIgnoring, setIsIgnoring] = useState(false);
  const [reportsDialogPoll, setReportsDialogPoll] = useState(null);

  async function loadPolls(currentToken = token) {
    if (!currentToken) {
      return;
    }

    try {
      setError("");
      setIsLoading(true);
      const response = await getOperatorPolls(currentToken);
      setPolls(response.polls);
      setIgnoredCreatorEmails(response.ignoredCreatorEmails || []);
      setIsAuthenticated(true);
      window.localStorage?.setItem(STORAGE_KEY, currentToken);
    } catch (err) {
      setIsAuthenticated(false);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadPolls();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleStatus(publicId, status) {
    try {
      setError("");
      setMessage("");
      await updateOperatorPollStatus(token, publicId, { status, reason: "" });
      setMessage("Status wurde aktualisiert.");
      await loadPolls();
    } catch (err) {
      setError(err.message);
    }
  }

  function openBlockDialog(poll) {
    setError("");
    setMessage("");
    setBlockDialogPoll(poll);
    setBlockReason(poll.blockedReason || "");
  }

  async function handleBlockSubmit(event) {
    event.preventDefault();

    if (!blockDialogPoll) {
      return;
    }

    try {
      setError("");
      setMessage("");
      setIsBlocking(true);
      await updateOperatorPollStatus(token, blockDialogPoll.publicId, {
        status: "blocked",
        reason: blockReason,
      });
      setMessage("Status wurde aktualisiert.");
      setBlockDialogPoll(null);
      setBlockReason("");
      await loadPolls();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsBlocking(false);
    }
  }

  function openDeleteDialog(poll) {
    setError("");
    setMessage("");
    setDeleteDialogPoll(poll);
  }

  async function handleDeleteSubmit(event) {
    event.preventDefault();

    if (!deleteDialogPoll) {
      return;
    }

    try {
      setError("");
      setMessage("");
      setIsDeleting(true);
      await deleteOperatorPoll(token, deleteDialogPoll.publicId);
      setMessage("Abstimmung wurde gelöscht.");
      setDeleteDialogPoll(null);
      await loadPolls();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsDeleting(false);
    }
  }

  function openIgnoreDialog(poll) {
    setError("");
    setMessage("");
    setIgnoreDialogPoll(poll);
    setIgnoreReason("");
  }

  async function handleIgnoreSubmit(event) {
    event.preventDefault();

    if (!ignoreDialogPoll) {
      return;
    }

    try {
      setError("");
      setMessage("");
      setIsIgnoring(true);
      await addIgnoredCreatorEmail(token, {
        email: ignoreDialogPoll.creatorEmail,
        reason: ignoreReason,
      });
      setMessage("E-Mail-Adresse wurde zur Ignorierliste hinzugefügt.");
      setIgnoreDialogPoll(null);
      setIgnoreReason("");
      await loadPolls();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsIgnoring(false);
    }
  }

  async function handleRemoveIgnoredEmail(email) {
    try {
      setError("");
      setMessage("");
      await removeIgnoredCreatorEmail(token, email);
      setMessage("E-Mail-Adresse wurde aus der Ignorierliste entfernt.");
      await loadPolls();
    } catch (err) {
      setError(err.message);
    }
  }

  const dateTimeFormat = new Intl.DateTimeFormat("de-DE", {
    dateStyle: "short",
    timeStyle: "short",
  });
  const reportedPolls = polls.filter((poll) => poll.reportCount > 0);
  const isIgnoredView = activeFilter === "ignored";
  const ignoredEmailSet = new Set(
    ignoredCreatorEmails.map((entry) => entry.email)
  );
  const visiblePolls = activeFilter === "reported" ? reportedPolls : polls;
  const visibleItems = isIgnoredView ? ignoredCreatorEmails : visiblePolls;
  const pageCount = Math.max(1, Math.ceil(visibleItems.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, pageCount);
  const pageStartIndex = (safeCurrentPage - 1) * PAGE_SIZE;
  const paginatedPolls = visiblePolls.slice(
    pageStartIndex,
    pageStartIndex + PAGE_SIZE
  );
  const paginatedIgnoredEmails = ignoredCreatorEmails.slice(
    pageStartIndex,
    pageStartIndex + PAGE_SIZE
  );

  function handleFilterChange(filter) {
    setActiveFilter(filter);
    setCurrentPage(1);
  }

  return (
    <main>
      <section className="vl-panel vl-panel-wide">
        <div className="vl-panel-header">
          <h2>Betreiber-Admin</h2>
        </div>

        <div className="vl-panel-body">
          {!isAuthenticated && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                loadPolls();
              }}
              style={{
                display: "flex",
                gap: "10px",
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <input
                type="password"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder="Operator-Token"
                className="vl-input"
              />
              <button type="submit" className="vl-button" disabled={isLoading}>
                {isLoading ? "Laden..." : "Laden"}
              </button>
            </form>
          )}

          {isAuthenticated && (
            <div className="vl-admin-toolbar">
              <div className="vl-admin-tabs" aria-label="Umfragen filtern">
                <button
                  type="button"
                  onClick={() => handleFilterChange("all")}
                  className={`vl-button ${
                    activeFilter === "all" ? "" : "vl-button-secondary"
                  }`}
                >
                  Alle ({polls.length})
                </button>
                <button
                  type="button"
                  onClick={() => handleFilterChange("reported")}
                  className={`vl-button ${
                    activeFilter === "reported" ? "" : "vl-button-secondary"
                  }`}
                >
                  Gemeldet ({reportedPolls.length})
                </button>
                <button
                  type="button"
                  onClick={() => handleFilterChange("ignored")}
                  className={`vl-button ${
                    activeFilter === "ignored" ? "" : "vl-button-secondary"
                  }`}
                >
                  Ignoriert ({ignoredCreatorEmails.length})
                </button>
              </div>

              <button
                type="button"
                onClick={() => loadPolls()}
                disabled={isLoading}
                className="vl-button vl-button-secondary"
              >
                {isLoading ? "Aktualisiere..." : "Aktualisieren"}
              </button>
            </div>
          )}

          {message && <p style={{ color: "#15803d" }}>{message}</p>}
          {error && <p style={{ color: "#991b1b" }}>Fehler: {error}</p>}

          {isAuthenticated && (
            <p style={{ color: "#555" }}>
              {visibleItems.length === 0
                ? isIgnoredView
                  ? "Keine E-Mail-Adressen in dieser Ansicht."
                  : "Keine Umfragen in dieser Ansicht."
                : `Zeige ${pageStartIndex + 1}-${Math.min(
                    pageStartIndex +
                      (isIgnoredView
                        ? paginatedIgnoredEmails.length
                        : paginatedPolls.length),
                    visibleItems.length
                  )} von ${visibleItems.length}`}
            </p>
          )}

          <div className="vl-admin-list">
            {isIgnoredView
              ? paginatedIgnoredEmails.map((entry) => (
                  <article key={entry.email} className="vl-admin-row">
                    <div>
                      <strong>{entry.email}</strong>
                      <p>
                        Hinzugefügt:{" "}
                        {dateTimeFormat.format(new Date(entry.createdAt))}
                      </p>
                      {entry.reason && (
                        <p style={{ color: "#991b1b" }}>
                          Grund: {entry.reason}
                        </p>
                      )}
                    </div>

                    <div className="vl-admin-row-actions">
                      <div className="vl-admin-row-actions-danger">
                        <button
                          type="button"
                          className="vl-button vl-button-danger vl-admin-action-button"
                          onClick={() => handleRemoveIgnoredEmail(entry.email)}
                        >
                          Entfernen
                        </button>
                      </div>
                    </div>
                  </article>
                ))
              : paginatedPolls.map((poll) => (
              <article key={poll.publicId} className="vl-admin-row">
                <div>
                  <strong>{poll.title}</strong>
                  <p>
                    {poll.creatorName || "Ohne Namen"} · {poll.creatorEmail}
                  </p>
                  <p>
                    Erstellt:{" "}
                    {dateTimeFormat.format(new Date(poll.createdAt))}
                    {poll.expiresAt &&
                      ` · Endet: ${dateTimeFormat.format(
                        new Date(poll.expiresAt)
                      )}`}
                    {poll.creatorIp && ` · IP: ${poll.creatorIp}`}
                  </p>
                  <p>
                    Status: <strong>{poll.status}</strong> · Teilnehmer:{" "}
                    {poll.participantCount} · Optionen: {poll.optionCount} ·
                    Meldungen: {poll.reportCount}
                    {poll.reportCount > 0 && (
                      <>
                        {" "}
                        <button
                          type="button"
                          onClick={() => setReportsDialogPoll(poll)}
                          className="vl-inline-action"
                        >
                          Details
                        </button>
                      </>
                    )}
                  </p>
                  {poll.blockedReason && (
                    <p style={{ color: "#991b1b" }}>
                      Grund: {poll.blockedReason}
                    </p>
                  )}
                </div>

                <div className="vl-admin-row-actions">
                  <div className="vl-admin-row-actions-primary">
                    <a
                      href={`/p/${poll.publicId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="vl-button vl-button-secondary vl-button-link"
                    >
                      Öffnen
                    </a>
                    <button
                      type="button"
                      className={getStatusButtonClass(
                        poll.status,
                        "active",
                        "vl-button vl-button-secondary vl-admin-action-button"
                      )}
                      onClick={() => handleStatus(poll.publicId, "active")}
                    >
                      Aktivieren
                    </button>
                    <button
                      type="button"
                      className={getStatusButtonClass(
                        poll.status,
                        "disabled",
                        "vl-button vl-button-secondary vl-admin-action-button"
                      )}
                      onClick={() => handleStatus(poll.publicId, "disabled")}
                    >
                      Deaktivieren
                    </button>
                  </div>

                  <div className="vl-admin-row-actions-danger">
                    <button
                      type="button"
                      className={getStatusButtonClass(
                        poll.status,
                        "blocked",
                        "vl-button vl-button-danger vl-admin-action-button"
                      )}
                      onClick={() => openBlockDialog(poll)}
                    >
                      Sperren
                    </button>
                    <button
                      type="button"
                      className="vl-button vl-button-danger vl-admin-action-button"
                      onClick={() => openDeleteDialog(poll)}
                    >
                      Löschen
                    </button>
                  </div>

                  <div className="vl-admin-row-actions-danger">
                    <button
                      type="button"
                      disabled={ignoredEmailSet.has(poll.creatorEmail)}
                      className={`vl-button vl-admin-action-button ${
                        ignoredEmailSet.has(poll.creatorEmail)
                          ? "vl-button-success"
                          : "vl-button-danger"
                      }`}
                      onClick={() => openIgnoreDialog(poll)}
                    >
                      {ignoredEmailSet.has(poll.creatorEmail)
                        ? "E-Mail gesperrt"
                        : "E-Mail sperren"}
                    </button>
                  </div>
                </div>
              </article>
                ))}
          </div>

          {isAuthenticated && pageCount > 1 && (
            <div className="vl-pagination" aria-label="Seitennavigation">
              <button
                type="button"
                onClick={() =>
                  setCurrentPage((page) => Math.max(1, page - 1))
                }
                disabled={safeCurrentPage === 1}
                className="vl-button vl-button-secondary"
              >
                Zurück
              </button>
              <span>
                Seite {safeCurrentPage} von {pageCount}
              </span>
              <button
                type="button"
                onClick={() =>
                  setCurrentPage((page) => Math.min(pageCount, page + 1))
                }
                disabled={safeCurrentPage === pageCount}
                className="vl-button vl-button-secondary"
              >
                Weiter
              </button>
            </div>
          )}
        </div>
      </section>

      {blockDialogPoll && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="operator-block-title"
          onClick={() => setBlockDialogPoll(null)}
          className="vl-modal-backdrop"
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="vl-modal"
          >
            <div className="vl-modal-header">
              <h2 id="operator-block-title">Umfrage sperren</h2>
            </div>

            <form onSubmit={handleBlockSubmit}>
              <div className="vl-modal-body">
                <p>
                  <strong>{blockDialogPoll.title}</strong>
                </p>
                <label style={{ color: "#333", fontWeight: "700" }}>
                  Grund
                  <textarea
                    value={blockReason}
                    onChange={(event) => setBlockReason(event.target.value)}
                    className="vl-input"
                    style={{
                      width: "100%",
                      minHeight: "120px",
                      marginTop: "6px",
                      resize: "vertical",
                    }}
                  />
                </label>
              </div>

              <div className="vl-modal-footer">
                <button
                  type="button"
                  onClick={() => setBlockDialogPoll(null)}
                  className="vl-button vl-button-secondary"
                  style={{ marginRight: "8px" }}
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={isBlocking}
                  className="vl-button vl-button-danger"
                >
                  {isBlocking ? "Sperre..." : "Sperren"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteDialogPoll && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="operator-delete-title"
          onClick={() => setDeleteDialogPoll(null)}
          className="vl-modal-backdrop"
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="vl-modal"
          >
            <div className="vl-modal-header">
              <h2 id="operator-delete-title">Umfrage löschen</h2>
            </div>

            <form onSubmit={handleDeleteSubmit}>
              <div className="vl-modal-body">
                <p>
                  <strong>{deleteDialogPoll.title}</strong>
                </p>
                <p>
                  Diese Abstimmung und alle Stimmen werden dauerhaft gelöscht.
                </p>
              </div>

              <div className="vl-modal-footer">
                <button
                  type="button"
                  onClick={() => setDeleteDialogPoll(null)}
                  className="vl-button vl-button-secondary"
                  style={{ marginRight: "8px" }}
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={isDeleting}
                  className="vl-button vl-button-danger"
                >
                  {isDeleting ? "Lösche..." : "Dauerhaft löschen"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {ignoreDialogPoll && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="operator-ignore-title"
          onClick={() => setIgnoreDialogPoll(null)}
          className="vl-modal-backdrop"
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="vl-modal"
          >
            <div className="vl-modal-header">
              <h2 id="operator-ignore-title">E-Mail sperren</h2>
            </div>

            <form onSubmit={handleIgnoreSubmit}>
              <div className="vl-modal-body">
                <p>
                  <strong>{ignoreDialogPoll.creatorEmail}</strong>
                </p>
                <p>
                  Diese Adresse kann danach keine neuen Umfragen mehr erstellen.
                </p>
                <label style={{ color: "#333", fontWeight: "700" }}>
                  Grund
                  <textarea
                    value={ignoreReason}
                    onChange={(event) => setIgnoreReason(event.target.value)}
                    className="vl-input"
                    style={{
                      width: "100%",
                      minHeight: "120px",
                      marginTop: "6px",
                      resize: "vertical",
                    }}
                  />
                </label>
              </div>

              <div className="vl-modal-footer">
                <button
                  type="button"
                  onClick={() => setIgnoreDialogPoll(null)}
                  className="vl-button vl-button-secondary"
                  style={{ marginRight: "8px" }}
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={isIgnoring}
                  className="vl-button vl-button-danger"
                >
                  {isIgnoring ? "Sperre..." : "E-Mail sperren"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {reportsDialogPoll && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="operator-reports-title"
          onClick={() => setReportsDialogPoll(null)}
          className="vl-modal-backdrop"
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="vl-modal"
          >
            <div className="vl-modal-header">
              <h2 id="operator-reports-title">Meldungen</h2>
            </div>

            <div className="vl-modal-body">
              <p>
                <strong>{reportsDialogPoll.title}</strong>
              </p>
              {reportsDialogPoll.reports.map((report) => (
                <article key={report.id} className="vl-report-detail">
                  <strong>{report.reason}</strong>
                  <p>
                    {dateTimeFormat.format(new Date(report.createdAt))} ·{" "}
                    {report.reporterEmail}
                    {report.reporterIp && ` · IP: ${report.reporterIp}`}
                  </p>
                  {report.details && <p>{report.details}</p>}
                </article>
              ))}
            </div>

            <div className="vl-modal-footer">
              <button
                type="button"
                onClick={() => setReportsDialogPoll(null)}
                className="vl-button"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
