import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { activatePoll } from "../api/pollsApi";

export function ActivatePollPage() {
  const { activationToken } = useParams();
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const activatedTokenRef = useRef(null);

  useEffect(() => {
    if (activatedTokenRef.current === activationToken) {
      return;
    }

    activatedTokenRef.current = activationToken;

    async function activate() {
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

    activate();
  }, [activationToken]);

  async function handleRetry() {
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
          <h2>Abstimmung freischalten</h2>
        </div>

        <div className="vl-panel-body">
          {isLoading && (
            <p className="vl-text-muted">
              Die Abstimmung wird freigeschaltet...
            </p>
          )}

          {!isLoading && error && (
            <>
              <p className="vl-text-error">Fehler: {error}</p>
              <p className="vl-text-muted">
                Bitte versuche es erneut oder öffne den Aktivierungslink aus
                deiner E-Mail noch einmal.
              </p>
              <button
                type="button"
                onClick={handleRetry}
                className="vl-button"
              >
                Erneut versuchen
              </button>
            </>
          )}

          {!isLoading && result && (
            <>
              <h3 style={{ margin: 0 }}>
                Vielen Dank, Ihre Umfrage ist jetzt freigeschaltet.
              </h3>
              <p className="vl-text-muted">
                Über die Links in Ihrer E-Mail können Sie Ihre Umfrage jetzt
                erreichen oder teilen.
              </p>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
