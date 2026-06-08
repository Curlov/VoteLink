import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  getParticipation,
  getPoll,
  vote,
  getPollResults,
} from "../api/pollsApi";

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
        <h1>VoteLink</h1>
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

  const barWidth = optionCount <= 3 ? 72 : optionCount <= 5 ? 58 : 44;
  const optionWidth = optionCount <= 3 ? 150 : optionCount <= 5 ? 125 : 80;
  const chartGap = optionCount <= 3 ? 34 : optionCount <= 5 ? 24 : 16;

  return (
    <main>
      <h1 style={{ textAlign: "center" }}>VoteLink</h1>

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
              padding: "28px 36px",
              background: "#f3f3f3", 
              borderBottom: "1px solid #ddd",
              color: "#222",
            }}
          >
            <h2
              style={{
                margin: 0,
                color: "#222",
                fontSize: "2rem",
                lineHeight: "1.15",
              }}
            >
              {results.title}
            </h2>

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
                ? `Teilnehmer: ${results.totalVoters} · Auswahlen: ${results.totalVotes}`
                : `Stimmen: ${results.totalVotes}`}
            </p>

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
                            results.allowMultipleVotes ? "Auswahlen" : "Stimmen"
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

            {poll.creatorEmail && (
              <div
                style={{
                  marginTop: "4px",
                  marginBottom: "-22px",
                  marginLeft: "-20px",
                  textAlign: "left",
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
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            background: "rgba(0, 0, 0, 0.35)",
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(420px, 100%)",
              borderRadius: "20px",
              border: "1px solid #ddd",
              background: "#fff",
              boxShadow: "0 18px 48px rgba(0, 0, 0, 0.22)",
              color: "#222",
              overflow: "hidden",
              textAlign: "left",
            }}
          >
            <div
              style={{
                padding: "22px 26px",
                background: "#f3f3f3",
                borderBottom: "1px solid #ddd",
              }}
            >
              <h3
                id="poll-info-title"
                style={{ margin: 0, color: "#222" }}
              >
                Informationen zur Umfrage
              </h3>
            </div>

            <div
              style={{
                padding: "24px 26px",
                display: "grid",
                gap: "12px",
                color: "#555",
              }}
            >
              <p>
                Initialisiert von:{" "}
                <strong style={{ color: "#222" }}>
                  {poll.creatorName || "Nicht angegeben"}
                </strong>
              </p>
              <p>
                Bei Rückfragen wenden Sie sich an:{" "}
                <a href={`mailto:${poll.creatorEmail}`}>{poll.creatorEmail}</a>
              </p>
              <p>
                Diese Abstimmung speichert einen anonymen Teilnahme-Token in
                diesem Browser, um Mehrfachabstimmungen zu erschweren.
              </p>
            </div>

            <div
              style={{
                padding: "18px 26px",
                background: "#f3f3f3",
                borderTop: "1px solid #ddd",
                textAlign: "right",
              }}
            >
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
    </main>
  );
}
