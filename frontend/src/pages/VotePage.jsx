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
        <p className="vl-text-error">Fehler: {error}</p>
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
        <section className="vl-panel">
          <div className="vl-panel-header">
            <div className="vl-panel-header-row">
              <h2 className="vl-panel-title">{results.title}</h2>
            </div>

            {results.description && (
              <p className="vl-panel-description">
                {results.description}
              </p>
            )}

            {expiresAtDate && (
              <p className="vl-panel-meta">
                Laufzeit bis {dateTimeFormat.format(expiresAtDate)}{" "}
                {!isExpired && `· noch ${remainingTime}`}
              </p>
            )}
            <div className="vl-header-legal">
              <LegalInfo />
            </div>
          </div>

          <div className="vl-results-body">
            <h3 className="vl-result-title">
              Aktuelles Zwischenergebnis
            </h3>

            <p className="vl-caption vl-text-center">
              {results.allowMultipleVotes
                ? `Teilnehmer: ${results.totalVoters}/${results.maxVoters} · Auswahlen: ${results.totalVotes}`
                : `Teilnehmer: ${results.totalVoters}/${results.maxVoters}`}
            </p>

            {shouldUseCompactResults ? (
              <div className="vl-compact-results">
                {results.options.map((option) => (
                  <div key={option.id}>
                    <div className="vl-compact-result-row">
                      <span>{option.text}</span>
                      <strong>
                        {option.voteCount} · {option.percentage}%
                      </strong>
                    </div>
                    <div className="vl-progress-track">
                      <div
                        className="vl-progress-fill"
                        style={{
                          "--progress-width": `${option.percentage}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="vl-bar-chart-scroll">
                <div
                  className="vl-bar-chart"
                  style={{
                    "--chart-gap": `${chartGap}px`,
                  }}
                >
                  {results.options.map((option) => {
                    const barHeight =
                      results.totalVotes === 0 ? 0 : option.percentage;

                    return (
                      <div
                        key={option.id}
                        className="vl-bar-column"
                        style={{
                          "--option-width": `${optionWidth}px`,
                        }}
                      >
                        <div className="vl-bar-stage">
                          <div
                            className="vl-bar"
                            style={{
                              "--bar-width": `${barWidth}px`,
                              "--bar-height": `${barHeight}%`,
                              "--bar-radius":
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
                          className="vl-bar-value"
                          style={{
                            "--bar-width": `${barWidth}px`,
                          }}
                        >
                          {option.percentage}%
                        </div>

                        <strong
                          className="vl-bar-label"
                          style={{
                            "--option-width": `${optionWidth}px`,
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

            <div className="vl-report-row">
              <button
                type="button"
                onClick={() => {
                  setReportMessage("");
                  setIsReportOpen(true);
                }}
                aria-label="Umfrage melden"
                title="Umfrage melden"
                className="vl-report-button"
              >
                Melden
              </button>
            </div>
          </div>

          <div className="vl-vote-panel">
            {hasJustVoted ? (
              <div className="vl-state-message">
                <h3>
                  Vielen Dank für deine Stimme!
                </h3>
                <p>
                  Das Ergebnis wurde aktualisiert.
                </p>
              </div>
            ) : hasVoted ? (
              <div className="vl-state-message">
                <h3>
                  Du hast deine Stimme bereits abgegeben.
                </h3>
                <p>Vielen Dank.</p>
                {import.meta.env.DEV && (
                  <button
                    type="button"
                    onClick={handleResetLocalVoteForTesting}
                    className="vl-button vl-button-secondary vl-dev-button"
                  >
                    Teststimme in diesem Browser zurücksetzen
                  </button>
                )}
              </div>
            ) : isExpired ? (
              <div className="vl-state-message">
                <h3>Diese Abstimmung ist beendet.</h3>
                <p>
                  Stimmen können nicht mehr abgegeben werden.
                </p>
              </div>
            ) : isParticipantLimitReached ? (
              <div className="vl-state-message">
                <h3>
                  Das Teilnehmerlimit ist erreicht.
                </h3>
                <p>
                  Diese kostenlose Abstimmung nimmt keine weiteren Antworten
                  entgegen.
                </p>
              </div>
            ) : (
              <>
                <div className="vl-choice-header">
                  <h3>
                    Deine Auswahl
                  </h3>
                  <p className="vl-caption">
                    {poll.allowMultipleVotes
                      ? "Mehrere Optionen möglich"
                      : "Eine Option wählen"}
                  </p>
                </div>

                <form onSubmit={handleSubmit}>
                  {!poll.isAnonymous && (
                    <div className="vl-voter-name-field">
                      <label>Dein Name</label>
                      <br />
                      <input
                        type="text"
                        value={voterName}
                        onChange={(event) => setVoterName(event.target.value)}
                        placeholder="Thomas"
                        className="vl-voter-name-input"
                      />
                    </div>
                  )}

                  <div className="vl-pill-group">
                    {poll.options.map((option) => {
                      const optionId = String(option.id);
                      const isSelected = selectedOptionIds.includes(optionId);

                      return (
                        <label
                          key={option.id}
                          className={`vl-button-pill ${
                            isSelected ? "vl-button-pill-selected" : ""
                          }`}
                        >
                          <input
                            type={
                              poll.allowMultipleVotes ? "checkbox" : "radio"
                            }
                            name="poll-option"
                            value={option.id}
                            checked={isSelected}
                            onChange={() => handleOptionSelection(optionId)}
                          />

                          <span>{option.text}</span>
                        </label>
                      );
                    })}
                  </div>

                  <div className="vl-action-center">
                    <button
                      type="submit"
                      disabled={isVoting}
                      className="vl-button vl-button-large vl-submit-spaced"
                    >
                      {isVoting ? "Stimme wird gespeichert..." : "Abstimmen"}
                    </button>
                  </div>
                </form>
              </>
            )}

            {error && (
              <p className="vl-text-error vl-text-center">
                Fehler: {error}
              </p>
            )}

          </div>
        </section>
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
                  <p className="vl-text-success">{reportMessage}</p>
                ) : (
                  <>
                    <label className="vl-label">
                      Deine E-Mail
                      <input
                        type="email"
                        value={reporterEmail}
                        onChange={(event) =>
                          setReporterEmail(event.target.value)
                        }
                        required
                        className="vl-input"
                      />
                    </label>

                    <label className="vl-label">
                      Grund
                      <select
                        value={reportReason}
                        onChange={(event) =>
                          setReportReason(event.target.value)
                        }
                        required
                        className="vl-input"
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

                    <label className="vl-label">
                      Details
                      <textarea
                        value={reportDetails}
                        onChange={(event) =>
                          setReportDetails(event.target.value)
                        }
                        className="vl-input vl-textarea"
                      />
                    </label>
                  </>
                )}
              </div>

              <div className="vl-modal-footer">
                <button
                  type="button"
                  onClick={() => setIsReportOpen(false)}
                  className="vl-button vl-button-secondary vl-modal-action-spaced"
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
