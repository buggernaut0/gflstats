# GFL Stats – Projektstatus (Stand 12.11.2026, 23:20)

## 1. Repository-Zustand
- PC `C:\Users\Rasmus\Desktop\gflstats`: Branch `main`. Die 3D-Erweiterung (Phasen 2, 3, 4 und 6 Teil 1) wurde am 12.11.2026 in **einem Commit** auf `main` committet und gepusht: „3D: Starting Lineup für alle Teams und Radar in 3D“ (Vorgänger: `e61ef0b`). Hash mit `git log --oneline -1` prüfen.
- Enthalten sind auch `GFL_PROJECT_CONTEXT.md` und `GFL_PROJECT_STATUS.md` in der Repo-Wurzel.
- `web/vorschau/website.zip` (nicht im Repo) enthält denselben Stand; ansehen mit `web/vorschau.bat`, mit Node `web/start-web.bat`.
- Sonstiges: Branch `feature/web-platform` existiert noch (Löschen angeboten, unbeantwortet). `web/vorschau/commit-main.bat` stammt nicht von mir. `test.txt.txt` (leer) in der Repo-Wurzel.

## 2. Fertig und auf `main` (committet/gepusht)
Datenschicht + Website, Lieblingsteam, Teamlogos (15 mit Quellen), Navigation + Analytics-Hub, erweiterte Spielersuche in `/spieler/`, Spieler-Highlight-Video (Tim Müller), Game Highlights (126 verifizierte YouTube-Videos in `curation/game_videos.json`), Radar mit Tiefe, Review-Korrekturen, 4 Design-Konzepte in `design-konzepte/` (keines übernommen).

## 3. 3D-Erweiterung „Interactive 3D Football Experience“
| Phase | Inhalt | Stand |
|---|---|---|
| 1 | Datenanalyse + Konzept | abgeschlossen (nur Konzept, kein Code) |
| 2 | Starting-Lineup-Logik je Saison | fertig, committet |
| 3 | 3D-Teamaufstellung, Prototyp Ravensburg Razorbacks 2026 | **fertig, committet** |
| 4 | 3D-Hexagon (2D-Ansicht bleibt Standard) | **fertig, committet** |
| ~~5~~ | ~~3D-Stat-Feld~~ | **gestrichen** (Entscheidung Nutzer 12.11.2026; es existiert kein Code dazu) |
| 6 | Integration/QA, Übertragung auf alle Teams | **teilweise**: Aufstellung läuft für alle 15 Teams 2026 (14 davon vorläufig ohne Kader/Farben); Kader-/Farb-Recherche und Gesamt-QA offen |

### Getroffene Entscheidungen
- Nur Kader **2026** zählt für die 3D-Grafik; ältere Kader irrelevant.
- Rückennummern/Positionen aus offiziellem Vereinskader (ifm-razorbacks.de/team/ifm-razorbacks/roster/, abgerufen 12.11.2026), 54 Einträge, 40 einer Spieler-ID zugeordnet. Nummer 36 doppelt (Stuparek, Trost) – vermerkt. Sportschau-Kaderseite war nicht abrufbar.
- Ravensburg-Farben aus offiziellem CI-Styleguide: primary `#18223C`, secondary `#CE152F` (Markenfarben, kein Trikotabbild).
- Lineup-Logik (`web/src/lib/lineup.ts`): Einsatzschwelle `MIN_GAME_SHARE = 0.4` der Teamspiele; Kulanz `REGULAR_GAME_SHARE = 0.6`: Spieler mit ≥60 % der Spiele dürfen einen freien Platz unter Mindestvolumen füllen (nachrangig, nicht für OL). Slots: QB1 (≥50 Pass-Versuche), RB2 (≥25 Touches), WR3 (≥10 Rec, nach Rec-Yards), TE1 (≥5 Rec), OL5 (nicht belegbar), DL4, LB3, DB4 (gewichtete Defense-Werte).
- OL: in den Daten nicht belegbar → 5 neutrale „Ghost“-Figuren, „nicht belegt“.
- Ergebnis Ravensburg 2026: QB #17 McGovern; RB #11 McFerren; WR #87 Tim Müller, #1 Harris, #3 Buße; TE #80 W. Enneking; OL leer (5); DL #9 Rashid, #7 Hélio Barros-Lima, #71 Gerson Barros-Lima, #43 Okokhue; LB #10 Moudilou, #18 Striebich, LB3 leer; DB #8 Mashak, #14 Choate, #27 Wulf, #30 Mindham. → 6 von 22 Plätzen leer. (#4 Tye Germain ist erster Nachrücker auf RB.)
- 3D-Umsetzung: three.js-Szene mit Feldtextur, stilisierten Figuren (Rückennummer, Teamfarben), Kamera hinter gewählter Einheit, Offense/Defense-Umschalter, Hover/Tap → Info-Panel („Lower Third“), Klick/zweiter Tap → Spielerprofil. Section erscheint nur, wenn Kader **und** belegte Teamfarbe vorhanden (derzeit nur Ravensburg). Three-Chunk (~506 KB roh) wird nur auf Teamseiten mit Lineup geladen.

### Phase 4 – 3D-Hexagon (umgesetzt)
- Dateien: `web/src/components/Radar3D.tsx` (neu, three.js), `web/src/components/Radar.tsx` (Umschalter 2D/3D, 2D-Teil unverändert als `Radar2D`), `web/src/app/globals.css` (`.radar3d`), `web/src/app/methodik/page.tsx` (Erklärung), `web/README.md`.
- Wirkt überall, wo das Radar steht: Spielerprofil (`ProfileRadar`) und `/vergleich/` (`CompareView`).
- 2D ist Standard. 3D wird erst beim Umschalten geladen; Umschalter erscheint nur mit WebGL. Wahl in localStorage `gfl-radar-view`.
- Datenregel: keine neuen Werte. Abstand von der Mitte = normalisierter Wert (wie 2D), Höhe = derselbe Wert. Median gestrichelt auf dem Boden. Linienart/Punktform je Spieler wie in 2D (Kugel, Würfel, Tetraeder).
- Bedienung: Ziehen dreht/kippt (Touch: nur drehen, senkrechtes Wischen scrollt), Pfeiltasten, Überfahren/Antippen eines Eckpunkts zeigt Rohwert + Perzentil. Einmalige Aufbau-Animation, bei reduced motion aus.

### Phase 6 (Teil 1) – Aufstellung für alle Teams (umgesetzt, committet)
- `web/src/lib/lineup.ts`: neu `provisionalLineup()` + `PROVISIONAL_SLOTS`; `LineupPlayer.spot` (Platz in `FORMATION`), `Lineup.basis` (`roster` | `provisional`), Typ `LineupPosition` (+ `REC`, `DEF`).
- Vorläufige Aufstellung (Teams ohne `rosters.json`-Eintrag): nur abgeleitete Rolle aus `players.json` (QB, RB, WR/TE, DEF). QB1, RB1–2, 4 × REC (WR/TE gemeinsam, auf den 3 WR-Plätzen + TE-Platz), 5 × OL frei, 11 × DEF (produktivste Verteidiger; Anordnung vorn→hinten nach Statistikprofil Sacks/TFL vs. INT/PBU, ausdrücklich keine Positionsangabe). Keine Rückennummern. Seite kennzeichnet das als „Vorläufig“.
- `LineupSection.tsx`: wählt Kader- oder vorläufige Aufstellung; ohne belegte Farben neutrales Trikot (`#dfe5ec` / `#5b6b82`). **Keine Farben aus Logos abgeleitet** (geprüft: mehrere Logos einfarbig weiß/schwarz, unzuverlässig).
- `LineupScene.tsx`: Teamlogo als Aufdruck auf dem Rasen (aus `teams.json` → `logo`), dreht mit der Kamera; helle Trikots mit dunkler Nummer/Hose; `FieldPlayer.down` für Lineman-Haltung. `LineupField.tsx`: Props `logo`, `provisional`; Info-Panel ohne Nummer zeigt Slot.
- Sobald für ein Team Kader (und Farben) in `curation/` stehen, wechselt es automatisch auf die volle Darstellung – kein Codeumbau nötig.
- Besetzung 2026 (je 11 Plätze): Offense 5–6 (OL immer frei), Defense 8–11.
- **Elf Offense-Plätze (Entscheidung Nutzer 12.11.2026):** QB, RB1, 2 WR, TE, 5 OL + ein elfter Platz („Flex“), der nach Statistik an RB2 oder WR3 geht (vorläufig: RB2 oder REC4). Regel in `applyFlex()` (`web/src/lib/lineup.ts`): Mindestvolumen schlägt Kulanz, sonst Yards from Scrimmage (Rushing + Receiving), bei Gleichstand/leer bleibt der Receiver-Platz. `Lineup.flex` nennt Gewinner und Grund; die Seite zeigt das unter „So wird die Aufstellung ermittelt“.
- Ergebnis 2026: RB2 bei Dresden, Hildesheim, Munich, Pforzheim, Potsdam, Saarland, Schwäbisch Hall, Straubing; dritter/vierter Receiver bei Allgäu, Berlin, Braunschweig, Düsseldorf, Kiel, Ravensburg, Regensburg. Ravensburg: WR3 Aniel Buße statt RB2 Tye Germain (Germain wäre nur über die Kulanzregel dabei).

## 4. Tests (Stand Abschluss Phase 4, 12.11.2026)
- `npm run typecheck`: OK. `npm test`: **37/37**.
- Python `python -m unittest scripts/test_build_data.py`: OK; `build_data.py`: 106/106 Checks. `next build`: OK (2437 Seiten).
- Headless-Audit (Playwright, SwiftShader-WebGL), Dark + Light, Desktop 1400 px + Mobil 390 px, Seiten Ravensburg, Dresden, Tim Müller, `/teams/`, `/`: keine Konsolenfehler, kein horizontaler Überlauf.
- Interaktion: Hover zeigt Info-Panel, Klick öffnet Profil; Touch: erster Tipp wählt, zweiter öffnet Profil (Fehler behoben: `pointerleave` nach Touch hob die Auswahl sofort wieder auf, `LineupScene.tsx`).
- Ohne WebGL flacher Fallback mit Spieler-Links; reduced motion OK; Teams ohne Kader/Farben ohne Lineup-Section; Spielerseiten laden kein three.
- Phase 4 (headless): 2D bleibt Standard, three-Chunk lädt erst nach Klick auf „3D“; Hover zeigt Wert („Receiving Yards pro Spiel: 71,9, 88. Perzentil“); Ziehen/Pfeiltasten drehen; zurück zu 2D OK; ohne WebGL kein Umschalter, 2D sichtbar; Dark/Light, Mobil 390 px ohne Überlauf, keine Seitenfehler. Kein eigener Unit-Test für `Radar3D.tsx` (reine Darstellung).
- Phase 6 Teil 1 (headless): alle 15 Teamseiten mobil 390 px mit 3D-Canvas, ohne Fehler/Überlauf; Offense/Defense, Logo, Fallback ohne WebGL geprüft; `npm test` 37/37 (Tests für `provisionalLineup` und den elften Offense-Platz).
- Nicht geprüft: echtes Handy / echte GPU (nur Software-Rendering im Test).

## 5. Offene Punkte / nicht implementiert
- Recherche je Team (vom Nutzer für später vorgesehen): offizieller Kader 2026 (Nummern, Positionen inkl. OL) → `curation/rosters.json`; belegte Vereinsfarben → `curation/teams.json` (`colors` mit `source`). Anleitung in `curation/README.md`. Danach wechselt das Team automatisch auf die volle Darstellung.
- Gesamt-QA nach der Recherche; Test auf echtem Handy.
- GitHub Pages ggf. noch nicht aktiviert (Settings → Pages → „GitHub Actions“).

## 6. Aktuelle Phase und nächster Schritt
**Phase 6, Teil 2 offen.** Nächster Schritt: Kader- und Farb-Recherche für die 14 Teams ohne Kader (Reihenfolge nach Wunsch des Nutzers), jeweils mit Quelle in `curation/`. Phase 5 entfällt. Weitere Commits nur mit Freigabe.
