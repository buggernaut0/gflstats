# Trap View

Kinoartige 3D-Präsentation zweier GFL-Teams (Offense gegen Defense) mit echten Starting Lineups und Duellen.
React 19 + three.js (@react-three/fiber), Vite.

## Einbindung in GFL Analytics

Die Trap View ist Teil der Website: Seite **`/trap-view/`** (Reiter „Trap View“ in der Hauptnavigation).
Der Spielsimulator gehört zur Trap View (Button „Spiel simulieren“ bzw. Adresse `/trap-view/#simulator`) und hat
keinen eigenen Menüpunkt. Code: `web/src/trapview/`, Seite: `web/src/app/trap-view/page.tsx` +
`web/src/components/TrapViewPage.tsx` (lädt three.js & Co. nur auf dieser Seite, füllt den Bildschirm unter der Kopfzeile).

```bash
cd web
npm run data        # Website-Daten (build_data.py) + Trap-View-/Simulator-Daten (npm run data:trapview)
npm run dev         # http://localhost:3000/trap-view/
npm test            # Website- und Simulator-Tests
```

## Datenfluss

```
gflstats.db ──(scripts/build_data.py, nur lesend)──▶ web/public/data/*.json
                                                        │
             web/src/lib/lineup.ts (Methodik der Website)│
                                                        ▼
                    web/scripts/trapview/export-data.ts ──▶ web/public/trapview/data/
                                                          index.json, season-<jahr>.json, sim-2026*.json (Logos: web/public/logos)
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

## Player Spotlight (Prototyp, 14.11.2026)

Während der Kamerafahrt werden bis zu drei herausragende Offense-Spieler des Offense-Teams und bis zu drei
Defense-Spieler des Defense-Teams vorgestellt – abwechselnd (O1, D1, O2, D2, O3, D3), in drei Blöcken zwischen den
bestehenden Einstellungen: Trenches → **Spotlight** → Backfield → Duelle → **Spotlight** → Defense → **Spotlight** →
Final Shot. Die bestehenden Einstellungen sind unverändert; mit sechs Spielern wird eine Runde ≈ 44 s länger.

**Auswahl** (`src/spotlight/scoring.ts` – einzige Stelle mit Regeln und Gewichten, läuft beim Datenexport):

- Grundlage nur die gewählte Saison; Vergleichsgruppe = alle Spieler der Liga mit derselben Statistik-Rolle
  (QB, RB, WR/TE, DEF), mind. 3 Spiele und Mindestvolumen (50 Pässe, 25 Ballkontakte, 10 Receptions, 8 Tackles).
- Kennzahlen pro Spiel bzw. als Quote (Yards/Pass, Completion %, INT-Quote, Yards/Carry, Yards/Catch,
  Catch-/Drop-Quote, verlorene Fumbles pro Ballkontakt), zum Gruppenschnitt geglättet (3 Spiele bzw. 12–80 Versuche).
  Negative Kennzahlen (INT, Fumbles, Drops) zählen umgekehrt. Spalten, die eine Saison nicht erfasst, entfallen.
- Perzentil je Kennzahl, Profilwert = gewichteter Mittelwert (0–100). QB-Profil × 1,05.
- Defense: DL/LB/DB sind ohne Kader nicht belegt → drei Statistikprofile (Pass Rusher, Tackler, Ballhawk), das
  beste zählt; mit Kader nur die zur Position passenden.
- Kandidaten nur aus der Starting Lineup (die Karte gehört zu einem Spieler auf dem Feld). Star ab 60, Elite ab 80.
  Erreicht eine Seite niemand, erscheint höchstens ihr bester Spieler als „Schlüsselspieler“ (ab 45) – sonst keine Karte.
- Gründe auf der Karte: die drei Kennzahlen mit dem größten Beitrag, mit echten Saisonwerten und „Top x %“.

**Darstellung:** `src/camera/shots/spotlight.ts` (Kamerafahrt auf den Spieler, Blickwinkel mit der geringsten
Verdeckung, Spieler im Bilddrittel gegenüber der Karte; innerhalb eines Blocks weicher Kameraflug zum nächsten Spieler),
`src/matchup/Highlight.tsx` (Spot und Bodenring), `src/spotlight/SpotlightCard.tsx` + `spotlight.css` (Karte),
`src/spotlight/PlayerPortrait.tsx` (stilisierte Büste in der Ausrüstung des Spielers, getöntes Visier, Nummer aus dem Kader).

**Spielerfotos ergänzen:** Datei `web/public/trapview/photos/<spieler-id>.webp` (oder `.jpg`/`.png`) ablegen,
`npm run data:trapview` – die Karte zeigt dann das Foto statt der Büste (Hochformat, Kopf im oberen Drittel).
Lädt ein Foto nicht, fällt die Karte automatisch auf die Büste zurück.

## Spielermodell

Ein gemeinsames, prozedurales Modell für alle Spieler (`src/players/`):

- `parts.ts` – 13 starre Körperteile (Becken, Ober-/Unterschenkel, Schuhe, Rumpf, Ober-/Unterarme, Helm), jedes als
  eine zusammengeführte Geometrie. Helm mit Facemask, Trikot, Hose, Stutzen und Schuhe sind getrennte Teile mit
  eigener Farbe und Oberfläche. Schulterbreite ≈ 1,28 × Brustbreite.
- `squad.ts` – zeichnet jedes Körperteil als **ein InstancedMesh für alle Spieler**: 13 Draw Calls für beide Teams
  (plus 13 für unbesetzte Plätze), drei Materialien insgesamt. Teamfarben (`src/data/kits.ts`), Hautton und Nummer
  hängen als Instanz-Attribute am Spieler.
- `numberAtlas.ts` – Rückennummern und Namen aller Spieler in einer Textur.
- `rig.ts` – Skelett, Körperbau je Positionsgruppe (`skill`, `big`, `line`) und Idle-Animation (Atmen, ruhiger Blick);
  `stances.ts` – Haltung je Position. Mit „Bewegung reduzieren“ im Betriebssystem stehen die Spieler still.

Unbesetzte Plätze erscheinen als durchscheinende Silhouette desselben Modells.

## Darstellung, Fallback, Bedienung

- Qualität (`src/scene/quality.ts`): Touch-Geräte und schwache Rechner bekommen geringere Pixeldichte, kein MSAA,
  kleinere Schatten- und Feldtextur. Bricht die Bildrate ein, sinkt die Pixeldichte auf 1.
- Ohne WebGL 2, bei einem Fehler oder wenn der Browser den Grafikkontext entzieht, erscheint die Aufstellung als
  Liste (`src/ui/LineupBoard.tsx`); Duelle und Vergleichsfenster funktionieren weiter. Dieselbe Liste steht
  Screenreadern auch neben der 3D-Szene zur Verfügung.
- Hochformat/4:3: der Bildwinkel wird angepasst, damit die für 16:9 komponierten Einstellungen im Bild bleiben.
- Tastatur: `Esc` schließt das Duell bzw. verlässt die Präsentation.

## Musik

`web/public/trapview/audio/track.mp3`, in Schleife, mit reduziertem Grundpegel und 4,5 s weicher Einblendung (`TRACK_GAIN`, `FADE_IN` in `src/audio/AudioEngine.ts`); Herkunft
und Hinweis zur Nutzung: `public/audio/README.md`. Die Musik startet direkt im Klick auf „Enter Trap View“
(Autoplay-Regeln). Blockiert der Browser trotzdem, zeigt die HUD „Sound on“; fehlt die Datei, „No audio“.
Im Hintergrund-Tab pausiert die Musik. Stummschaltung bleibt über Neuladen erhalten.

## Simulator (Phase 1: Engine ohne Darstellung, nur Saison 2026)

Vollautomatische Spielsimulation zweier Teams auf Basis der Bögen 2026 – kein Coach-Modus, keine Eingriffe.

```bash
npm run data       # erzeugt zusätzlich public/data/sim-2026.json (scripts/export-sim.ts)
npm test           # Engine-Tests (node --test)
npm run backtest   # simuliert jedes echte Spiel 2026 N-mal und vergleicht mit der Realität
```

- `src/sim/model.ts` – Quoten für Liga, Teams und Spieler (Shrinkage zum Ligaschnitt), Kombination in Log-Odds.
- `src/sim/engine.ts` – Spielregeln (Downs, Punts, FG, PAT/2-Pt, Turnovers, Safety, 4 × 12 min) → `PlayEvent[]`
  mit Akteuren, berechneten Wahrscheinlichkeiten („Warum?“) und deutschem Text. Seed → reproduzierbar.
- `src/sim/params.ts` – alle Simulationsparameter (Annahmen, nicht aus den Bögen), kommentiert und per Rücktest eingestellt.
- Sacks stehen in den Bögen als QB-Läufe; Sack-Yards (≈ −6,0) werden per Regression abgeleitet.
- Direkte Duelle nur auf Teamebene (Spieler gegen Team, Gewicht ≤ 25 %) – die Bögen sagen nicht, wer wen gedeckt hat.

### Phase 2: 2D-Wiedergabe

Einstieg: Button „Spiel simulieren“ oben rechts in der laufenden Trap View (startet nach dem Übergang mit den beiden gewählten Teams), Link „Spiel simulieren (2026)“ im Auswahlbildschirm oder direkt `/trap-view/#simulator`. Nur Saison 2026.

- `src/simview/SimulatorView.tsx` – Teamwahl, Scoreboard (Viertel, Uhr, Down & Distance, Feldposition), Steuerung
  (Pause, Normal/2×/4×, Highlights, Ergebnis, Neues Spiel), „Warum?“-Fenster mit den berechneten Wahrscheinlichkeiten,
  Spielverlauf (anklickbar), Endstand mit Teamwerten und besten Spielern.
- `src/simview/FieldCanvas.tsx` – Canvas-2D-Vogelperspektive: Feld, Endzonen, Line of Scrimmage, First-Down-Linie,
  Drive-Balken, Ball (mit Flughöhe) und die am Spielzug beteiligten Spieler mit Nummer und Namen.
- `src/simview/playback.ts` – Dauer je Ereignis (Bewegung + Standbild zum Lesen; Schlüsselspielzüge länger; siehe „Wiedergabe und Übergang“) und Positionen
  zum Zeitpunkt t. Die Bewegung folgt dem berechneten Ergebnis – Darstellung, keine Physik.
- Teamfarben nur, wenn belegt; sonst neutral hell/dunkel, immer unterscheidbar.

### Phase 3: alle 22 Spieler je Spielzug

- `src/simview/roster.ts` – Aufstellung aus derselben Logik wie die 3D-Trap-View (`buildSceneModel`: Shotgun 11 gegen 4-3,
  gleiche Platzvergabe aus der Starting Lineup). Unbesetzte Plätze bleiben leer (gestrichelter Ring), niemand wird erfunden.
  Ist ein beteiligter Spieler (Passempfänger, Läufer, Tackler …) kein Starter, wird er für diesen Spielzug auf einen passenden Platz gewechselt.
- `src/simview/choreo.ts` – Bewegungen passend zum berechneten Ergebnis: Routen (Go, Slant, Out, Curl, Post), Pass Protection,
  Pass Rush, Mann-Deckung bzw. Zonen, tiefer Safety, Verfolgung nach dem Catch, Lauf durch die Lücke, Sack, Kickoff/Punt mit
  Coverage und Blockern, Field Goal/PAT. Reine Darstellung: Die Bögen enthalten weder Laufwege noch Deckungszuordnungen.
  Spezialteams sind namenlos (Besetzung nicht in den Daten), nur Kicker/Returner werden genannt.
- Beschriftet werden nur die am Ausgang Beteiligten (und der QB bei Pässen); Rückennummern nur aus dem offiziellen Kader.

### Feinschliff

- Yard-Verteilung als Mischung aus enger Streuung und seltenem Breakaway (`PARAMS.breakaway`): 3rd-Down-Quote und First Downs
  liegen im Rücktest jetzt bei −1 bis −3 % statt −10 %. Die längsten Spielzüge sind dafür etwa 7–12 % kürzer als real.
- 4th Down: flachere Distanzregel, Versuche pro Spiel wie real (2,4); Punts etwas seltener als real.
- Spielfeld nutzt die volle Breite (Seitenverhältnis 120 : 53,3); unter 1200 px stehen Warum-Fenster und Spielverlauf darunter.
- „▶ Spielzug nochmal zeigen“ im Warum-Fenster: spielt einen gewählten Spielzug in Normaltempo erneut ab und kehrt danach
  an die alte Stelle zurück.

### Phase 4: Transparenz

- **Siegchance über 1.000 Simulationen** (`src/sim/multi.ts`, `src/simview/MultiPanel.tsx`) – in der Teamauswahl und unter
  jedem Spiel: Siegquote, Ø Punkte, Verteilung der Punktdifferenz, häufigste Spielstände, Ø-Werte der wichtigsten Spieler.
  Rechnet in Häppchen per `setTimeout` (≈ 0,5 s), die Seite bleibt bedienbar.
- **„So funktioniert's“** (`src/simview/SimMethod.tsx`): Prinzip, Datengrundlage (verwendet / nicht vorhanden), Glättung mit
  Beispiel, Log-Odds-Vergleich, direkte Duelle, Simulationsparameter und die Rücktest-Tabelle – alle Zahlen live aus
  Daten, Modell und `public/trapview/data/sim-2026-backtest.json` (schreibt `npm run data` mit 40 Durchläufen je Spiel,
  ausführlich: `npm run backtest -- 200 --write`).

### Wiedergabe und Übergang (13.11.2026)

- **Tempo** (`simview/playback.ts`): Jeder Spielzug hat drei Abschnitte – Aufstellung steht, Spielzug läuft, Ergebnis
  steht. Normal: ein Spielzug ≈ 5,2 s (davon gut 3 s Bewegung), Schlüsselspielzüge 8 s mit über 3 s Banner. Ein Spiel
  dauert in „Normal“ ≈ 12–13 min (vorher ≈ 4 min); 2× und 4× kürzen gleichmäßig.
- **Highlights** (`highlightReason`): nur Szenen mit nachvollziehbarem Grund – Touchdowns, Field Goals (auch verfehlte),
  Safety, Interceptions, verlorene Fumbles, Turnover on Downs, Raumgewinne ab 20 Yards, geschaffte 4th Downs,
  3rd-Down-Conversions ab 5 Yards oder im 4. Viertel, Sacks auf 3rd/4th Down. Alles andere wird übersprungen
  (Spielstand und Verlauf laufen mit). Im Schnitt ≈ 23 Szenen bzw. ≈ 3 min pro Spiel; das Feld zeigt „Highlight n / N“ und den Grund.
- **Ergebnis ⏭**: springt direkt zu Endstand, Teamwerten und besten Spielern.
- **Übergang Trap View → Simulator** (`App.tsx`): Kamera fährt ins Bild und blendet ab (0,75 s), Titelkarte
  „GFL Simulator – Team vs Team“ (0,95 s), Aufblenden (0,65 s); der Kickoff startet erst danach. Die Musik blendet über
  2,2 s weich aus (`HANDOFF_AUDIO_FADE`); auch beim Verlassen der Seite wird sie nicht abgeschnitten
  (`AudioEngine.release`). Die Simulator-Daten werden während der Trap View vorgeladen – keine Ladepause.
