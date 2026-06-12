Du arbeitest an meinem Projekt VoteLink.

Wichtig:

* README kann veraltet sein.
* Orientiere dich am tatsächlichen Code.
* Bestehende Architektur beibehalten:

  * Backend: routes -> controllers -> models -> PostgreSQL
  * Frontend: pages -> api/pollsApi.js -> Backend
* Bitte keine großen Architektur-Rewrites.
* Keine bestehenden Features entfernen.
* Keine Secrets in Code oder Frontend schreiben.
* Keine echten .env-Dateien anfassen.
* Änderungen bitte in kleinen, nachvollziehbaren Schritten machen.
* Nach jeder Phase bitte geänderte Dateien, Erklärung und Testschritte nennen.

Ziel:
VoteLink soll besser teilbar und einbettbar werden. Außerdem soll eine spätere Pro-Version vorbereitet werden, in der eine Umfrage mehrere Fragen enthalten kann.

Bitte arbeite in Phasen.

============================================================
PHASE 1: Analyse und technischer Plan, noch keinen Code ändern
==============================================================

Lies zuerst die relevanten Dateien:

Backend:

* backend/src/app.js
* backend/src/routes/polls.routes.js
* backend/src/controllers/polls.controller.js
* backend/src/models/poll.model.js
* backend/src/services/mail.service.js
* backend/src/utils/pollValidation.js
* backend/src/db/migrations/*

Frontend:

* frontend/src/App.jsx
* frontend/src/api/pollsApi.js
* frontend/src/pages/CreatePollPage.jsx
* frontend/src/pages/VotePage.jsx
* frontend/src/pages/AdminPollPage.jsx
* frontend/src/pages/OperatorAdminPage.jsx
* frontend/src/components/LegalInfo.jsx
* frontend/src/index.css
* frontend/src/App.css

Prüfe danach bitte:

1. Wie öffentliche Polls aktuell geladen werden.
2. Welche Daten die öffentliche Ergebnisansicht aktuell schon hat.
3. Welche Ergebnisdaten für eine Mini-Balkenansicht fehlen.
4. Wie ein Embed technisch am besten ergänzt werden kann.
5. Wie OpenGraph/Messenger-Vorschauen bei der aktuellen React/Vite-SPA sinnvoll umgesetzt werden können.
6. Welche Änderungen minimal nötig sind.
7. Welche Änderungen NICHT jetzt umgesetzt werden sollten.

Gib mir danach einen kurzen Plan mit:

* Phase 2: Embed/Mini-Ansicht
* Phase 3: OpenGraph/Messenger-Vorschau
* Phase 4: Vorbereitung Pro-Mehrfragen-Umfragen
* Risiken
* betroffene Dateien

Ändere in Phase 1 noch keinen Code.

============================================================
PHASE 2: Embed/Mini-Ansicht mit kleinem Balkendiagramm
======================================================

Ziel:
Eine öffentliche, einbettbare Mini-Version einer Poll soll entstehen.

Neue Frontend-Route:

* /embed/:publicId

Neue Datei nach Bedarf:

* frontend/src/pages/EmbedPollPage.jsx

Anforderungen:

* Die Embed-Seite soll Poll-Daten und Ergebnisse laden.
* Sie soll kompakt sein und in einem iframe gut funktionieren.
* Sie soll eine kleine Karte anzeigen:

  * Poll-Titel
  * optional kurze Beschreibung, wenn vorhanden und nicht zu lang
  * Top-Optionen mit kleinen horizontalen Balken
  * Prozentwert und Stimmenanzahl
  * Teilnehmeranzahl, wenn vorhanden
  * Button/Link „Jetzt abstimmen“
  * dezentes VoteLink-Branding
* Die Balken sollen mit HTML/CSS gebaut werden, nicht mit Canvas.
* Keine interaktive Abstimmung im iframe in der ersten Version, außer es ist mit wenig Risiko möglich.
* Erstmal reicht: Anzeigen + Button zur normalen Poll-Seite.
* Die Karte muss responsive sein.
* Sie soll auch in kleinen Breiten noch gut aussehen.
* Blockierte, deaktivierte oder pending Polls dürfen nicht sinnvoll eingebettet werden.
* Bei Fehlern eine ruhige Fehlermeldung anzeigen.

Technische Hinweise:

* API-Funktionen möglichst über frontend/src/api/pollsApi.js ergänzen oder wiederverwenden.
* Wenn vorhandene getPoll/getPollResults reichen, diese wiederverwenden.
* CSS möglichst in bestehende Struktur integrieren.
* Kein neues großes Charting-Framework einbauen.
* Kein Canvas für die Embed-Seite.
* Keine Pro-Farben jetzt einbauen.
* Free bleibt neutral im VoteLink-Design.

Zusätzlich:

* In der AdminPollPage soll der Ersteller einen Embed-Code kopieren können:

<iframe
  src="https://votelink.de/embed/PUBLIC_ID"
  width="100%"
  height="360"
  style="border:0;border-radius:16px;"
  loading="lazy"
></iframe>

Dabei soll die echte App-URL verwendet werden, falls sie im Frontend sinnvoll verfügbar ist. Sonst bitte robust relativ/konfigurierbar lösen.

Akzeptanzkriterien:

* /embed/:publicId lädt eine kompakte Ergebnis-/Poll-Karte.
* Die Karte sieht in einem iframe sinnvoll aus.
* AdminPollPage bietet einen kopierbaren Embed-Code.
* Bestehende VotePage bleibt unverändert nutzbar.
* npm run build im Frontend läuft.
* Backend-Tests werden nicht beschädigt.

============================================================
PHASE 3: Messenger-/Link-Vorschau vorbereiten
=============================================

Ziel:
Wenn ein Poll-Link geteilt wird, soll später nicht nur ein nackter Link erscheinen, sondern eine sinnvolle Vorschau.

Wichtig:
Die App ist eine React/Vite-SPA. Messenger und Crawler führen normalerweise kein React aus. Deshalb reichen clientseitige Meta-Tags nicht zuverlässig.

Bitte prüfe und implementiere die kleinste robuste Lösung.

Gewünschtes Zielbild:

* Öffentliche Poll-Links sollen OpenGraph-Daten bekommen:

  * og:title
  * og:description
  * og:url
  * og:image
  * twitter:card
  * twitter:title
  * twitter:description
  * twitter:image

Erste Version:

* Noch kein dynamisches Canvas/PNG notwendig, wenn es zu viel Aufwand ist.
* Ein statisches VoteLink-Preview-Bild ist für Phase 3 okay.
* Wichtig ist, dass Titel und Beschreibung poll-spezifisch sein können.
* Falls serverseitige HTML-Auslieferung für /p/:publicId im aktuellen Setup zu riskant ist, bitte nur einen sauberen technischen Vorschlag machen und noch nicht implementieren.

Sicherheits-/Produktregeln:

* pending Polls dürfen keine echte Vorschau bekommen.
* blocked/disabled Polls dürfen keine echte Vorschau bekommen.
* active/expired Polls dürfen Titel und neutrale Beschreibung bekommen.
* Keine Admin- oder Activation-Tokens in Meta-Tags.
* Keine Ersteller-E-Mail in Meta-Tags.
* Keine personenbezogenen Wählerinformationen in Meta-Tags.

Spätere Zielroute für dynamisches Vorschaubild:

* GET /api/polls/:publicId/preview.png

Noch nicht zwingend in Phase 3 implementieren, aber bitte vorbereiten/planen:

* Vorschaubild mit Titel
* Top 3–5 Optionen
* kleinen Balken
* Prozentwerten
* VoteLink-Branding

Bitte begründe, ob dafür später besser Canvas/PNG, SVG oder eine andere Technik verwendet werden sollte.

Akzeptanzkriterien für Phase 3:

* Es gibt entweder eine funktionierende minimale OpenGraph-Lösung oder einen sehr konkreten, risikoarmen Implementierungsplan.
* Bestehende SPA-Routen funktionieren weiter.
* Kein großer Server-Side-Rendering-Umbau, wenn er nicht nötig ist.

============================================================
PHASE 4: Pro-Feature „mehrere Fragen pro Umfrage“ nur planen
============================================================

Wichtig:
Dieses Feature jetzt noch NICHT vollständig implementieren.

Ziel:
Eine spätere Pro-Version soll Umfragen mit mehreren Fragen ermöglichen.

Beispiel:
Eine Umfrage könnte enthalten:

* Frage 1: Welcher Termin passt?
* Frage 2: Welche Uhrzeit passt?
* Frage 3: Essen ja/nein?
* Frage 4: Welche Option bevorzugst du?

Bitte analysiere, wie das aktuelle Datenmodell erweitert werden müsste.

Aktueller Zustand:

* polls
* poll_options
* votes
* poll_participations

Vermutlich nötige Zielstruktur:

* polls
* poll_questions
* poll_options
* poll_participations
* votes

Bitte prüfe:

1. Wie man das Datenmodell ändern könnte, ohne bestehende Single-Question-Polls kaputt zu machen.
2. Ob die aktuelle Poll technisch als Poll mit genau einer Frage migriert werden könnte.
3. Wie API-Responses aussehen sollten.
4. Wie CreatePollPage später mehrere Fragen erfassen könnte.
5. Wie VotePage später mehrere Fragen anzeigen könnte.
6. Wie Ergebnisse später gruppiert nach Frage angezeigt werden könnten.
7. Welche Limits sinnvoll wären:

   * Free: eine Frage
   * Pro: mehrere Fragen
8. Welche Migrationsstrategie am sichersten wäre.
9. Welche Tests nötig wären.

Wichtig:
Bitte in Phase 4 nur einen technischen Migrations- und Produktplan erstellen.
Noch keine Migration schreiben und keine bestehenden Tabellen umbauen, außer ich bestätige es ausdrücklich.

============================================================
PRIORITÄT
=========

Bitte setze die Priorität so:

1. Phase 1: Analyse/Plan
2. Phase 2: Embed/Mini-Balkendiagramm
3. Phase 3: Messenger/OpenGraph-Vorschau
4. Phase 4: Pro-Mehrfragen nur planen

Wenn dir unterwegs auffällt, dass eine Phase riskanter ist als gedacht, bitte stoppen und erklären, statt großflächig umzubauen.

============================================================
AUSGABEFORMAT
=============

Nach Phase 1:

* Kurze Analyse
* Umsetzungsplan
* Risiken
* betroffene Dateien
* Empfehlung, womit begonnen werden soll

Nach Codeänderungen:

* Geänderte Dateien
* Was wurde geändert?
* Wie teste ich es lokal?
* Welche Randfälle wurden beachtet?
* Welche Tests/Builds wurden ausgeführt?
* Was ist noch offen?

