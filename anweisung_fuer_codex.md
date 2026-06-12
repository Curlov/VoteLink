Du arbeitest an meinem Projekt VoteLink.

Wichtig:

* README kann veraltet sein.
* Orientiere dich am tatsaechlichen Code.
* Bestehende Architektur beibehalten:
  * Backend: routes -> controllers -> models -> PostgreSQL
  * Frontend: pages -> api/pollsApi.js -> Backend
* Bitte keine grossen Architektur-Rewrites.
* Keine bestehenden Features entfernen.
* Keine Secrets in Code oder Frontend schreiben.
* Keine echten .env-Dateien anfassen.
* Änderungen bitte in kleinen, nachvollziehbaren Schritten machen.
* Bestehende API-Responses abwaertskompatibel erweitern, nicht abrupt brechen.
* Nach jeder Phase bitte geänderte Dateien, Erklärung und Testschritte nennen.

# Aktueller Stand

## Produkt und Routing

* `/` ist eine neue Landingpage.
* `/create` ist die bisherige kostenlose Umfrage-Erstellung.
* `/create/pro` ist ein Platzhalter fuer Pro-Umfragen.
* Bestehende Public-Routen funktionieren weiter:
  * `/p/:publicId`
  * `/poll/:publicId`
* Die Embed-Route existiert:
  * `/embed/:publicId`
* Admin-Routen und API-Routen sollen weiter unveraendert erreichbar bleiben.

## Frontend

* `LandingPage.jsx` erklaert VoteLink kurz und fuehrt zu Free- oder Pro-Erstellung.
* `ProCreatePage.jsx` zeigt vorerst nur, dass Pro-Umfragen demnaechst verfuegbar sind.
* `CreatePollPage` bleibt der kostenlose Single-Question-Erstellungsflow.
* Nach erfolgreichem Mailversand zeigt `CreatePollPage` Links nicht immer sofort an. Das passt zum spaeter geplanten E-Mail-Verifizierungsflow.
* Bei fehlender Mailkonfiguration/lokalem Fallback koennen Links angezeigt werden.
* `AdminPollPage` hat einen klaren Abschnitt "Teilen & Einbetten" mit:
  * oeffentlichem Abstimmungslink
  * Button "Link kopieren"
  * Button/Link "Umfrage oeffnen"
  * iframe-Embed-Code
  * Button "Einbettungscode kopieren"
  * Link zur Embed-Seite `/embed/:publicId`
  * Copy-Feedback "Kopiert"
* `AdminPollPage` zeigt den Admin-Link weiterhin an.
* `EmbedPollPage` existiert und zeigt eine kompakte einbettbare Poll-/Ergebnisansicht.
* `VotePage` hat einen kleinen "Teilen"-Button, der den aktuellen Poll-Link kopiert.

## Backend und Datenmodell

* `polls` ist weiterhin die Umfrage selbst.
* `poll_options` gehoert historisch direkt zur Poll.
* `poll_participations` bleibt pollweit.
* `votes` speichert weiterhin Stimmen ueber `option_id`.
* `poll_questions` wurde additiv eingefuehrt.
* Bestehende Polls haben genau eine Default-Frage.
* Neue Polls erzeugen ebenfalls eine Default-Frage.
* `poll_options.question_id` ist gesetzt und `NOT NULL`.
* Bestehende Single-Question-Polls funktionieren weiterhin.
* Public-, Admin- und Results-Responses liefern zusaetzlich ein `questions`-Array.
* Alte `options`-Felder bleiben fuer Kompatibilitaet erhalten.
* Die Voting-API unterstuetzt weiterhin alte Payloads:
  * `{ "optionId": 10, "voterName": "...", "voterToken": "..." }`
  * `{ "optionIds": [10, 11], "voterName": "...", "voterToken": "..." }`
* Die Voting-API unterstuetzt zusaetzlich die neue vorbereitete Multi-Frage-Payload:
  * `{ "answers": [{ "questionId": 1, "optionIds": [10] }] }`
* Intern werden alte Voting-Payloads in `answers` normalisiert.
* `allowMultipleVotes` gilt bei der neuen Payload pro Frage.
* Votes werden weiterhin als eine Zeile pro `option_id` gespeichert.

## Serverseitige Meta-Tags

* VoteLink soll fuer Poll-Links serverseitig dynamische Meta-Tags liefern.
* Ziel ist, dass Links wie `/poll/:publicId` oder die aktuell genutzte Poll-Route bereits vor dem React-Start passende Meta-Tags enthalten.
* Das soll im Node/Express-Backend passieren, nicht nur clientseitig in React.
* Caddy soll in Produktion auf den Express-Server reverse-proxyen, damit Express die HTML-Antworten erzeugen kann.
* Bestehende SPA-Funktionalitaet darf dadurch nicht brechen.

# Wichtige technische Regeln

* Keine echte Pro-Abrechnung implementieren.
* Keine Multi-Frage-UI bauen, bis explizit angefragt.
* Keine bestehende Single-Question-Erstellung kaputt machen.
* Keine alten API-Felder entfernen.
* Keine Admin-, Activation- oder Mail-Tokens in Meta-Tags, Links oder Vorschauen leaken.
* Inhalte aus der Datenbank muessen bei HTML-/Meta-Ausgabe escaped werden.
* Bestehende Tests muessen gruen bleiben.

# Offene Punkte

## 1. Serverseitige Meta-Tags final pruefen und absichern

Noch einmal konkret pruefen:

* Wie wird die React/Vite-SPA aktuell gebaut?
* Wie wird sie aktuell ausgeliefert?
* Liefert Express bereits `dist` aus?
* Welche Rolle spielt Caddy in Produktion?
* Welche konkrete Route ist fuer einzelne Polls kanonisch: `/p/:publicId`, `/poll/:publicId` oder beide?
* Welche Poll-Daten stehen fuer Titel, Beschreibung, Optionen und Ablaufdatum zur Verfuegung?

Ziel:

* Express soll fuer Poll-SPA-Routen `index.html` laden.
* Fuer Poll-Routen sollen vorher Poll-Daten aus der Datenbank geladen werden.
* Platzhalter in `index.html` sollen durch dynamische Meta-Tags ersetzt werden.
* Normale Assets wie JS, CSS und Bilder sollen weiterhin statisch ausgeliefert werden.
* Fallbacks fuer fehlende, pending, blocked oder unvollstaendige Polls einbauen.
* Caddy-Konfiguration dokumentieren: Produktion soll auf Express reverse-proxyen.

Mindestens benoetigte Tags:

* `<title>`
* `<meta name="description">`
* `<meta property="og:title">`
* `<meta property="og:description">`
* `<meta property="og:type">`
* `<meta property="og:url">`
* optional `<meta property="og:image">`
* `<meta name="twitter:card">`
* `<meta name="twitter:title">`
* `<meta name="twitter:description">`

## 2. Share-/Embed-UX weiter abrunden

Aktueller Stand ist gut genug fuer den Adminbereich. Noch offen:

* Optional Native Web Share API ergaenzen, wenn verfuegbar.
* Clipboard-Fallback fuer unsichere Browser-Kontexte pruefen.
* Optional Share-/Copy-Funktionen auch nach lokaler Fallback-Erstellung in `CreatePollPage` klarer darstellen.
* Embed-Code final auf Produktionsdomain und Konfiguration pruefen.
* Embed-Seite optisch und in kleinen iframe-Groessen weiter testen.

## 3. E-Mail-Verifizierungsflow spaeter sauber fertigstellen

Noch nicht umgesetzt:

* Kein kompletter E-Mail-Verifizierungsflow.
* Keine klare finale Produktentscheidung, wann Links direkt angezeigt werden und wann nur per Mail.
* Aktivierungs-/Admin-Link-Flow final pruefen.
* Sicherstellen, dass lokale Fallbacks und Produktion sauber getrennt bleiben.

## 4. Multi-Frage-Pro-Umfragen schrittweise weiter vorbereiten

Bereits vorbereitet:

* `poll_questions`
* `questions` in Responses
* neue `answers`-Voting-Payload
* Votes bleiben ueber `option_id`

Noch offen:

* Keine Multi-Frage-Erstellung im Frontend.
* Keine Multi-Frage-Erstellung im Backend-CreatePoll-API.
* Keine Admin-UI zum Bearbeiten mehrerer Fragen.
* Keine Public-Vote-UI fuer mehrere Fragen.
* Results-UI zeigt noch keine echte Multi-Frage-Ergebnisansicht.
* Pro-/Free-Limits und Berechtigungen sind noch nicht implementiert.

## 5. Tests und Qualitaet

Beim naechsten groesseren Backend-Schritt ausfuehren:

* Backend-Tests fuer Poll-API und Voting.
* Migrationstests, wenn Schema geaendert wird.
* Tests fuer alte und neue Voting-Payloads.
* Tests fuer Results mit `questions`.

Beim naechsten groesseren Frontend-Schritt ausfuehren:

* `npm run lint` im Frontend.
* `npm run build` im Frontend.
* Falls ein Dev-Server gebraucht wird: Seite lokal im Browser pruefen.

# Zuletzt ausgefuehrte Checks

Beim letzten Frontend-Schritt liefen erfolgreich:

* `npm run lint` im Frontend.
* `npm run build` im Frontend.
* `git diff --check`.

# Bekannte noch nicht committed Aenderungen

Der Arbeitsbaum kann noch uncommitted Aenderungen aus mehreren Phasen enthalten, unter anderem:

* Backend-Phase zu `poll_questions`, `questions`-Responses und `answers`-Voting-Payload.
* Frontend-Landingpage und Pro-Platzhalter.
* Share-/Copy-UX in `AdminPollPage`, `VotePage` und CSS.

Vor neuen Aenderungen bitte `git status --short` pruefen und keine fremden/unrelated Aenderungen zuruecksetzen.
