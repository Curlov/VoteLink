import { useState } from "react";
import { createPoll } from "../api/pollsApi";

export function CreatePollPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [allowMultipleVotes, setAllowMultipleVotes] = useState(false);
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
        isAnonymous,
        allowMultipleVotes,
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
      <h1>VoteLink</h1>
      <h2>Neue Abstimmung erstellen</h2>

      <form onSubmit={handleSubmit}>
        <div>
          <label>Titel</label>
          <br />
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Welche Projektidee soll ich zuerst bauen?"
          />
        </div>

        <div>
          <label>Beschreibung</label>
          <br />
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Optionaler Beschreibungstext"
          />
        </div>

        <div>
          <label>
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(event) => setIsAnonymous(event.target.checked)}
            />
            Anonyme Abstimmung
          </label>
        </div>

        <div>
          <label>
            <input
              type="checkbox"
              checked={allowMultipleVotes}
              onChange={(event) => setAllowMultipleVotes(event.target.checked)}
            />
            Mehrfachauswahl erlauben
          </label>
        </div>

        <h3>Optionen</h3>

        {options.map((option, index) => (
          <div key={index}>
            <input
              type="text"
              value={option}
              onChange={(event) =>
                handleOptionChange(index, event.target.value)
              }
              placeholder={`Option ${index + 1}`}
            />

            <button
              type="button"
              onClick={() => removeOption(index)}
              disabled={options.length <= 2}
            >
              Entfernen
            </button>
          </div>
        ))}

        <button type="button" onClick={addOption}>
          Option hinzufügen
        </button>

        <br />
        <br />

        <button type="submit" disabled={isLoading}>
          {isLoading ? "Wird erstellt..." : "Abstimmung erstellen"}
        </button>
      </form>

      {error && (
        <p style={{ color: "red" }}>
          Fehler: {error}
        </p>
      )}

      {result && (
        <section>
          <h3>Abstimmung wurde erstellt</h3>

          <p>Öffentlicher Link:</p>
            <a href={result.links.publicUrl}>
                {`${window.location.origin}${result.links.publicUrl}`}
            </a>

          <p>Admin-Link:</p>
          <a href={result.links.adminUrl}>
            {`${window.location.origin}${result.links.adminUrl}`}
          </a>
          
        </section>
      )}
    </main>
  );
}