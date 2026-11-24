# curation/ – Korrekturen

Die Website liest `gflstats.db` und `data/raw/` nur. Was dort falsch oder uneinheitlich ist,
wird hier korrigiert – jede Korrektur mit Begründung, damit sie nachvollziehbar bleibt.
`scripts/build_data.py` wendet die Dateien beim Erzeugen der Website-Daten an.
Alle angewendeten Korrekturen erscheinen auf der Website unter „Methodik und Korrekturen“.

| Datei | Zweck |
| --- | --- |
| `teams.json` | Teamnamen → feste Team-ID (z. B. New Yorker Lions Braunschweig = Braunschweig Lions), Kürzel, offizielles Logo mit Quelle (`logo`: Bild-URL, Quellseite, Dateiname in `web/public/logos/`); `colors` (primary/secondary) nur mit Quelle, sonst leer |
| `excluded_games.json` | Spiele, die nicht gezählt werden (Testeinträge, Doppelerfassungen) |
| `game_corrections.json` | Regeln für Spieldaten, z. B. Heim/Gast-Tausch 2023 |
| `player_aliases.csv` | Schreibweise → richtiger Name, wenn die automatische Erkennung nicht reicht (Spitznamen, vertauschte Namen) |
| `player_keep_separate.csv` | Namenspaare, die nie zusammengeführt werden dürfen |
| `role_overrides.csv` | Rolle eines Spielers in einer Saison von Hand festlegen |
| `videos.json` | Highlight-Videos je Spieler |
| `rosters.json` | Offizieller Kader je Saison und Team (Rückennummer, Positionsgruppe, Quelle) für das Starting Lineup |
| `game_videos.json` | Highlight-Videos je Spiel (Game-ID → YouTube-Video), nur geprüfte Zuordnungen |
| `ol_starters.json` | Starting Offensive Line je Saison und Team laut offizieller Starterlisten der Liga (erzeugt mit `scripts/ol_starters.py`) |

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

## Kader für das Starting Lineup hinzufügen

In `rosters.json` unter `"rosters" → "<Saison>" → "<team-id>"` einen Block mit `source` (Adresse des
offiziellen Kaders), `retrieved` (Abrufdatum) und `players` ergänzen:

```json
{"number": 87, "name": "Tim MÜLLER", "position": "WR", "player": "tim-muller"}
```

`position` ist eine der Gruppen QB, RB, WR, TE, OL, DL, LB, DB, K, P; `player` ist die Spieler-ID der Website
(letzter Teil von `/spieler/<id>/`) oder `null`, wenn der Spieler in keinem Statistikbogen steht.
Optional: `detail` (Positionsangabe der Quelle, wenn sie von der Gruppe abweicht, z. B. „DE“, „Guard“),
`nameFix` (Begründung, warum der Anzeigename nach dem Kader statt nach dem Statistikbogen geschrieben wird –
die Spieler-ID bleibt dabei unverändert; erscheint auf der Methodik-Seite) und auf Team-Ebene `file`
(direkter Link zur Kader-Datei, wenn `source` die Kaderseite ist).
Der Build bricht ab bei unbekanntem Team, unbekannter Spieler-ID, doppelt zugeordnetem Spieler,
ungültiger Position/Nummer oder wenn ein Kader-Spieler in dieser Saison nicht für das Team im Statistikbogen steht.
Regel: Nummern und Positionen nur aus dem offiziellen Kader, nie raten. Zuordnung nie nur über die Nummer,
sondern über Team + Name (Schreibweisen, Zweitnamen, Kurzformen geprüft); unklare Fälle bleiben `null`.

**Eine Datenquelle für alles:** `scripts/build_data.py` hängt Nummer, Positionsgruppe und `detail` an den
Saisoneintrag des Spielers in `players.json` (`seasons[].number`, `.position`, `.positionDetail`, `.rosterTeam`) –
nur für genau diese Saison. Spielerprofil, Team-Kader (inkl. Kader-Spieler ohne Statistik), Suche,
Starting Lineup und Trap View lesen von dort bzw. aus `rosters.json`; nirgends werden Nummern separat gepflegt.

**Offensive Line in der Aufstellung (`ol_starters.json`):** Statistikbogen und Kader sagen nicht, wer startet.
Grundlage sind die offiziellen Starterlisten der Liga auf statsnscore.online (Spielseite, Abschnitt „Offense Starters“,
von der Statistik-Crew je Spiel erfasst). `python scripts/ol_starters.py fetch 2026` lädt die Listen aller Spiele nach
`data/raw/statsnscore/starters/`, `python scripts/ol_starters.py build 2026` erzeugt daraus `ol_starters.json`:
die fünf O-Liner des letzten Spiels mit vollständiger Liste, je Spieler Starts in der Saison und Zuverlässigkeit
(`hoch` = auch in mind. der Hälfte der Spiele mit Liste Starter, `mittel` = sonst). Zuordnung zur Spieler-ID nur
über Team + Name (Nachname, dazu Vorname oder Nummer); Rückennummer laut Kader (abweichende Listen-Nummer in
`sourceNumber`). `role` (T/G/C) nur, wenn Starterliste oder Kader sie nennen. **Seiten (LT/LG/C/RG/RT) nennt die
Quelle nicht** – `slot` nur von Hand mit eigener Quelle in `slotSource` eintragen und den Team-Eintrag mit
`"manual": true` vor dem Neuerzeugen schützen. Ohne Starterliste bleiben die fünf Plätze offen; sie werden nie mit
beliebigen Linemen aus dem Kader aufgefüllt. Bericht mit Quellen und Gegenüberstellung: `OL_STARTER_ABGLEICH_2026.md`.

Stand Kader 2026 (abgerufen 20.11.2026): 14 von 15 Teams. Für die Saarland Hurricanes liegt kein Kader vor
(vorläufige Aufstellung ohne Nummern). Krefeld Ravens spielen nicht in der GFL-Datenbank und sind nicht enthalten.

Ohne Kader zeigt die Teamseite eine **vorläufige** Aufstellung nur aus der Statistik (abgeleitete Rollen, keine
Nummern, Receiver und Defense nicht feiner getrennt). Sobald hier ein Kader steht, wechselt das Team automatisch
auf die Aufstellung mit Positionen und Rückennummern. Ohne belegte Farben in `teams.json` (`colors.primary` mit
`source`) tragen die Figuren ein neutrales Trikot; das Logo auf dem Rasen kommt aus `teams.json` (`logo`).
