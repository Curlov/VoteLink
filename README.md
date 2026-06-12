# VoteLink

VoteLink ist eine Webanwendung zum Erstellen, Teilen, Einbetten und Auswerten einfacher Online-Abstimmungen.

Ersteller legen eine Umfrage an, erhalten einen öffentlichen Abstimmungslink und verwalten die Umfrage über einen geheimen Admin-Link. Teilnehmer können ohne Account abstimmen.

## Features

* öffentliche Abstimmungen ohne Teilnehmer-Account
* Adminbereich mit öffentlichem Link, Ergebnissen und Moderationsfunktionen
* Copy-Buttons für Abstimmungslink und iframe-Embed-Code
* kompakte Embed-Ansicht für iframes
* optionale E-Mail-Zustellung von öffentlichem Link und Admin-Link
* Free-Limits mit automatischer Bereinigung abgelaufener Polls
* vorbereitete Datenstruktur für spätere Multi-Frage-Polls
* konfigurierbare Impressums- und Datenschutzinformationen im Frontend

## Tech Stack

* Frontend: React, Vite, React Router
* Backend: Node.js, Express
* Datenbank: PostgreSQL
* E-Mail: Nodemailer per SMTP

Die Backend-Schichten folgen dieser Struktur:

```text
routes -> controllers -> models -> PostgreSQL
```

## Projektstruktur

```text
.
├── backend/      # Express API, Datenbankzugriff, Migrationen, Tests
├── frontend/     # React/Vite SPA
└── README.md
```

## Voraussetzungen

* Node.js und npm
* PostgreSQL
* SMTP-Zugang, falls E-Mails lokal oder in Produktion verschickt werden sollen

## Lokale Entwicklung

### Backend starten

```bash
cd backend
npm install
cp .env.example .env
npm run migrate
npm run dev
```

Alternativ ohne Watcher:

```bash
cd backend
npm start
```

### Frontend starten

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Das Frontend erwartet die API über `VITE_API_BASE_URL`, lokal zum Beispiel:

```bash
VITE_API_BASE_URL=http://localhost:3000/api
```

## Wichtige Routen

* `/` - Startseite
* `/create` - kostenlose Umfrage erstellen
* `/create/pro` - Platzhalter für spätere Pro-Umfragen
* `/p/:publicId` - öffentliche Abstimmungsseite
* `/poll/:publicId` - kompatible öffentliche Abstimmungsroute
* `/embed/:publicId` - kompakte Embed-Ansicht
* Admin-Routen für Verwaltung, Ergebnisse und Moderation

## Konfiguration

Die Backend-Konfiguration liegt in `backend/.env`. Eine Vorlage ist in `backend/.env.example` enthalten.

Wichtige Backend-Variablen:

```bash
NODE_ENV=production
PUBLIC_APP_URL=https://example.com
CORS_ORIGIN=https://example.com
DATABASE_URL=postgres://...
DB_SSL=true
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASSWORD=...
MAIL_FROM=VoteLink <no-reply@example.com>
```

Hinweise:

* `PUBLIC_APP_URL` muss in Produktion auf die öffentliche App-URL zeigen.
* `CORS_ORIGIN` sollte in Produktion auf die erlaubte Frontend-Origin eingeschränkt werden.
* In `NODE_ENV=production` startet das Backend ohne gesetztes `CORS_ORIGIN` nicht.
* Für gehostete PostgreSQL-Datenbanken kann `DATABASE_URL` genutzt werden.
* Falls der Datenbankanbieter SSL verlangt, `DB_SSL=true` setzen.

Wichtige Frontend-Variablen:

```bash
VITE_API_BASE_URL=https://example.com/api
VITE_LEGAL_OPERATOR_NAME="VoteLink Betreiber"
VITE_LEGAL_OPERATOR_ADDRESS="Straße Hausnummer, PLZ Ort"
VITE_LEGAL_OPERATOR_EMAIL=kontakt@example.com
VITE_LEGAL_RETENTION_DAYS=14
```

## Tests und Checks

Frontend:

```bash
cd frontend
npm run lint
npm run build
```

Backend:

```bash
cd backend
npm test
```

Datenbanknahe Backend-Tests:

```bash
cd backend
npm run test:db
```

Weitere Backend-Kommandos:

```bash
cd backend
npm run migrate
npm run cleanup:expired
```

## Datenmodell

Der aktuelle Kern besteht aus:

* `polls` - Umfrage
* `poll_questions` - vorbereitete Fragenstruktur für spätere Multi-Frage-Polls
* `poll_options` - Antwortoptionen mit `question_id`
* `poll_participations` - pollweite Teilnahmebegrenzung
* `votes` - Stimmen über `option_id`

Bestehende Single-Question-Polls bleiben kompatibel. Jede bestehende und neue Poll hat aktuell eine Default-Frage.

Public-, Admin- und Results-Responses enthalten weiterhin die alten `options`-Felder und zusätzlich ein abwärtskompatibles `questions`-Array.

Die Voting-API unterstützt alte Payloads weiter:

```json
{ "optionId": 10, "voterName": "Thomas", "voterToken": "..." }
```

```json
{ "optionIds": [10, 11], "voterName": "Thomas", "voterToken": "..." }
```

Zusätzlich ist eine neue vorbereitete Payload möglich:

```json
{
  "answers": [
    { "questionId": 1, "optionIds": [10] }
  ],
  "voterName": "Thomas",
  "voterToken": "..."
}
```

Intern werden alte Payloads in `answers` normalisiert. Votes werden weiterhin über `option_id` gespeichert.

## Free-Limits

Aktuelle Free-Limits:

* maximal 6 Optionen pro Abstimmung
* maximal 20 Teilnehmer pro Abstimmung
* automatische Löschung nach Ablauf plus Aufbewahrungsfrist

Die Aufbewahrungsfrist wird über `FREE_POLL_RETENTION_DAYS` gesteuert und beträgt standardmäßig 14 Tage nach Ablauf der Umfrage.

## Produktion

Backend:

```bash
cd backend
npm ci
npm run migrate
npm start
```

Frontend:

```bash
cd frontend
npm ci
npm run build
```

Das Frontend-Build-Ergebnis liegt in `frontend/dist`.

Für dynamische serverseitige Meta-Tags sollte die gebaute SPA in Produktion über den Express-Server ausgeliefert werden. Caddy kann dafür auf den Express-Prozess reverse-proxyen:

```caddyfile
votelink.de {
  reverse_proxy 127.0.0.1:3000
}
```

Die finale Caddy-Konfiguration muss an Host, Port, TLS-Setup und Prozessmanager angepasst werden.

## Datenschutz und Transparenz

VoteLink speichert beim Erstellen einer Abstimmung die E-Mail-Adresse des Erstellers sowie Name, Titel, Beschreibung, Optionen, Laufzeit und Teilnahmeeinstellungen.

Die E-Mail-Adresse wird für die Zustellung von öffentlichem Link und Admin-Link sowie als Kontaktadresse für Rückfragen verwendet. Der Admin-Link ist ein geheimer Verwaltungslink und sollte nicht weitergegeben werden.

Zur Erschwerung von Mehrfachabstimmungen erzeugt das Frontend pro Poll einen zufälligen Teilnahme-Token im Browser. Auf dem Server wird nur ein Hash dieses Tokens gespeichert. Bei nicht anonymen Abstimmungen wird zusätzlich der vom Teilnehmer eingegebene Name gespeichert und im Adminbereich angezeigt.

Dieser Abschnitt ist ein Produkt- und Transparenztext, keine finale juristische Datenschutzerklärung.

## Roadmap

Kurzfristig:

* serverseitige dynamische Meta-Tags für Poll-Links final umsetzen und testen
* Express-Auslieferung der gebauten SPA und Caddy-Reverse-Proxy final absichern
* Embed-Ansicht in kleinen iframe-Größen weiter prüfen
* Clipboard-Fallbacks und optional Native Web Share API prüfen

Später:

* E-Mail-Verifizierungsflow finalisieren
* Multi-Frage-Erstellung für Pro-Polls bauen
* Multi-Frage-Voting-UI bauen
* Multi-Frage-Results-UI bauen
* Pro-/Free-Limits und Zahlungslogik definieren
* finale rechtliche Texte und Betreiberangaben einpflegen

## Mitwirken

Bitte bestehende Architektur und Kompatibilität beibehalten:

* keine großen Architektur-Rewrites
* keine bestehenden API-Felder entfernen
* Single-Question-Polls nicht brechen
* keine Secrets committen
* Änderungen klein und nachvollziehbar halten
