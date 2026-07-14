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
