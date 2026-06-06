import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getAdminPoll } from "../api/pollsApi";

export function AdminPollPage() {
  const { adminToken } = useParams();

  const [poll, setPoll] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadAdminPoll() {
      try {
        setError("");
        setIsLoading(true);

        const response = await getAdminPoll(adminToken);
        setPoll(response.poll);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    loadAdminPoll();
  }, [adminToken]);

  if (isLoading) {
    return (
      <main>
        <p>Adminbereich wird geladen...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main>
        <h1>VoteLink</h1>
        <p style={{ color: "red" }}>Fehler: {error}</p>
      </main>
    );
  }

  const publicUrl = `${window.location.origin}/p/${poll.publicId}`;
  const isExpired = poll.expiresAt && new Date(poll.expiresAt) <= new Date();
  const dateTimeFormat = new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <main>
      <h1 style={{ textAlign: "center" }}>VoteLink</h1>

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
          <h2
            style={{
              margin: 0,
              color: "#222",
              fontSize: "2rem",
              lineHeight: "1.15",
            }}
          >
            {poll.title}
          </h2>
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
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: "14px",
              flexWrap: "wrap",
              paddingTop: "4px",
            }}
          >
            <strong>
              {poll.allowMultipleVotes
                ? `Teilnehmer: ${poll.totalVoters}`
                : `Stimmen: ${poll.totalVotes}`}
            </strong>
            {poll.allowMultipleVotes && (
              <strong>Auswahlen: {poll.totalVotes}</strong>
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
        </div>
      </section>
    </main>
  );
}
