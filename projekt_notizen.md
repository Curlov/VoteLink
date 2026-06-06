# VoteLink
    VoteLink ist eine kleine Web-App zum Erstellen und Teilen von Abstimmungen.

    Die Grundidee:

    - Benutzer erstellt eine Abstimmung
    - Benutzer gibt mehrere Antwortoptionen ein
    - Die App erzeugt einen öffentlichen Abstimmungslink
    - Andere Personen können über den Link abstimmen
    - Abstimmungen können anonym oder mit Namen erfolgen
    - Ergebnisse werden angezeigt

## Geplanter Stack

# Frontend:
    - React
    - Vite
    - JavaScript
    - CSS

# Backend:
    - Node.js
    - Express
    - pg

# Datenbank:

    - PostgreSQL
    - läuft in Docker auf dem Server

    Deployment später:

    - Caddy als Reverse Proxy
    - React als statischer Build
    - Express als API-Backend
    - PostgreSQL als Datenbank

## Aktuelle Architektur

    Während der Entwicklung:

    React Frontend
    http://localhost:5173

            ↓ fetch / HTTP

    Express Backend
    http://localhost:3000

            ↓ pg

    PostgreSQL in Docker
    192.168.178.36:5433


## Datenbank
    Datenbankname:  votelink
    Tabellen:   polls
                       poll_options
                       votes
                   
                   
## Tabellenidee

# polls - speichert die Abstimmung selbst.
    Felder:
        id
        public_id
        admin_token
        title
        description
        creator_name
        creator_email
        is_anonymous
        allow_multiple_votes
        created_at
        expires_at

# poll_options - speichert die Antwortoptionen einer Abstimmung.
    Felder:
        id
        poll_id
        option_text
        position

# votes - speichert abgegebene Stimmen.
    Felder:
        id
        poll_id
        option_id
        voter_name
        voter_token
        created_at
        Wichtige Konzepte
        public_id

    Die public_id ist die öffentliche ID einer Abstimmung.
    Beispiel: /p/abc123

    admin_token
    Der admin_token ist ein geheimer Verwaltungslink für den Ersteller.
    Beispiel: /admin/secret456
    Damit kann man später Ergebnisse verwalten, die Abstimmung schließen oder löschen.

    creator_name und creator_email
    Speichern, wer die Abstimmung erstellt hat. Die E-Mail ist für Verwaltung
    und spätere Verantwortlichkeit wichtig. Eine Organisation kann später
    ergänzt werden, wenn Dashboard, Pro-Funktionen oder Anti-Spam-Regeln
    konkreter werden.

## Backend-Pakete

# Installierte Pakete:

    express
    pg
    dotenv
    cors
    nanoid
    nodemon

express: erstellt den API-Server
pg: verbindet Node.js mit PostgreSQL
dotenv: liest die .env-Datei
cors: erlaubt Anfragen vom React-Frontend
nanoid: erzeugt kurze zufällige IDs
nodemon: startet den Server bei Änderungen automatisch neu

## Die Backend-Konfiguration liegt in:
    backend/.env

    Wenn das Passwort Sonderzeichen wie # enthält, muss es in Anführungszeichen stehen.


## Version 1 Features

# Die erste Version soll können:

    Abstimmung erstellen
    Optionen hinzufügen
    öffentlichen Link erzeugen
    Abstimmung anzeigen
    Stimme abgeben
    Ergebnis anzeigen

# Noch nicht in Version 1:

    Login
    Benutzerkonten
    E-Mail-Einladungen
    App
    Bezahlsystem
    komplexes Admin-Dashboard
    

## Spätere Sicherheitsfunktion: Einladungstokens

    Für geschützte Abstimmungen soll nicht mit einem gemeinsamen Passwort gearbeitet werden.
    Stattdessen erhält jede eingeladene E-Mail-Adresse einen eigenen geheimen Token per Link.

    Beispiel:

    /p/<public_id>?invite=<invite_token>

    Beim Abstimmen prüft das Backend:

    - gehört der invite_token zur Abstimmung?
    - wurde der invite_token bereits benutzt?
    - ist die Abstimmung noch offen?

    Vorteile:

    - keine Passworteingabe für Teilnehmer
    - einfacher Ablauf
    - jeder Einladungslink kann nur einmal abstimmen
    - bessere Manipulationssicherheit als offene Link-Abstimmungen
