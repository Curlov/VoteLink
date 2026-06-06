import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getPoll, vote, getPollResults } from "../api/pollsApi";

export function VotePage() {
  const { publicId } = useParams();

  const [poll, setPoll] = useState(null);
  const [results, setResults] = useState(null);
  const [selectedOptionId, setSelectedOptionId] = useState("");
  const [voterName, setVoterName] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isVoting, setIsVoting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
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

    if (!selectedOptionId) {
      setError("Bitte wähle eine Option aus.");
      return;
    }

    try {
      setError("");
      setIsVoting(true);

      await vote(publicId, {
        optionId: Number(selectedOptionId),
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
                fontSize: "1.8rem",
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
              Gesamtstimmen: {results.totalVotes}
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
                          title={`${option.voteCount} Stimmen (${option.percentage}%)`}
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
          </div>

          <div
            style={{
              padding: "28px 36px",
              background: "#f3f3f3",
              borderTop: "1px solid #ddd",
              color: "#222",
            }}
          >
            {!hasVoted ? (
              <>
                <h3 style={{ marginTop: 0, textAlign: "center" }}>
                  Deine Wahl
                </h3>

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
                      const isSelected =
                        String(option.id) === String(selectedOptionId);

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
                            type="radio"
                            name="poll-option"
                            value={option.id}
                            checked={isSelected}
                            onChange={(event) =>
                              setSelectedOptionId(event.target.value)
                            }
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
                        marginTop: "22px",
                        padding: "10px 22px",
                        borderRadius: "999px",
                        border: "none",
                        background: "#333",
                        color: "#fff",
                        cursor: isVoting ? "not-allowed" : "pointer",
                        fontWeight: "700",
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
    </main>
  );
}