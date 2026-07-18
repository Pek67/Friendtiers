# 🎮 FriendTiers

Eine einfache Ranking-Seite fuer dich und deine Freunde.

## ✨ Features

- Browseruebergreifende Speicherung mit **Supabase**
- Einfaches Admin-Passwort fuer Bearbeitungen
- Zuschauer-Kommentare links und rechts
- Live-Voting, Reactions und Daily-Frage fuer Zuschauer
- Besucherzaehler, Ambient-Musik-Player und Admin-Reihenfolge
- Automatische lokale Zwischenablage als Fallback
- Responsive UI fuer Desktop und Handy
- Keine Build-Tools noetig, nur statische Dateien

## 🚀 Lokal starten

1. Repository klonen:
   ```bash
   git clone https://github.com/Pek67/Friendtiers.git
   cd Friendtiers
   ```
2. `index.html` im Browser oeffnen.

## 🗄️ Supabase einrichten

Damit dieselben Daten in mehreren Browsern und auf mehreren Geraeten sichtbar sind, braucht die Seite eine echte Online-Datenbank.

1. Erstelle in Supabase ein Projekt.
2. Oeffne im Supabase-Dashboard den **SQL Editor**.
3. Fuehre den Inhalt aus `supabase.sql` aus (enthaelt Rankings, Kommentare, Votes, Reactions und Besucherzaehler).
4. Oeffne `config.js`.
5. Trage dort deine Werte aus **Project URL**, **anon public key** und dem Admin-Passwort ein.

```js
window.FRIENDTIERS_CONFIG = {
    supabaseUrl: 'https://DEIN-PROJEKT.supabase.co',
    supabaseAnonKey: 'DEIN_ANON_KEY',
    adminPassword: '2312'
};
```

Danach speichert FriendTiers die Liste, Side-Kommentare, Votes, Reactions und die Daily-Frage in Supabase und laedt alles in jedem Browser wieder. Zum Bearbeiten der Rankings muss auf der Website das eingetragene Passwort eingegeben werden.

## 🎵 Musik

Der Player nutzt lokale MP3-Dateien und spielt komplette Songs ab. Steuerung (Play/Pause, Skip, Lautstaerke) erfolgt direkt auf der Seite.

## 📁 Dateistruktur

```text
Friendtiers/
├── index.html
├── style.css
├── script.js
├── config.js
├── assets/
│   └── music/
│       ├── track-01.mp3
│       ├── track-02.mp3
│       ├── track-03.mp3
│       ├── track-04.mp3
│       └── track-05.mp3
├── supabase.sql
└── README.md
```

## 🔒 Hinweis

Die Passwort-Sperre ist nur eine einfache Frontend-Sperre. Wer den Quellcode untersucht, kann das Passwort theoretisch finden.
