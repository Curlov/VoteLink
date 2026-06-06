import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getPoll, vote, getPollResults } from "../api/pollsApi";

export function VotePage() {
  const { publicId } = useParams();

  const [poll, setPoll] = useState(null);
  const [results, setResults] = useState(null);
  const [selectedOptionIds, setSelectedOptionIds] = useState([]);
  const [voterName, setVoterName] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isVoting, setIsVoting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadPageData() {
      try {
        setError("");
        setIsLoading(true);

        const pollResponse = await getPoll(publicId);
        const resultsResponse = await getPollResults(publicId);

        setPoll(pollResponse.poll);
        setResults(resultsResponse.results);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    loadPageData();
  }, [publicId]);

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
      });

      const resultsResponse = await getPollResults(publicId);

      setResults(resultsResponse.results);
      setHasVoted(true);
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
  const isExpired = poll?.expiresAt && new Date(poll.expiresAt) <= new Date();

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

            {poll.expiresAt && (
              <p
                style={{
                  marginTop: "12px",
                  marginBottom: 0,
                  color: "#777",
                  fontSize: "0.9rem",
                }}
              >
                Laufzeit bis{" "}
                {new Date(poll.expiresAt).toLocaleDateString("de-DE")}
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
            {isExpired ? (
              <div style={{ textAlign: "center" }}>
                <h3 style={{ marginTop: 0 }}>Diese Abstimmung ist beendet.</h3>
                <p style={{ marginBottom: 0 }}>
                  Stimmen können nicht mehr abgegeben werden.
                </p>
              </div>
            ) : !hasVoted ? (
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
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "6px",
                            padding: "9px 16px",
                            minWidth: "120px",
                            border: isSelected
                              ? "1px solid #15803d"
                              : "1px solid #ccc",
                            borderRadius: "999px",
                            background: isSelected ? "#16a34a" : "#fff",
                            color: isSelected ? "#fff" : "#222",
                            cursor: "pointer",
                            maxWidth: "100%",
                            fontSize: "0.9rem",
                            lineHeight: "1.2",
                            fontWeight: isSelected ? "700" : "400",
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
                      style={{
                        marginTop: "26px",
                        padding: "14px 32px",
                        minWidth: "170px",
                        borderRadius: "999px",
                        border: "none",
                        background: "#333",
                        color: "#fff",
                        cursor: isVoting ? "not-allowed" : "pointer",
                        fontWeight: "700",
                        fontSize: "1.05rem",
                        lineHeight: "1.2",
                      }}
                    >
                      {isVoting ? "Stimme wird gespeichert..." : "Abstimmen"}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div style={{ textAlign: "center" }}>
                <h3 style={{ marginTop: 0 }}>
                  Vielen Dank für deine Stimme!
                </h3>
                <p style={{ marginBottom: 0 }}>
                  Das Ergebnis wurde aktualisiert.
                </p>
              </div>
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
                style={{
                  padding: "10px 18px",
                  borderRadius: "999px",
                  border: "none",
                  background: "#333",
                  color: "#fff",
                  cursor: "pointer",
                  fontWeight: "700",
                }}
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
