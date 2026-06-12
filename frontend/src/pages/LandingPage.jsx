import { Link } from "react-router-dom";
import { LegalInfo } from "../components/LegalInfo";
import heroImage from "../assets/hero.png";

const benefits = [
  "Abstimmung erstellen und Link teilen",
  "Teilnehmer stimmen ohne Account ab",
  "Ergebnisse einfach einsehen und weitergeben",
];

export function LandingPage() {
  return (
    <main className="vl-landing">
      <section className="vl-landing-hero">
        <div className="vl-header-legal">
          <LegalInfo />
        </div>

        <div className="vl-landing-copy">
          <p className="vl-landing-kicker">VoteLink</p>
          <h1>Einfache Online-Abstimmungen in wenigen Sekunden</h1>
          <p className="vl-landing-intro">
            Mit VoteLink erstellst du schnell eine Abstimmung, teilst den Link
            und sammelst Antworten ohne Registrierung der Teilnehmer.
          </p>
        </div>

        <img
          src={heroImage}
          alt=""
          aria-hidden="true"
          className="vl-landing-visual"
        />
      </section>

      <section className="vl-landing-grid" aria-label="VoteLink starten">
        <article className="vl-landing-card">
          <div>
            <p className="vl-landing-card-label">Free</p>
            <h2>Kostenlos starten</h2>
            <p>
              Ideal für einfache Abstimmungen mit wenigen Teilnehmern.
            </p>
          </div>
          <Link to="/create" className="vl-button vl-button-link vl-button-large">
            Kostenlose Umfrage erstellen
          </Link>
        </article>

        <article className="vl-landing-card">
          <div>
            <p className="vl-landing-card-label">Pro</p>
            <h2>Pro-Umfrage</h2>
            <p>
              Für umfangreichere Abstimmungen mit mehreren Fragen und
              erweiterten Möglichkeiten.
            </p>
          </div>
          <Link
            to="/create/pro"
            className="vl-button vl-button-secondary vl-button-link vl-button-large"
          >
            Pro-Umfrage erstellen
          </Link>
        </article>
      </section>

      <section className="vl-landing-benefits" aria-label="Vorteile">
        {benefits.map((benefit) => (
          <div key={benefit} className="vl-landing-benefit">
            <span aria-hidden="true">✓</span>
            <p>{benefit}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
