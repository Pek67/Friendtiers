# 🎮 FriendTiers

Eine einfache Ranking-Seite fuer dich und deine Freunde.

## ✨ Features

- Browseruebergreifende Speicherung mit **Supabase**
- Admin-Login per E-Mail ueber **Supabase Auth**
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
3. Fuehre den Inhalt aus `supabase.sql` aus.
4. Oeffne `config.js`.
5. Trage dort deine Werte aus **Project URL**, **anon public key** und deiner Admin-E-Mail ein.

```js
window.FRIENDTIERS_CONFIG = {
    supabaseUrl: 'https://DEIN-PROJEKT.supabase.co',
    supabaseAnonKey: 'DEIN_ANON_KEY',
    adminEmail: 'deine@email.de'
};
```

Danach speichert FriendTiers die Liste in Supabase und laedt sie in jedem Browser wieder. Aendern darf nur die eingetragene Admin-E-Mail nach dem Login-Link aus Supabase.

## 📁 Dateistruktur

```text
Friendtiers/
├── index.html
├── style.css
├── script.js
├── config.js
├── supabase.sql
└── README.md
```

## 🔒 Hinweis

Die Beispielkonfiguration in `config.js` ist absichtlich nur ein Platzhalter. Ohne echte Supabase-Werte bleibt die Seite lokal gespeichert.
