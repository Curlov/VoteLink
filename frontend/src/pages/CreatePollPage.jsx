import { useState } from "react";
import { createPoll } from "../api/pollsApi";
import { LegalInfo } from "../components/LegalInfo";

const FREE_POLL_OPTION_LIMIT = 6;

export function CreatePollPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [creatorName, setCreatorName] = useState("");
  const [creatorEmail, setCreatorEmail] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [allowMultipleVotes, setAllowMultipleVotes] = useState(false);
  const [durationDays, setDurationDays] = useState(7);
  const [options, setOptions] = useState(["", ""]);
  const [hasAcceptedRules, setHasAcceptedRules] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function handleOptionChange(index, value) {
    const updatedOptions = [...options];
    updatedOptions[index] = value;
    setOptions(updatedOptions);
  }

  function addOption() {
    if (options.length >= FREE_POLL_OPTION_LIMIT) {
      return;
    }

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

  return (
    <main>
      <section className="vl-panel">
        <div className="vl-panel-header">
          <div className="vl-panel-header-row">
            <h2 className="vl-panel-title">Neue Abstimmung erstellen</h2>
          </div>
          <p className="vl-panel-intro">
            Frage eintragen, Optionen ergänzen und den Link teilen.
          </p>
          <div className="vl-header-legal">
            <LegalInfo />
          </div>
        </div>

        {result ? (
          <>
            <div className="vl-result-panel">
              <h3 className="vl-heading-reset">
                {result.poll.status === "pending"
                  ? "Bitte E-Mail bestätigen"
                  : "Abstimmung wurde erstellt"}
              </h3>

              {result.poll.status === "pending" && (
                <p className="vl-text-muted">
                  Die Abstimmung wird erst öffentlich erreichbar, nachdem der
                  Aktivierungslink aus der E-Mail geöffnet wurde.
                </p>
              )}

              {result.emailDelivery?.sent && (
                <p className="vl-text-success">
                  Die Aktivierung und alle Links wurden an{" "}
                  {creatorEmail} gesendet.
                </p>
              )}

              {result.emailDelivery?.skipped && (
                <p className="vl-text-subtle">
                  Der E-Mail-Versand ist lokal nicht konfiguriert.
                </p>
              )}

              {result.emailDelivery?.attempted &&
                !result.emailDelivery?.sent && (
                  <p className="vl-text-error">
                    Die E-Mail konnte nicht gesendet werden. Die Links stehen
                    hier trotzdem bereit.
                  </p>
                )}

              {!result.emailDelivery?.sent && result.links.activationUrl && (
                <div>
                  <p className="vl-text-subtle vl-link-label">
                    Lokaler Aktivierungslink
                  </p>
                  <a href={result.links.activationUrl}>
                    {`${window.location.origin}${result.links.activationUrl}`}
                  </a>
                </div>
              )}

              {!result.emailDelivery?.sent && result.links.publicUrl && (
                <div>
                  <p className="vl-text-muted vl-link-label">
                    Öffentlicher Link
                  </p>
                  <p className="vl-text-subtle vl-link-help">
                    Diesen Link kannst du an Teilnehmer weitergeben.
                  </p>
                  <a href={result.links.publicUrl}>
                    {`${window.location.origin}${result.links.publicUrl}`}
                  </a>
                </div>
              )}

              {!result.emailDelivery?.sent && result.links.adminUrl && (
                <div>
                  <p className="vl-text-muted vl-link-label">
                    Admin-Link
                  </p>
                  <p className="vl-text-error vl-link-help">
                    Nicht weitergeben. Mit diesem Link kann die Abstimmung
                    verwaltet oder gelöscht werden.
                  </p>
                  <a href={result.links.adminUrl}>
                    {`${window.location.origin}${result.links.adminUrl}`}
                  </a>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <form
              id="create-poll-form"
              onSubmit={handleSubmit}
              className="vl-form"
            >
              <div>
                <div className="vl-form-grid">
                  <div>
                    <label className="vl-label">Dein Name</label>
                    <input
                      type="text"
                      value={creatorName}
                      onChange={(event) => setCreatorName(event.target.value)}
                      placeholder="Name"
                      required
                      className="vl-field"
                    />
                  </div>

                  <div>
                    <label className="vl-label">Deine E-Mail</label>
                    <input
                      type="email"
                      value={creatorEmail}
                      onChange={(event) => setCreatorEmail(event.target.value)}
                      placeholder="name@example.com"
                      required
                      className="vl-field"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="vl-label">Titel</label>
                <input
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Gib deiner Umfrage einen Titel"
                  required
                  className="vl-field"
                />
              </div>

              <div>
                <label className="vl-label">Beschreibung</label>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Optionaler Beschreibungstext"
                  className="vl-field vl-textarea"
                />
              </div>

              <div>
                <label className="vl-label">Laufzeit</label>
                <select
                  value={durationDays}
                  onChange={(event) =>
                    setDurationDays(Number(event.target.value))
                  }
                  className="vl-field"
                >
                  <option value={1}>1 Tag</option>
                  <option value={7}>1 Woche</option>
                  <option value={14}>2 Wochen</option>
                  <option value={28}>4 Wochen</option>
                </select>
              </div>

              <div className="vl-stack-sm">
                <label className="vl-checkbox-card">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(event) => setIsAnonymous(event.target.checked)}
                  />
                  Anonyme Abstimmung
                </label>

                <label className="vl-checkbox-card">
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
                <h3 className="vl-section-title">
                  Optionen
                </h3>
                <p className="vl-caption vl-caption-tight">
                  Kostenlose Abstimmungen können bis zu{" "}
                  {FREE_POLL_OPTION_LIMIT} Optionen enthalten.
                </p>

                <div className="vl-stack-sm">
                  {options.map((option, index) => (
                    <div
                      key={index}
                      className="vl-option-row"
                    >
                      <input
                        type="text"
                        value={option}
                        onChange={(event) =>
                          handleOptionChange(index, event.target.value)
                        }
                        placeholder={`Option ${index + 1}`}
                        className="vl-field vl-option-field"
                      />

                      <button
                        type="button"
                        onClick={() => removeOption(index)}
                        disabled={options.length <= 2}
                        className="vl-button vl-button-secondary"
                      >
                        Entfernen
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addOption}
                  disabled={options.length >= FREE_POLL_OPTION_LIMIT}
                  className="vl-button vl-button-secondary vl-button-spaced"
                >
                  {options.length >= FREE_POLL_OPTION_LIMIT
                    ? "Maximale Optionen erreicht"
                    : "Option hinzufügen"}
                </button>
              </div>

              <label className="vl-checkbox-card vl-terms-check">
                <input
                  type="checkbox"
                  checked={hasAcceptedRules}
                  onChange={(event) =>
                    setHasAcceptedRules(event.target.checked)
                  }
                  required
                />
                Ich akzeptiere die AGB.
              </label>
            </form>

            <div className="vl-panel-footer">
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
              <div className="vl-error-panel">
                <p className="vl-text-error vl-text-center">
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
