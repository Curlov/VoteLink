# voteLink

**voteLink** ist eine Webanwendung zum Erstellen, Teilen und Auswerten von einfachen Online-Abstimmungen.

Die Idee hinter voteLink ist, Abstimmungen möglichst schnell und unkompliziert nutzbar zu machen: Eine Frage erstellen, Antwortmöglichkeiten hinzufügen, Link teilen und Ergebnisse übersichtlich anzeigen lassen.

## Projektidee

Viele Abstimmungen im Alltag laufen über Messenger, E-Mails oder Gruppenchats. Das ist oft unübersichtlich, unverbindlich und schwer auszuwerten.

voteLink soll genau dieses Problem lösen:

- einfache Abstimmungen erstellen
- Link per Messenger, E-Mail oder Social Media teilen
- Teilnehmer stimmen direkt über den Link ab
- Ergebnisse werden grafisch dargestellt
- spätere Erweiterung um personalisierte Umfragen und Pro-Funktionen möglich

## Geplante Funktionen

### Abstimmungen erstellen

Benutzer sollen eine neue Abstimmung mit folgenden Daten anlegen können:

- Titel oder Frage der Abstimmung
- mehrere Antwortmöglichkeiten
- optional eine Beschreibung
- optional ein Banner oder Bild zur Personalisierung
- optional Design-Anpassungen

### Abstimmungen teilen

Nach dem Erstellen einer Abstimmung soll ein eindeutiger Link erzeugt werden.

Dieser Link kann z. B. geteilt werden über:

- WhatsApp
- Telegram
- Signal
- E-Mail
- Social Media
- Webseiten

### Abstimmen

Teilnehmer können über den Link an der Abstimmung teilnehmen.

Mögliche spätere Optionen:

- einfache Abstimmung ohne Account
- Begrenzung auf eine Stimme pro Teilnehmer
- Schutz vor Mehrfachabstimmungen
- anonyme oder nachvollziehbare Abstimmungen
- zeitlich begrenzte Abstimmungen

### Ergebnisdarstellung

Die Ergebnisse sollen optisch ansprechend dargestellt werden.

Aktueller Fokus liegt auf einer grafischen Darstellung mit Balken, Prozentwerten und klarer Null-Linie.

Geplant sind später eventuell verschiedene Darstellungsarten:

- Balkendiagramm
- Kreisdiagramm
- kompakte Ergebnisvorschau
- eingebettete Ergebnisgrafik für Nachrichten oder Webseiten

## Monetarisierungsidee

voteLink soll grundsätzlich einfach nutzbar bleiben.

Eine mögliche Struktur:

### Free-Version

- kostenlose Abstimmungen
- begrenzte Teilnehmerzahl, z. B. bis 20 Personen
- einfache Ergebnisdarstellung
- Basis-Design

### Pro-Abstimmung

- einmalige Zahlung pro Abstimmung
- z. B. 1 € pro Pro-Abfrage
- mehr Teilnehmer
- bessere Personalisierung
- erweiterte Ergebnisdarstellung
- optional Branding entfernen
- eventuell Exportfunktionen

Ziel ist ein sehr einfaches Bezahlmodell ohne komplizierte Abos.

## Technischer Stand

Das Projekt befindet sich aktuell in einer frühen Entwicklungsphase.

Bisheriger Fokus:

- Entwicklung der Grundidee
- Gestaltung der Ergebnisanzeige
- erste UI-Experimente mit Balkendiagramm
- Überlegungen zu Sharing, Einbettung und Monetarisierung
- Vorbereitung für eine strukturierte Weiterentwicklung über Git und Codex

## Entwicklung

Backend starten:

```bash
cd backend
npm install
npm run migrate
npm start
```

Frontend starten:

```bash
cd frontend
npm install
npm run dev
```

Die Backend-Konfiguration liegt in `backend/.env`. Eine Vorlage gibt es in
`backend/.env.example`. Die Frontend-API-URL kann über
`frontend/.env` gesetzt werden:

```bash
VITE_API_BASE_URL=http://localhost:3000/api
```

Wenn SMTP konfiguriert ist, sendet das Backend dem Ersteller nach dem Anlegen
einer Abstimmung eine E-Mail mit öffentlichem Link und Admin-Link:

```bash
NODE_ENV=production
PUBLIC_APP_URL=https://example.com
CORS_ORIGIN=https://example.com
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASSWORD=...
MAIL_FROM=VoteLink <no-reply@example.com>
```

`PUBLIC_APP_URL` muss in Produktion auf die öffentliche Frontend-URL zeigen,
damit E-Mails absolute Links enthalten. `CORS_ORIGIN` sollte in Produktion auf
die erlaubte Frontend-Origin eingeschränkt werden, z. B.
`https://example.com`. In `NODE_ENV=production` startet das Backend ohne
gesetztes `CORS_ORIGIN` nicht. Ohne `CORS_ORIGIN` bleibt CORS nur für lokale
Entwicklung offen.

Das Frontend zeigt Impressum und Datenschutzhinweise als überlagernde Fenster
an. Die Betreiberangaben werden über Frontend-Umgebungsvariablen gesetzt:

```bash
VITE_LEGAL_OPERATOR_NAME="VoteLink Betreiber"
VITE_LEGAL_OPERATOR_ADDRESS="Straße Hausnummer, PLZ Ort"
VITE_LEGAL_OPERATOR_EMAIL=kontakt@example.com
VITE_LEGAL_RETENTION_DAYS=14
```

Migrationen aktualisieren die Datenbankstruktur reproduzierbar:

```bash
cd backend
npm run migrate
```

Abgelaufene Free-Umfragen werden nach der Aufbewahrungsfrist gelöscht:

```bash
cd backend
npm run cleanup:expired
```

Die Frist wird über `FREE_POLL_RETENTION_DAYS` gesteuert und beträgt standardmäßig
14 Tage nach Ablauf der Umfrage.

### Produktionsgrundlage

Ein minimaler Produktionsablauf sieht aktuell so aus:

```bash
cd backend
npm ci
npm run migrate
npm start

cd ../frontend
npm ci
npm run build
```

Das Frontend-Build-Ergebnis liegt in `frontend/dist` und kann statisch
ausgeliefert werden. `VITE_API_BASE_URL` muss dabei auf die erreichbare
Backend-API zeigen, z. B. `https://api.example.com/api` oder bei gleicher
Domain `/api`.

Aktuelle Free-Limits:

- maximal 6 Optionen pro Abstimmung
- maximal 20 Teilnehmer pro Abstimmung
- automatische Löschung 14 Tage nach Ablauf, gesteuert über
  `FREE_POLL_RETENTION_DAYS`

Vor einem echten Deployment sollten diese Punkte final geprüft werden:

- PostgreSQL-Datenbank, Migrationen und Backup-Strategie
- `PUBLIC_APP_URL`, `CORS_ORIGIN` und `VITE_API_BASE_URL`
- `HOST`/`PORT` passend zur Zielumgebung, lokal z. B. `127.0.0.1:3000`
- echte Impressums- und Kontaktangaben über `VITE_LEGAL_*`
- SMTP-Zugang und Absenderadresse
- regelmäßiger Lauf von `npm run cleanup:expired`
- HTTPS/TLS, Reverse Proxy und Prozessverwaltung

### Datenschutz und Transparenz

voteLink speichert beim Erstellen einer Abstimmung die E-Mail-Adresse des
Erstellers sowie dessen Namen, Titel, Beschreibung, Optionen, Laufzeit und
Teilnahmeeinstellungen. Die E-Mail-Adresse wird für die Zustellung von
öffentlichem Link und Admin-Link sowie als Kontaktadresse für Rückfragen
verwendet. Der Admin-Link ist ein geheimer Verwaltungslink und sollte nicht
weitergegeben werden.

Zur Erschwerung von Mehrfachabstimmungen erzeugt das Frontend pro Abstimmung
einen zufälligen Teilnahme-Token im Browser. Auf dem Server wird nur ein Hash
dieses Tokens gespeichert. Bei nicht anonymen Abstimmungen wird zusätzlich der
vom Teilnehmer eingegebene Name gespeichert und im Adminbereich angezeigt.

Die Free-Version begrenzt Abstimmungen aktuell auf maximal 6 Optionen und 20
Teilnehmer. Wird das Teilnehmerlimit erreicht, bleibt die Abstimmung sichtbar,
nimmt aber keine weiteren Antworten mehr entgegen.

Abgelaufene Free-Abstimmungen werden nach der konfigurierten Aufbewahrungsfrist
gelöscht. Dieser Abschnitt ist ein Produkt- und Transparenztext, keine
finale juristische Datenschutzerklärung.

## Aktuelle Design-Idee

Die Ergebnisdarstellung soll nicht wie ein trockenes Standarddiagramm wirken, sondern modern, klar und visuell ansprechend sein.

Ein aktueller Ansatz:

- horizontale Null-Linie über die gesamte Diagrammbreite
- Balken wachsen nach unten
- Prozent-Boxen schließen direkt an die Balken an
- Balken und Prozentfelder wirken optisch wie eine Einheit
- Farben sollen anpassbar sein
- spätere Personalisierung durch Banner oder Bild möglich

## Mögliche spätere Erweiterungen

- Benutzerkonten
- Dashboard für eigene Abstimmungen
- Ablaufdatum für Abstimmungen
- private und öffentliche Abstimmungen
- QR-Code für Abstimmungslinks
- Einbettung in Webseiten
- Ergebnisvorschau für Messenger
- Export als Bild oder PDF
- Admin-Link zum Bearbeiten einer Abstimmung
- Manipulationsschutz
- DSGVO-konforme Datenschutzeinstellungen
- Zahlungsintegration
- individuelle Designs
- eigene Logos oder Banner

## Zielgruppe

voteLink richtet sich an Personen und Gruppen, die schnell und unkompliziert Entscheidungen treffen oder Meinungen einholen möchten.

Mögliche Einsatzbereiche:

- Freundesgruppen
- Vereine
- kleine Communities
- Teams
- Veranstaltungen
- kleine Unternehmen
- Social-Media-Umfragen
- private Planungen

## Projektziel

Das Ziel von voteLink ist eine einfache, schöne und verbindlichere Alternative zu chaotischen Abstimmungen in Chats.

Der Nutzer soll ohne technische Hürde eine Abstimmung erstellen können, die professionell aussieht, leicht teilbar ist und verständliche Ergebnisse liefert.

## Status

🚧 **Work in Progress**

Das Projekt befindet sich noch im Aufbau. Struktur, Funktionen und Design werden aktuell weiterentwickelt.
