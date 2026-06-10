import { useState } from "react";
import { useParams } from "react-router-dom";
import { activatePoll } from "../api/pollsApi";

export function ActivatePollPage() {
  const { activationToken } = useParams();
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleActivate() {
    try {
      setError("");
      setIsLoading(true);
      const response = await activatePoll(activationToken);
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
          <h2>Abstimmung aktivieren</h2>
        </div>

        <div className="vl-panel-body">
          {!result && (
            <>
              <p style={{ color: "#555" }}>
                Bestätige deine E-Mail-Adresse, um die Abstimmung öffentlich
                freizuschalten.
              </p>
              <button
                type="button"
                onClick={handleActivate}
                disabled={isLoading}
                className="vl-button"
              >
                {isLoading ? "Aktiviere..." : "Abstimmung aktivieren"}
              </button>
            </>
          )}

          {error && <p style={{ color: "#991b1b" }}>Fehler: {error}</p>}

          {result && (
            <>
              <h3 style={{ margin: 0 }}>{result.message}</h3>
              <p style={{ color: "#555" }}>
                Die Abstimmung ist jetzt öffentlich erreichbar.
              </p>
              <p>
                <a href={result.links.publicUrl}>Zur Abstimmung</a>
              </p>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
