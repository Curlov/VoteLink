import { Link } from "react-router-dom";
import { LegalInfo } from "../components/LegalInfo";

export function ProCreatePage() {
  return (
    <main>
      <section className="vl-panel">
        <div className="vl-panel-header">
          <div className="vl-panel-header-row">
            <h2 className="vl-panel-title">Pro-Umfragen</h2>
          </div>
          <p className="vl-panel-intro">
            Pro-Umfragen sind demnächst verfügbar.
          </p>
          <div className="vl-header-legal">
            <LegalInfo />
          </div>
        </div>

        <div className="vl-panel-body">
          <p className="vl-text-muted">
            Geplant sind umfangreichere Abstimmungen mit mehreren Fragen und
            erweiterten Möglichkeiten. Die kostenlose Erstellung bleibt
            weiterhin verfügbar.
          </p>
          <div>
            <Link to="/create" className="vl-button vl-button-link">
              Kostenlose Umfrage erstellen
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
