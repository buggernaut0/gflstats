# Trap View

Kinoartige 3D-Präsentation zweier GFL-Teams (Offense gegen Defense) mit echten Starting Lineups und Duellen.
React 19 + three.js (@react-three/fiber), Vite.

## Starten

```bash
python scripts/build_data.py   # einmal im Repo-Hauptordner: Website-Daten aus gflstats.db (nur lesend)
cd trap-view
npm install
npm run dev                    # erzeugt vorher automatisch public/data (npm run data), Port 5183
```

## Datenfluss

```
gflstats.db ──(scripts/build_data.py, nur lesend)──▶ web/public/data/*.json
                                                        │
             web/src/lib/lineup.ts (Methodik der Website)│
                                                        ▼
                    trap-view/scripts/export-data.ts ──▶ trap-view/public/data/
                                                          index.json, season-<jahr>.json, logos/
                                                        │
                                                        ▼
       src/data/load.ts → src/data/sceneModel.ts (Formation, Duelle) → Szene, Labels, Vergleichsfenster
```

- **Einzige Quelle** sind die geprüften Website-Daten (Namensbereinigung, zusammengeführte Spieler, ausgeschlossene
  Spiele, Kader, belegte Teamfarben). Datenbank und Pipeline werden nicht verändert.
- **Teams** je Saison: alle Teams mit Spielen in der Saison (`teams.json`). Keine fest einprogrammierten Teams oder Spieler.
- **Starting Lineup:** dieselbe Funktion wie auf der Website (`startingLineup` mit Kader, sonst `provisionalLineup`):
  Einsatzschwelle (40 % der Teamspiele), Mindestvolumen je Gruppe, Rangfolge nach Produktion, kein Spieler doppelt,
  unerfüllte Plätze bleiben leer. Begründung und Formeln: Kommentar in `web/src/lib/lineup.ts`.
- **Rückennummern und Positionen** nur aus dem offiziellen Kader (`curation/rosters.json`, derzeit Ravensburg 2026).
  Ohne Kader: keine Nummern, Positionen nur grob (QB, RB, WR/TE, DEF), Offensive Line nicht belegbar.
- **Unbesetzte Plätze** erscheinen als durchscheinende Silhouette mit Label „nicht belegt“ – es wird kein Spieler erfunden.
- **Teamfarben** nur aus `curation/teams.json` (mit Quelle). Sonst neutrale Platzhalter, im Auswahlbildschirm als
  „Farben nicht belegt“ gekennzeichnet.

## Duelle (Vergleichsfenster)

Drei Receiver-Duelle (WR1–CB1, WR2–CB2, WR3–S1), sofern beide Plätze belegt sind. Die Receiver sind nach Receiving
Yards sortiert; in der Secondary stehen die Spieler mit den meisten Interceptions + abgewehrten Pässen außen.
Die Statistikbögen sagen nicht, wer wen gedeckt hat – ein Duell ist eine Gegenüberstellung, keine Deckungsangabe.

1. **Positionsspezifisch:** Jeder Spieler mit den Kennzahlen seiner Aufgabe (Receiver: Yards, Receptions, TD,
   Yards pro Catch; Passverteidiger: INT, abgewehrte Pässe, Tackles, Forced Fumbles). Nur Spalten, die in der
   Saison erfasst wurden (`meta.json` → `availability`).
2. **Positionsübergreifend – Liga-Perzentil:** Jeder Spieler wird nur mit seiner eigenen Rolle verglichen
   (eine benannte Kennzahl pro Spiel, mind. 3 Spiele, Gruppe ≥ 5 Spieler). Perzentil = Anteil der Gruppe mit
   niedrigerem Wert. Erst diese normierten Werte stehen nebeneinander. Keine Gewichte, keine Gesamtscores.
3. **Direktes Duell:** Werte beider Spieler aus den Spielen der zwei Teams gegeneinander (Teamebene).

Kennzahlen der Einordnung (`scripts/export-data.ts` → `METRICS`): Passing Yards, Rushing Yards, Receiving Yards,
INT + abgewehrte Pässe, Tackles, Sacks + Tackles for Loss – jeweils pro Spiel.

Physische Werte (40-Yard-Zeit, Größe usw.) gibt es in den Daten nicht und werden nicht angezeigt.

## Spielermodell

Ein gemeinsames, prozedurales Modell für alle Spieler (`src/players/`), gleiche Haltungen und Kameraeinbindung wie
zuvor. Silhouette: V-förmiger Torso, Schulterpolster unter dem Trikot, kräftigere Oberschenkel (Thigh Pads), dickerer
Hals. Ausrüstung: Kragen und Ärmelstreifen, Gürtel, Hose bis unters Knie mit Kniepolstern und Seitenstreifen,
Sockenstreifen, Spats/Tape, Cleats mit Sohle, Handschuhe, Schweißbänder. Helm: Jaw Pads, Ohröffnungen, Bumper,
Kinnschale, Facemask mit Mittelsteg und Befestigungsclips. Materialien: Trikot mit Lochgewebe und Stoffglanz,
glänzende Stretch-Hose, Helm mit Klarlack, pulverbeschichtete Facemask, Haut mit leichtem Sheen.
Teamfarben (`src/data/kits.ts`) und Rückennummer/Name (`numberTexture.ts`) werden dynamisch übertragen.

## Musik

`public/audio/track.mp3` (Herkunft und Hinweis zur Nutzung: `public/audio/README.md`). Fehlt die Datei, bleibt es still.
