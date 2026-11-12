# curation/ – Korrekturen

Die Website liest `gflstats.db` und `data/raw/` nur. Was dort falsch oder uneinheitlich ist,
wird hier korrigiert – jede Korrektur mit Begründung, damit sie nachvollziehbar bleibt.
`scripts/build_data.py` wendet die Dateien beim Erzeugen der Website-Daten an.
Alle angewendeten Korrekturen erscheinen auf der Website unter „Methodik und Korrekturen“.

| Datei | Zweck |
| --- | --- |
| `teams.json` | Teamnamen → feste Team-ID (z. B. New Yorker Lions Braunschweig = Braunschweig Lions), Kürzel, offizielles Logo mit Quelle (`logo`: Bild-URL, Quellseite, Dateiname in `web/public/logos/`); Farben noch offen |
| `excluded_games.json` | Spiele, die nicht gezählt werden (Testeinträge, Doppelerfassungen) |
| `game_corrections.json` | Regeln für Spieldaten, z. B. Heim/Gast-Tausch 2023 |
| `player_aliases.csv` | Schreibweise → richtiger Name, wenn die automatische Erkennung nicht reicht (Spitznamen, vertauschte Namen) |
| `player_keep_separate.csv` | Namenspaare, die nie zusammengeführt werden dürfen |
| `role_overrides.csv` | Rolle eines Spielers in einer Saison von Hand festlegen |
| `videos.json` | Highlight-Videos je Spieler |
| `game_videos.json` | Highlight-Videos je Spiel (Game-ID → YouTube-Video), nur geprüfte Zuordnungen |

## Automatische Namensbereinigung

Ohne Eintrag hier werden zusammengeführt:

1. gleiche Namen bis auf Leerzeichen, unsichtbare Zeichen, Bindestriche, Groß-/Kleinschreibung und Umlaut-Umschrift (Högl = Hoegl);
2. Tippfehler: höchstens 2 Zeichen Unterschied, mindestens eine gemeinsame Teamzugehörigkeit.

Nie zusammengeführt werden zwei Namen, die im selben Spiel im Statistikbogen stehen.

## Video hinzufügen

In `videos.json` unter `"videos"` einen Eintrag ergänzen:

```json
{"player": "montigo-moss", "platform": "youtube", "url": "https://www.youtube.com/watch?v=…", "title": "Highlights 2026", "added": "2026-11-12"}
```

`player` ist der letzte Teil der Profiladresse (`/spieler/montigo-moss/`).
YouTube wird eingebettet, Instagram als Link angezeigt.

## Spiel-Highlights hinzufügen

In `game_videos.json` unter `"videos"` einen Eintrag mit der Game-ID als Schlüssel ergänzen
(die ID ist der letzte Teil der Adresse `/spiele/<id>/`):

```json
"69b6956b9227192b30413b7b": {"youtubeId": "WazXlAhkv9k", "title": "Titel bei YouTube", "channel": "Sporteurope.TV", "published": "2026-06-27", "game": "2026-06-27 gast-id @ heim-id 24:22"}
```

`youtubeId` sind die 11 Zeichen nach `watch?v=`. `game` ist optional, wird aber beim Build geprüft
(Datum, Gast, Heim) und schützt vor Verwechslungen zwischen Hin- und Rückspiel oder Saisons.
Der Build bricht ab bei unbekannter Game-ID, ungültiger YouTube-ID oder doppelt vergebenem Video.
Regel: Ein Video wird nur eingetragen, wenn Teams, Saison und Datum eindeutig passen. Nie IDs raten.
