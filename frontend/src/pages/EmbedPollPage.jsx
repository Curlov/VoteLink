import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getPollResults } from "../api/pollsApi";

const DESCRIPTION_LIMIT = 140;
const OPTION_LIMIT = 5;

function getTruncatedDescription(description) {
  const trimmedDescription = String(description || "").trim();

  if (trimmedDescription.length <= DESCRIPTION_LIMIT) {
    return trimmedDescription;
  }

  return `${trimmedDescription.slice(0, DESCRIPTION_LIMIT - 1).trim()}...`;
}

function getTopOptions(options = []) {
  return [...options]
    .sort((firstOption, secondOption) => {
      if (secondOption.voteCount !== firstOption.voteCount) {
        return secondOption.voteCount - firstOption.voteCount;
      }

      return firstOption.position - secondOption.position;
    })
    .slice(0, OPTION_LIMIT);
}

export function EmbedPollPage() {
  const { publicId } = useParams();
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadEmbedPoll() {
      try {
        setError("");
        setIsLoading(true);

        const response = await getPollResults(publicId);
        setResults(response.results);
      } catch (err) {
        setResults(null);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    loadEmbedPoll();
  }, [publicId]);

  if (isLoading) {
    return (
      <main className="vl-embed-page">
        <section className="vl-embed-card vl-embed-state">
          <p>Abstimmung wird geladen...</p>
        </section>
      </main>
    );
  }

  if (error || !results) {
    return (
      <main className="vl-embed-page">
        <section className="vl-embed-card vl-embed-state">
          <strong>Abstimmung nicht verfügbar</strong>
          <p>Diese Abstimmung kann nicht eingebettet angezeigt werden.</p>
        </section>
      </main>
    );
  }

  const description = getTruncatedDescription(results.description);
  const topOptions = getTopOptions(results.options);
  const voteLabel = results.allowMultipleVotes ? "Auswahlen" : "Stimmen";
  const pollUrl = `/p/${results.publicId}`;
  const appHost = window.location.host || "votelink.de";

  return (
    <main className="vl-embed-page">
      <section className="vl-embed-card" aria-label="Eingebettete Abstimmung">
        <div className="vl-embed-header">
          <div>
            <p className="vl-embed-kicker">VoteLink</p>
            <h1 className="vl-embed-title">{results.title}</h1>
          </div>
          <span className="vl-embed-status">
            {results.status === "expired" ? "Beendet" : "Live"}
          </span>
        </div>

        {description && (
          <p className="vl-embed-description">{description}</p>
        )}

        <div className="vl-embed-summary">
          <strong>Teilnehmer: {results.totalVoters}/{results.maxVoters}</strong>
          {results.allowMultipleVotes && (
            <span>{results.totalVotes} {voteLabel}</span>
          )}
        </div>

        <div className="vl-embed-results">
          {topOptions.map((option) => (
            <div key={option.id} className="vl-embed-option">
              <div className="vl-embed-option-row">
                <span>{option.text}</span>
                <strong>
                  {option.voteCount} · {option.percentage}%
                </strong>
              </div>
              <div className="vl-embed-progress-track">
                <div
                  className="vl-embed-progress-fill"
                  style={{ "--progress-width": `${option.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="vl-embed-footer">
          <a className="vl-button vl-button-link" href={pollUrl} target="_blank" rel="noreferrer">
            Jetzt abstimmen
          </a>
          <span>{appHost}</span>
        </div>
      </section>
    </main>
  );
}
