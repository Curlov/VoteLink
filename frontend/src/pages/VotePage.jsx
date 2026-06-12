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
import { getAbsoluteAppUrl, shareOrCopyUrl } from "../utils/shareUtils";

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
  const time = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0"
  )}:${String(seconds).padStart(2, "0")}`;

  if (days > 0) {
    return `${days}T - ${time}`;
  }

  return time;
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
  const [reporterEmail, setReporterEmail] = useState("");
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [reportMessage, setReportMessage] = useState("");
  const [isReporting, setIsReporting] = useState(false);
  const [isShareLinkCopied, setIsShareLinkCopied] = useState(false);
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

  async function handleCopyShareLink() {
    try {
      const publicUrl = getAbsoluteAppUrl(`/p/${publicId}`);

      setError("");
      const result = await shareOrCopyUrl({
        title: results?.title || poll?.title || "VoteLink-Abstimmung",
        text:
          results?.description ||
          poll?.description ||
          "Stimme bei dieser VoteLink-Abstimmung ab.",
        url: publicUrl,
      });

      if (result === "copied") {
        setIsShareLinkCopied(true);
        window.setTimeout(() => {
          setIsShareLinkCopied(false);
        }, 2000);
      }
    } catch {
      setError("Der Link konnte nicht geteilt oder kopiert werden.");
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
  return (
    <main>
      {results && (
        <section className="vl-panel">
          <div className="vl-panel-header">
            <div className="vl-panel-header-row vl-poll-header-row">
              <h2 className="vl-panel-title">{results.title}</h2>
              <div className="vl-panel-header-actions">
                <button
                  type="button"
                  onClick={handleCopyShareLink}
                  className={`vl-button vl-button-secondary vl-button-small ${
                    isShareLinkCopied ? "vl-button-success" : ""
                  }`}
                >
                  {isShareLinkCopied ? "Kopiert" : "Teilen"}
                </button>
                <LegalInfo
                  reportPanel={{
                    onOpen: () => {
                      setReportMessage("");
                    },
                    content: (
                      <form onSubmit={handleReportSubmit}>
                        {reportMessage ? (
                          <p className="vl-text-success">{reportMessage}</p>
                        ) : (
                          <div className="vl-report-form">
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

                            <button
                              type="submit"
                              disabled={isReporting}
                              className="vl-button"
                            >
                              {isReporting ? "Wird gemeldet..." : "Melden"}
                            </button>
                          </div>
                        )}
                      </form>
                    ),
                  }}
                />
              </div>
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

            <div
              className="vl-compact-results"
              data-option-count={results.options.length}
              data-result-density={
                results.options.length > 10 ? "dense" : "normal"
              }
            >
              {results.options.map((option) => (
                <div
                  key={option.id}
                  className="vl-result-option"
                  style={{
                    "--value": `${option.percentage}%`,
                  }}
                >
                  <span className="vl-result-option-title">
                    {option.text}
                  </span>
                  <span className="vl-result-option-value">
                    {option.voteCount} · {option.percentage}%
                  </span>
                </div>
              ))}
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
                  Es können keine Stimmen mehr abgegeben werden.
                </p>
              </div>
            ) : isParticipantLimitReached ? (
              <div className="vl-state-message">
                <h3>Teilnehmerlimit erreicht.</h3>
                <p>
                  Die kostenlose Abstimmung ist auf {results.maxVoters}{" "}
                  Teilnehmer begrenzt.
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
    </main>
  );
}
