import { useState } from "react";

const legalInfo = {
  operatorName:
    import.meta.env.VITE_LEGAL_OPERATOR_NAME || "Betreiberangaben fehlen",
  operatorAddress:
    import.meta.env.VITE_LEGAL_OPERATOR_ADDRESS ||
    "Bitte VITE_LEGAL_OPERATOR_ADDRESS konfigurieren.",
  operatorEmail:
    import.meta.env.VITE_LEGAL_OPERATOR_EMAIL ||
    "Bitte VITE_LEGAL_OPERATOR_EMAIL konfigurieren.",
  retentionDays: import.meta.env.VITE_LEGAL_RETENTION_DAYS || "14",
};

function LegalModal({ type, onClose }) {
  const isPrivacy = type === "privacy";
  const title = isPrivacy ? "Datenschutz" : "Impressum";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-info-title"
      onClick={onClose}
      className="vl-modal-backdrop"
    >
      <div onClick={(event) => event.stopPropagation()} className="vl-modal">
        <div className="vl-modal-header">
          <h2 id="legal-info-title">{title}</h2>
        </div>

        <div className="vl-modal-body">
          {isPrivacy ? (
            <>
              <p>
                Verantwortlich für diese Anwendung:{" "}
                <strong>{legalInfo.operatorName}</strong>
              </p>
              <p>Kontakt: {legalInfo.operatorEmail}</p>
              <p>
                Beim Erstellen einer Abstimmung speichert VoteLink Titel,
                Beschreibung, Optionen, Laufzeit, Einstellungen zur Teilnahme
                sowie E-Mail-Adresse und Namen des Erstellers. Die
                E-Mail-Adresse wird für die Zustellung der Links und als
                Kontaktadresse für Rückfragen verwendet.
              </p>
              <p>
                Zur Erschwerung von Mehrfachabstimmungen erzeugt der Browser pro
                Abstimmung einen zufälligen Teilnahme-Token. Auf dem Server wird
                nur ein Hash dieses Tokens gespeichert.
              </p>
              <p>
                Bei anonymen Abstimmungen wird kein Teilnehmername abgefragt.
                Bei nicht anonymen Abstimmungen wird der eingegebene Name
                gespeichert und im Adminbereich angezeigt.
              </p>
              <p>
                In der kostenlosen Version sind bis zu 6 Optionen und 20
                Teilnehmer möglich. Danach nimmt die Abstimmung keine weiteren
                Antworten entgegen.
              </p>
              <p>
                Abgelaufene Free-Abstimmungen werden nach{" "}
                {legalInfo.retentionDays} Tagen automatisch gelöscht.
                Der Ersteller kann eine Abstimmung über den Admin-Link auch
                vorher dauerhaft löschen.
              </p>
            </>
          ) : (
            <>
              <p>
                <strong>{legalInfo.operatorName}</strong>
              </p>
              <p>{legalInfo.operatorAddress}</p>
              <p>Kontakt: {legalInfo.operatorEmail}</p>
              <p>
                Plattform: VoteLink, Webanwendung zum Erstellen, Teilen und
                Auswerten einfacher Online-Abstimmungen.
              </p>
            </>
          )}
        </div>

        <div className="vl-modal-footer">
          <button type="button" onClick={onClose} className="vl-button">
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
}

export function LegalInfo() {
  const [activeModal, setActiveModal] = useState(null);

  return (
    <>
      <div className="vl-legal-dock" aria-label="Rechtliche Informationen">
        <button
          type="button"
          onClick={() => setActiveModal("privacy")}
          className="vl-info-circle"
          aria-label="Datenschutz anzeigen"
          title="Datenschutz"
        >
          i
        </button>
        <button
          type="button"
          onClick={() => setActiveModal("imprint")}
          className="vl-info-circle"
          aria-label="Impressum anzeigen"
          title="Impressum"
        >
          §
        </button>
      </div>

      {activeModal && (
        <LegalModal type={activeModal} onClose={() => setActiveModal(null)} />
      )}
    </>
  );
}
