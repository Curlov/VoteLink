import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  getParticipation,
  getPoll,
  reportPoll,
  vote,
  getPollResults,
} from "../api/pollsApi";
import { LegalInfo } from "../components/LegalInfo";

const COMPACT_RESULT_OPTION_THRESHOLD = 10;

function createFallbackToken() {
  const bytes = new Uint8Array(24);
  window.crypto.getRandomValues(bytes);

  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  );
}

function getVoterTokenStorageKey(publicId) {
  return `votelink:poll:${publicId}:voterToken`;
}

function getOrCreateVoterToken(publicId) {
  const storageKey = getVoterTokenStorageKey(publicId);
  let existingToken;

  try {
    existingToken = window.localStorage?.getItem(storageKey);
  } catch {
    existingToken = null;
  }

  if (existingToken) {
    return existingToken;
  }

  const voterToken = window.crypto.randomUUID
    ? window.crypto.randomUUID()
    : createFallbackToken();

  try {
    window.localStorage?.setItem(storageKey, voterToken);
  } catch {
    return voterToken;
  }

  return voterToken;
}

function formatRemainingTime(expiresAt, now) {
  const remainingMilliseconds = new Date(expiresAt).getTime() - now.getTime();

  if (remainingMilliseconds <= 0) {
    return "abgelaufen";
  }

  const totalSeconds = Math.floor(remainingMilliseconds / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days} T ${String(hours).padStart(2, "0")} Std ${String(
      minutes
    ).padStart(2, "0")} Min`;
  }

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0"
  )}:${String(seconds).padStart(2, "0")}`;
}

export function VotePage() {
  const { publicId } = useParams();

  const [poll, setPoll] = useState(null);
  const [results, setResults] = useState(null);
  const [voterToken, setVoterToken] = useState("");
  const [selectedOptionIds, setSelectedOptionIds] = useState([]);
  const [voterName, setVoterName] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isVoting, setIsVoting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [hasJustVoted, setHasJustVoted] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reporterEmail, setReporterEmail] = useState("");
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [reportMessage, setReportMessage] = useState("");
  const [isReporting, setIsReporting] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    async function loadPageData() {
      try {
        setError("");
        setIsLoading(true);
        setHasJustVoted(false);

        const currentVoterToken = getOrCreateVoterToken(publicId);
        setVoterToken(currentVoterToken);

        const [pollResponse, resultsResponse, participationResponse] =
          await Promise.all([
            getPoll(publicId),
            getPollResults(publicId),
            getParticipation(publicId, currentVoterToken),
          ]);

        setPoll(pollResponse.poll);
        setResults(resultsResponse.results);
        setHasVoted(participationResponse.hasVoted);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    loadPageData();
  }, [publicId]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();

    if (selectedOptionIds.length === 0) {
      setError("Bitte wähle mindestens eine Option aus.");
      return;
    }

    try {
      setError("");
      setIsVoting(true);

      await vote(publicId, {
        optionIds: selectedOptionIds.map(Number),
        voterName,
        voterToken,
      });

      const resultsResponse = await getPollResults(publicId);

      setResults(resultsResponse.results);
      setHasVoted(true);
      setHasJustVoted(true);
      setSelectedOptionIds([]);
    } catch (err) {
      if (err.message.includes("Teilnehmerlimit")) {
        try {
          const resultsResponse = await getPollResults(publicId);
          setResults(resultsResponse.results);
          setSelectedOptionIds([]);
          setError("");
          return;
        } catch {
          // Keep the original vote error if refreshing the results fails.
        }
      }

      setError(err.message);
    } finally {
      setIsVoting(false);
    }
  }

  function handleOptionSelection(optionId) {
    if (poll.allowMultipleVotes) {
      setSelectedOptionIds((currentOptionIds) =>
        currentOptionIds.includes(optionId)
          ? currentOptionIds.filter(
              (currentOptionId) => currentOptionId !== optionId
            )
          : [...currentOptionIds, optionId]
      );

      return;
    }

    setSelectedOptionIds([optionId]);
  }

  function handleResetLocalVoteForTesting() {
    try {
      window.localStorage?.removeItem(getVoterTokenStorageKey(publicId));
    } catch {
      // Dev-only fallback: reloading will create an in-memory token if storage is blocked.
    }

    window.location.reload();
  }

  async function handleReportSubmit(event) {
    event.preventDefault();

    try {
      setError("");
      setReportMessage("");
      setIsReporting(true);

      const response = await reportPoll(publicId, {
        reporterEmail,
        reason: reportReason,
        details: reportDetails,
      });

      setReportMessage(response.message);
      setReporterEmail("");
      setReportReason("");
      setReportDetails("");
    } catch (err) {
      setReportMessage("");
      setError(err.message);
    } finally {
      setIsReporting(false);
    }
  }

  if (isLoading) {
    return (
      <main>
        <p>Abstimmung wird geladen...</p>
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

  const optionCount = results?.options.length || 1;
  const expiresAtDate = poll?.expiresAt ? new Date(poll.expiresAt) : null;
  const isExpired = expiresAtDate && expiresAtDate <= now;
  const dateTimeFormat = new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const remainingTime = expiresAtDate
    ? formatRemainingTime(expiresAtDate, now)
    : "";
  const isParticipantLimitReached = Boolean(
    results?.isParticipantLimitReached
  );
  const shouldUseCompactResults =
    optionCount > COMPACT_RESULT_OPTION_THRESHOLD;

  const barWidth = optionCount <= 3 ? 72 : optionCount <= 5 ? 58 : 44;
  const optionWidth = optionCount <= 3 ? 150 : optionCount <= 5 ? 125 : 80;
  const chartGap = optionCount <= 3 ? 34 : optionCount <= 5 ? 24 : 16;

  return (
    <main>
      {results && (
        <section
          style={{
            maxWidth: "820px",
            margin: "32px auto",
            borderRadius: "24px",
            overflow: "hidden",
            border: "1px solid #ddd",
            boxShadow: "0 12px 32px rgba(0, 0, 0, 0.12)",
            background: "#fff",
          }}
        >
          <div
            style={{
              position: "relative",
              padding: "28px 36px",
              background: "#f3f3f3", 
              borderBottom: "1px solid #ddd",
              color: "#222",
            }}
          >
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
                {results.title}
              </h2>
            </div>

            {results.description && (
              <p
                style={{
                  marginTop: "12px",
                  marginBottom: 0,
                  color: "#555",
                  lineHeight: "1.5",
                }}
              >
                {results.description}
              </p>
            )}

            {expiresAtDate && (
              <p
                style={{
                  marginTop: "12px",
                  marginBottom: 0,
                  color: "#777",
                  fontSize: "0.9rem",
                }}
              >
                Laufzeit bis {dateTimeFormat.format(expiresAtDate)}{" "}
                {!isExpired && `· noch ${remainingTime}`}
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
              padding: "32px 36px",
              color: "#222",
            }}
          >
            <h3
              style={{
                marginTop: 0,
                textAlign: "center",
              }}
            >
              Aktuelles Zwischenergebnis
            </h3>

            <p
              style={{
                textAlign: "center",
                color: "#666",
              }}
            >
              {results.allowMultipleVotes
                ? `Teilnehmer: ${results.totalVoters}/${results.maxVoters} · Auswahlen: ${results.totalVotes}`
                : `Teilnehmer: ${results.totalVoters}/${results.maxVoters}`}
            </p>

            {shouldUseCompactResults ? (
              <div
                style={{
                  display: "grid",
                  gap: "12px",
                  marginTop: "28px",
                }}
              >
                {results.options.map((option) => (
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
                  </div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  overflowX: "auto",
                  marginTop: "32px",
                  paddingBottom: "8px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: `${chartGap}px`,
                    paddingLeft: `${chartGap}px`,
                    paddingRight: `${chartGap}px`,
                    backgroundImage: "linear-gradient(#333, #333)",
                    backgroundRepeat: "no-repeat",
                    backgroundSize: "100% 2px",
                    backgroundPosition: "left 220px",
                  }}
                >
                  {results.options.map((option) => {
                    const barHeight =
                      results.totalVotes === 0 ? 0 : option.percentage * 2.2;

                    return (
                      <div
                        key={option.id}
                        style={{
                          width: `${optionWidth}px`,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          flexShrink: 0,
                        }}
                      >
                        <div
                          style={{
                            height: "220px",
                            width: "100%",
                            display: "flex",
                            alignItems: "end",
                            justifyContent: "center",
                          }}
                        >
                          <div
                            style={{
                              width: `${barWidth}px`,
                              height: `${barHeight}px`,
                              background: "#333",
                              transition: "height 300ms ease",
                              borderRadius:
                                barHeight > 0 ? "12px 12px 0 0" : "0",
                            }}
                            title={`${option.voteCount} ${
                              results.allowMultipleVotes
                                ? "Auswahlen"
                                : "Stimmen"
                            } (${option.percentage}%)`}
                          />
                        </div>

                        <div
                          style={{
                            width: `${barWidth}px`,
                            height: "28px",
                            background: "#333",
                            color: "#fff",
                            fontWeight: "700",
                            fontSize: "0.85rem",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: "0 0 8px 8px",
                          }}
                        >
                          {option.percentage}%
                        </div>

                        <strong
                          style={{
                            width: `${optionWidth}px`,
                            marginTop: "10px",
                            textAlign: "center",
                            minHeight: "40px",
                            color: "#222",
                            fontSize: "0.95rem",
                          }}
                        >
                          {option.text}
                        </strong>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {poll.creatorEmail && (
              <div
                style={{
                  marginTop: "4px",
                  marginBottom: "-22px",
                  marginLeft: "-20px",
                  textAlign: "left",
                  display: "flex",
                  gap: "8px",
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsInfoOpen(true)}
                  aria-label="Informationen zur Umfrage anzeigen"
                  title="Informationen zur Umfrage"
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "999px",
                    border: "1px solid #ddd",
                    background: "#f7f7f7",
                    color: "#aaa",
                    cursor: "pointer",
                    fontSize: "0.78rem",
                    fontWeight: "700",
                    lineHeight: "1",
                  }}
                >
                  i
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReportMessage("");
                    setIsReportOpen(true);
                  }}
                  aria-label="Umfrage melden"
                  title="Umfrage melden"
                  style={{
                    minWidth: "76px",
                    height: "24px",
                    borderRadius: "999px",
                    border: "1px solid #ddd",
                    background: "#f7f7f7",
                    color: "#777",
                    cursor: "pointer",
                    fontSize: "0.78rem",
                    fontWeight: "400",
                    lineHeight: "1",
                  }}
                >
                  Melden
                </button>
              </div>
            )}
          </div>

          <div
            style={{
              padding: "28px 36px",
              background: "#f3f3f3",
              borderTop: "1px solid #ddd",
              color: "#222",
            }}
          >
            {hasJustVoted ? (
              <div style={{ textAlign: "center" }}>
                <h3 style={{ marginTop: 0 }}>
                  Vielen Dank für deine Stimme!
                </h3>
                <p style={{ marginBottom: 0 }}>
                  Das Ergebnis wurde aktualisiert.
                </p>
              </div>
            ) : hasVoted ? (
              <div style={{ textAlign: "center" }}>
                <h3 style={{ marginTop: 0 }}>
                  Du hast deine Stimme bereits abgegeben.
                </h3>
                <p style={{ marginBottom: 0 }}>Vielen Dank.</p>
                {import.meta.env.DEV && (
                  <button
                    type="button"
                    onClick={handleResetLocalVoteForTesting}
                    className="vl-button vl-button-secondary"
                    style={{ marginTop: "16px" }}
                  >
                    Teststimme in diesem Browser zurücksetzen
                  </button>
                )}
              </div>
            ) : isExpired ? (
              <div style={{ textAlign: "center" }}>
                <h3 style={{ marginTop: 0 }}>Diese Abstimmung ist beendet.</h3>
                <p style={{ marginBottom: 0 }}>
                  Stimmen können nicht mehr abgegeben werden.
                </p>
              </div>
            ) : isParticipantLimitReached ? (
              <div style={{ textAlign: "center" }}>
                <h3 style={{ marginTop: 0 }}>
                  Das Teilnehmerlimit ist erreicht.
                </h3>
                <p style={{ marginBottom: 0 }}>
                  Diese kostenlose Abstimmung nimmt keine weiteren Antworten
                  entgegen.
                </p>
              </div>
            ) : (
              <>
                <div style={{ textAlign: "center" }}>
                  <h3 style={{ marginTop: 0, marginBottom: "4px" }}>
                    Deine Auswahl
                  </h3>
                  <p
                    style={{
                      color: "#666",
                      fontSize: "0.9rem",
                      marginBottom: 0,
                    }}
                  >
                    {poll.allowMultipleVotes
                      ? "Mehrere Optionen möglich"
                      : "Eine Option wählen"}
                  </p>
                </div>

                <form onSubmit={handleSubmit}>
                  {!poll.isAnonymous && (
                    <div
                      style={{
                        marginBottom: "16px",
                        textAlign: "center",
                      }}
                    >
                      <label>Dein Name</label>
                      <br />
                      <input
                        type="text"
                        value={voterName}
                        onChange={(event) => setVoterName(event.target.value)}
                        placeholder="Thomas"
                        style={{
                          marginTop: "6px",
                          padding: "8px 12px",
                          borderRadius: "999px",
                          border: "1px solid #ccc",
                        }}
                      />
                    </div>
                  )}

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      justifyContent: "center",
                      gap: "10px",
                      marginTop: "16px",
                    }}
                  >
                    {poll.options.map((option) => {
                      const optionId = String(option.id);
                      const isSelected = selectedOptionIds.includes(optionId);

                      return (
                        <label
                          key={option.id}
                          className={`vl-button-pill ${
                            isSelected ? "vl-button-pill-selected" : ""
                          }`}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "6px",
                            minWidth: "88px",
                            maxWidth: "100%",
                            transition:
                              "background 160ms ease, color 160ms ease, border 160ms ease",
                          }}
                        >
                          <input
                            type={
                              poll.allowMultipleVotes ? "checkbox" : "radio"
                            }
                            name="poll-option"
                            value={option.id}
                            checked={isSelected}
                            onChange={() => handleOptionSelection(optionId)}
                            style={{
                              display: "none",
                            }}
                          />

                          <span
                            style={{
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {option.text}
                          </span>
                        </label>
                      );
                    })}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                    }}
                  >
                    <button
                      type="submit"
                      disabled={isVoting}
                      className="vl-button vl-button-large"
                      style={{ marginTop: "26px" }}
                    >
                      {isVoting ? "Stimme wird gespeichert..." : "Abstimmen"}
                    </button>
                  </div>
                </form>
              </>
            )}

            {error && (
              <p
                style={{
                  color: "red",
                  textAlign: "center",
                  marginBottom: 0,
                }}
              >
                Fehler: {error}
              </p>
            )}

          </div>
        </section>
      )}

      {isInfoOpen && poll?.creatorEmail && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="poll-info-title"
          onClick={() => setIsInfoOpen(false)}
          className="vl-modal-backdrop"
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="vl-modal"
          >
            <div className="vl-modal-header">
              <h2 id="poll-info-title">
                Informationen zur Umfrage
              </h2>
            </div>

            <div className="vl-modal-body">
              <p>
                Erstellt von:{" "}
                <strong style={{ color: "#222" }}>
                  {poll.creatorName || "Nicht angegeben"}
                </strong>
              </p>
              <p>
                Kontakt für Rückfragen:{" "}
                <a href={`mailto:${poll.creatorEmail}`}>{poll.creatorEmail}</a>
              </p>
              <p>
                VoteLink speichert in diesem Browser einen zufällig erzeugten
                Teilnahme-Token. Auf dem Server wird nur ein Hash dieses Tokens
                gespeichert, damit Mehrfachabstimmungen erschwert werden.
              </p>
              <p>
                Diese kostenlose Abstimmung erlaubt bis zu {poll.maxVoters}
                Teilnehmer. Danach nimmt sie keine weiteren Antworten entgegen.
              </p>
              <p>
                {poll.isAnonymous
                  ? "Diese Abstimmung ist anonym. Dein Name wird nicht abgefragt."
                  : "Diese Abstimmung fragt deinen Namen ab. Der Ersteller kann die Namen im Adminbereich sehen."}
              </p>
              <p>
                Nach Ablauf wird die Abstimmung nach der Aufbewahrungsfrist
                automatisch gelöscht.
              </p>
            </div>

            <div className="vl-modal-footer">
              <button
                type="button"
                onClick={() => setIsInfoOpen(false)}
                className="vl-button"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}

      {isReportOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="poll-report-title"
          onClick={() => setIsReportOpen(false)}
          className="vl-modal-backdrop"
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="vl-modal"
          >
            <div className="vl-modal-header">
              <h2 id="poll-report-title">Umfrage melden</h2>
            </div>

            <form onSubmit={handleReportSubmit}>
              <div className="vl-modal-body">
                {reportMessage ? (
                  <p style={{ color: "#15803d" }}>{reportMessage}</p>
                ) : (
                  <>
                    <label style={{ color: "#333", fontWeight: "700" }}>
                      Deine E-Mail
                      <input
                        type="email"
                        value={reporterEmail}
                        onChange={(event) =>
                          setReporterEmail(event.target.value)
                        }
                        required
                        className="vl-input"
                        style={{ width: "100%", marginTop: "6px" }}
                      />
                    </label>

                    <label style={{ color: "#333", fontWeight: "700" }}>
                      Grund
                      <select
                        value={reportReason}
                        onChange={(event) =>
                          setReportReason(event.target.value)
                        }
                        required
                        className="vl-input"
                        style={{ width: "100%", marginTop: "6px" }}
                      >
                        <option value="">Bitte auswählen</option>
                        <option value="Rechtswidrige Inhalte">
                          Rechtswidrige Inhalte
                        </option>
                        <option value="Hassrede oder Diskriminierung">
                          Hassrede oder Diskriminierung
                        </option>
                        <option value="Belästigung oder Bedrohung">
                          Belästigung oder Bedrohung
                        </option>
                        <option value="Spam oder Missbrauch">
                          Spam oder Missbrauch
                        </option>
                        <option value="Sonstiger Verstoß">
                          Sonstiger Verstoß
                        </option>
                      </select>
                    </label>

                    <label style={{ color: "#333", fontWeight: "700" }}>
                      Details
                      <textarea
                        value={reportDetails}
                        onChange={(event) =>
                          setReportDetails(event.target.value)
                        }
                        className="vl-input"
                        style={{
                          width: "100%",
                          minHeight: "120px",
                          marginTop: "6px",
                          resize: "vertical",
                        }}
                      />
                    </label>
                  </>
                )}
              </div>

              <div className="vl-modal-footer">
                <button
                  type="button"
                  onClick={() => setIsReportOpen(false)}
                  className="vl-button vl-button-secondary"
                  style={{ marginRight: "8px" }}
                >
                  Schließen
                </button>
                {!reportMessage && (
                  <button
                    type="submit"
                    disabled={isReporting}
                    className="vl-button"
                  >
                    {isReporting ? "Wird gemeldet..." : "Melden"}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
