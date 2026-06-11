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

function LegalModal({ activeTab, onTabChange, onClose }) {
  const type = activeTab;
  const isPrivacy = type === "privacy";
  const isTerms = type === "terms";
  const title = isPrivacy ? "Datenschutz" : isTerms ? "AGB" : "Impressum";
  const tabs = [
    { id: "privacy", label: "Datenschutz" },
    { id: "imprint", label: "Impressum" },
    { id: "terms", label: "AGB" },
  ];

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
          <div className="vl-modal-tabs" aria-label="Rechtliche Inhalte">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`vl-button ${
                  activeTab === tab.id ? "" : "vl-button-secondary"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
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
                sowie E-Mail-Adresse, Namen und IP-Adresse des Erstellers. Die
                E-Mail-Adresse wird für die Aktivierung, Zustellung der Links
                und als Kontaktadresse für Rückfragen verwendet.
              </p>
              <p>
                Die IP-Adresse des Erstellers wird zur Missbrauchsverfolgung
                für maximal ein Jahr gespeichert und danach gelöscht oder
                anonymisiert.
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
              <p>
                Meldungen zu Abstimmungen werden mit E-Mail-Adresse, Grund,
                optionalen Details, Zeitpunkt und IP-Adresse des Meldenden
                gespeichert, damit der Vorgang geprüft werden kann.
              </p>
            </>
          ) : isTerms ? (
            <>
              <p>
                Ersteller sind für Titel, Beschreibung, Optionen und sonstige
                Inhalte ihrer Abstimmungen selbst verantwortlich. VoteLink
                distanziert sich von nutzergenerierten Inhalten und macht sich
                diese nicht zu eigen.
              </p>
              <p>
                Beim Erstellen und Teilen von Abstimmungen ist geltendes Recht
                einzuhalten. Unzulässig sind insbesondere rechtswidrige,
                beleidigende, fremdenfeindliche, rassistische,
                antisemitische, sexistische, diskriminierende, gewaltverherrlichende,
                bedrohende, belästigende, pornografische, jugendgefährdende,
                irreführende oder persönlichkeitsrechtsverletzende Inhalte.
              </p>
              <p>
                Verboten sind außerdem Inhalte, die zu Straftaten aufrufen,
                Rechte Dritter verletzen, personenbezogene Daten ohne
                Rechtsgrundlage offenlegen, Spam darstellen oder VoteLink
                technisch missbrauchen.
              </p>
              <p>
                VoteLink kann gemeldete oder auffällige Abstimmungen prüfen,
                sperren, deaktivieren oder löschen. Bei schweren Verstößen
                können vorhandene Kontakt- und Protokolldaten zur
                Rechtsverfolgung genutzt werden.
              </p>
              <p>
                Abstimmungen können über den Meldebutton in der Abstimmung
                gemeldet werden. Für Rückfragen ist eine E-Mail-Adresse
                erforderlich.
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

export function LegalInfo({ actions = [] }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("privacy");

  return (
    <>
      <div className="vl-legal-dock" aria-label="Rechtliche Informationen">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={action.onClick}
            className="vl-header-action-button"
            aria-label={action.ariaLabel || action.label}
            title={action.title || action.label}
          >
            {action.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            setActiveTab("privacy");
            setIsModalOpen(true);
          }}
          className="vl-header-action-button"
          aria-label="Rechtliche Informationen anzeigen"
          title="Rechtliche Informationen"
        >
          i
        </button>
      </div>

      {isModalOpen && (
        <LegalModal
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
}
