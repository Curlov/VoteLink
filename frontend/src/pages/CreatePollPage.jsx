import { useState } from "react";
import { createPoll } from "../api/pollsApi";

export function CreatePollPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [creatorName, setCreatorName] = useState("");
  const [creatorEmail, setCreatorEmail] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [allowMultipleVotes, setAllowMultipleVotes] = useState(false);
  const [durationDays, setDurationDays] = useState(7);
  const [options, setOptions] = useState(["", ""]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function handleOptionChange(index, value) {
    const updatedOptions = [...options];
    updatedOptions[index] = value;
    setOptions(updatedOptions);
  }

  function addOption() {
    setOptions([...options, ""]);
  }

  function removeOption(index) {
    if (options.length <= 2) {
      return;
    }

    setOptions(options.filter((_, currentIndex) => currentIndex !== index));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setResult(null);
    setIsLoading(true);

    try {
      const data = {
        title,
        description,
        creatorName,
        creatorEmail,
        isAnonymous,
        allowMultipleVotes,
        durationDays,
        options,
      };

      const response = await createPoll(data);
      setResult(response);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  const fieldStyle = {
    width: "100%",
    boxSizing: "border-box",
    marginTop: "6px",
    padding: "12px 16px",
    borderRadius: "14px",
    border: "1px solid #ccc",
    background: "#fff",
    color: "#222",
    font: "inherit",
  };

  const labelStyle = {
    display: "block",
    color: "#333",
    fontWeight: "700",
    marginBottom: "4px",
  };

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
          <h2
            style={{
              margin: 0,
              color: "#222",
              fontSize: "2rem",
              lineHeight: "1.15",
            }}
          >
            Neue Abstimmung erstellen
          </h2>
          <p
            style={{
              marginTop: "10px",
              color: "#555",
              lineHeight: "1.5",
            }}
          >
            Frage eintragen, Optionen ergänzen und den Link teilen.
          </p>
        </div>

        {result ? (
          <div
            style={{
              padding: "32px 36px",
              display: "grid",
              gap: "18px",
              textAlign: "center",
            }}
          >
            <h3 style={{ margin: 0 }}>Abstimmung wurde erstellt</h3>

            <div>
              <p style={{ color: "#555", marginBottom: "4px" }}>
                Laufzeit bis
              </p>
              <strong>
                {new Intl.DateTimeFormat("de-DE", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(result.poll.expiresAt))}
              </strong>
            </div>

            {result.emailDelivery?.sent && (
              <p style={{ color: "#15803d", margin: 0 }}>
                Die Links wurden an {result.poll.creatorEmail} gesendet.
              </p>
            )}

            {result.emailDelivery?.skipped && (
              <p style={{ color: "#777", margin: 0 }}>
                Der E-Mail-Versand ist lokal nicht konfiguriert.
              </p>
            )}

            <div>
              <p style={{ color: "#555", marginBottom: "4px" }}>
                Öffentlicher Link
              </p>
              <a href={result.links.publicUrl}>
                {`${window.location.origin}${result.links.publicUrl}`}
              </a>
            </div>

            <div>
              <p style={{ color: "#555", marginBottom: "4px" }}>
                Admin-Link
              </p>
              <a href={result.links.adminUrl}>
                {`${window.location.origin}${result.links.adminUrl}`}
              </a>
            </div>
          </div>
        ) : (
          <>
            <form
              id="create-poll-form"
              onSubmit={handleSubmit}
              style={{
                padding: "32px 36px",
                display: "grid",
                gap: "20px",
              }}
            >
              <div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                    gap: "14px",
                  }}
                >
                  <div>
                    <label style={labelStyle}>Dein Name</label>
                    <input
                      type="text"
                      value={creatorName}
                      onChange={(event) => setCreatorName(event.target.value)}
                      placeholder="Optional"
                      style={fieldStyle}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Deine E-Mail</label>
                    <input
                      type="email"
                      value={creatorEmail}
                      onChange={(event) => setCreatorEmail(event.target.value)}
                      placeholder="name@example.com"
                      required
                      style={fieldStyle}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Titel</label>
                <input
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Welche Projektidee soll ich zuerst bauen?"
                  style={fieldStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Beschreibung</label>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Optionaler Beschreibungstext"
                  style={{
                    ...fieldStyle,
                    minHeight: "130px",
                    resize: "vertical",
                    lineHeight: "1.5",
                  }}
                />
              </div>

              <div>
                <label style={labelStyle}>Laufzeit</label>
                <select
                  value={durationDays}
                  onChange={(event) =>
                    setDurationDays(Number(event.target.value))
                  }
                  style={fieldStyle}
                >
                  <option value={1}>1 Tag</option>
                  <option value={7}>1 Woche</option>
                  <option value={14}>2 Wochen</option>
                  <option value={28}>4 Wochen</option>
                </select>
              </div>

              <div
                style={{
                  display: "grid",
                  gap: "10px",
                }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "12px 16px",
                    borderRadius: "16px",
                    border: "1px solid #ddd",
                    background: "#fafafa",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(event) => setIsAnonymous(event.target.checked)}
                  />
                  Anonyme Abstimmung
                </label>

                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "12px 16px",
                    borderRadius: "16px",
                    border: "1px solid #ddd",
                    background: "#fafafa",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={allowMultipleVotes}
                    onChange={(event) =>
                      setAllowMultipleVotes(event.target.checked)
                    }
                  />
                  Mehrfachauswahl erlauben
                </label>
              </div>

              <div>
                <h3 style={{ marginTop: 0, marginBottom: "12px" }}>
                  Optionen
                </h3>

                <div style={{ display: "grid", gap: "10px" }}>
                  {options.map((option, index) => (
                    <div
                      key={index}
                      style={{
                        display: "flex",
                        gap: "10px",
                        alignItems: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      <input
                        type="text"
                        value={option}
                        onChange={(event) =>
                          handleOptionChange(index, event.target.value)
                        }
                        placeholder={`Option ${index + 1}`}
                        style={{
                          ...fieldStyle,
                          flex: "1 1 240px",
                          marginTop: 0,
                        }}
                      />

                      <button
                        type="button"
                        onClick={() => removeOption(index)}
                        disabled={options.length <= 2}
                        className="vl-button vl-button-secondary"
                        style={{
                          opacity: options.length <= 2 ? 0.45 : 1,
                        }}
                      >
                        Entfernen
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addOption}
                  className="vl-button vl-button-secondary"
                  style={{
                    marginTop: "14px",
                  }}
                >
                  Option hinzufügen
                </button>
              </div>
            </form>

            <div
              style={{
                padding: "28px 36px",
                background: "#f3f3f3",
                borderTop: "1px solid #ddd",
                display: "flex",
                justifyContent: "center",
              }}
            >
              <button
                type="submit"
                form="create-poll-form"
                disabled={isLoading}
                className="vl-button vl-button-large"
              >
                {isLoading ? "Wird erstellt..." : "Abstimmung erstellen"}
              </button>
            </div>

            {error && (
              <div
                style={{
                  padding: "28px 36px",
                  background: "#fff",
                  borderTop: "1px solid #ddd",
                }}
              >
                <p style={{ color: "red", textAlign: "center" }}>
                  Fehler: {error}
                </p>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
