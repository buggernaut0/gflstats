# GFL Stats – Projektkontext (dauerhaft gültig)

Repo: `buggernaut0/gflstats` · lokal: `C:\Users\Rasmus\Desktop\gflstats` · Branch: `main` (keine Feature-Branches).

## 1. Ziel und Funktionsumfang
„GFL Analytics & Scouting Platform“ für die German Football League: statische Website mit Statistiken, Profilen und Analysen auf Basis der vorhandenen Pipeline-Datenbank.
- Saisons 2023–2026 (aktuell 2026). 2023/24 = importierte Statistikbögen („presto“), ab 2025 direkt erfasste Spiele („statsnscore“). Rund 388 Spiele, 2007 Spieler, 21 Teams.
- Bereiche: Spieler (Suche inkl. erweiterter Suche), Teams, Spiele, Saison-Dashboards, Analytics-Hub (Leaders, Rekorde, Vergleich, Breakouts, Spieler-/Team-/Spiel-Analysen), Methodik & Korrekturen.
- Extras: Lieblingsteam, Teamlogos, Radar-Diagramme, Highlight-Videos (Spieler + Spiele), Dark/Light-Modus.
- Laufende Erweiterung: interaktive 3D-Visualisierungen – 3D-Teamaufstellung und 3D-Hexagon (siehe STATUS). Ein 3D-Stat-Feld ist ausdrücklich nicht gewünscht.

## 2. Architektur und Technik
- **Datenpipeline (unverändert, geschützt):** `scrapers/`, `parsers/`, `cli.py` → `gflstats.db` (SQLite) + `data/`.
- **Build-Schicht:** `scripts/build_data.py` (Python-Stdlib) liest `gflstats.db` **nur lesend** + `curation/*` → schreibt `web/public/data/*.json` (`players.json`, `games.json`, `teams.json`, `team_seasons.json`, `player_seasons.json`, `search.json`, `meta.json`, `checks.json`, `rosters.json`, `pg/<saison>.json`). 106 Konsistenzprüfungen gegen die DB, Abbruch bei Fehler.
- **Website:** `web/` – Next.js 15 (App Router, `output: "export"`, `trailingSlash`, `basePath` aus `NEXT_PUBLIC_BASE_PATH`), React 19, TypeScript 5, Tailwind 4, Schriften Barlow / Barlow Condensed (@fontsource).
- **3D:** reines `three@^0.170` (+ `@types/three`), kein R3F/drei/GSAP/Physik. Immer lazy (`next/dynamic`, `ssr:false`, IntersectionObserver), WebGL-Prüfung mit flachem HTML-Fallback, `prefers-reduced-motion` = Rendern nur bei Bedarf.
- **Tests:** `cd web && npm test` (`node --test "tests/**/*.test.ts"`; Lib-Dateien, die Tests importieren, nutzen Imports mit `.ts`-Endung), `npm run typecheck`; Python aus Repo-Wurzel: `python -m unittest scripts/test_build_data.py`.

## 3. Verzeichnisse und wichtige Dateien
| Pfad | Inhalt |
|---|---|
| `curation/` | Korrekturen + Zusatzdaten mit Quellen: `teams.json` (IDs, Kürzel, Logos, Farben), `rosters.json` (Kader mit Nummern/Positionen), `videos.json`, `game_videos.json`, `excluded_games.json`, `game_corrections.json`, `player_aliases.csv`, `player_keep_separate.csv`, `role_overrides.csv`, `README.md` |
| `scripts/` | `build_data.py`, `test_build_data.py`, `download_logos.py`, `pages.yml` (Vorlage GitHub-Actions-Workflow) |
| `web/src/app/` | Routen (siehe 6), `globals.css` (Design-Tokens), `layout.tsx` |
| `web/src/lib/` | `data.ts` (JSON-Loader, Server), `clientData.ts`, `stats.ts`, `explore.ts`, `query.ts`, `profile.ts`, `team.ts`, `dashboard.ts`, `insights.ts`, `tables.ts`, `format.ts`, `favorite.ts`, `nav.ts`, `lineup.ts`, `types.ts` |
| `web/src/components/` | UI-Komponenten (u. a. `PlayerSearch`, `TeamView`, `GameList`, `Radar`, `VideoPlayer`, `GamePoster`, `TeamLogo`, `FavoriteTeam`, `SeasonDashboard`), `lineup/` (3D-Aufstellung) |
| `web/tests/` | Node-Tests (`analytics`, `dashboard`, `favorite`, `players`, `lineup`) |
| `web/public/logos/` | Teamlogos + `QUELLEN.md` |
| `web/start-web.bat`, `web/vorschau.bat` | lokale Entwicklung / Vorschau des Exports (freier Port ab 8765) |
| `web/vorschau/` | Hilfs-.bat-Dateien für Git-Aktionen auf dem PC, `website.zip` (Vorschau-Build) |
| `design-konzepte/` | 4 alternative Design-Entwürfe (HTML), nicht übernommen |

## 4. Daten und Verarbeitung
- Einzige Statistikquelle: `gflstats.db` / `data/raw/` (read-only). Korrekturen nur über `curation/` mit Begründung; sie erscheinen auf `/methodik/`.
- Namensbereinigung automatisch (Schreibweise, Tippfehler ≤2 Zeichen bei gemeinsamem Team; nie zusammen, wenn im selben Spiel).
- Externe Quellen nur für Logos, Teamfarben, Kader (Nummern/Positionen), Videos – immer mit Quell-URL und Abrufdatum in `curation/`.
- Verfügbarkeit von Werten je Saison in `meta.json` (`availability`); fehlende Werte werden als „nicht erfasst“ gezeigt, nie als 0.

## 5. Profile
- **Spieler** `/spieler/[id]/`: Kennzahlen je Saison, Game-Log, Radar (Perzentile mit Tiefe), Highlight-Videos (Klick-zum-Laden, youtube-nocookie).
- **Team** `/teams/[id]/`: Logo/Farben, Saisonbilanz, Kader-/Statistiktabellen (`TeamView`), Starting Lineup (3D, aktuell nur Ravensburg 2026).
- **Spiel** `/spiele/[id]/`: Ergebnis, Box-Score, Spielposter aus Teamlogos, Game-Highlight-Video falls verifiziert.

## 6. Routing und Deployment
Routen: `/`, `/spieler/`, `/spieler/[id]/`, `/teams/`, `/teams/[id]/`, `/spiele/`, `/spiele/[id]/`, `/saison/[season]/`, `/analytics/` (+ `breakouts/`, `spieler/`, `teams/`, `spiele/`), `/leaders/`, `/rekorde/`, `/vergleich/`, `/methodik/`. Navigation: Spieler · Teams · Spiele · Analytics (Leaders/Rekorde/Vergleich über den Hub, Adressen unverändert). Filter-/Suchzustand in der URL.
Deployment: GitHub Pages via GitHub Actions bei Push auf `main` (`basePath=/gflstats`). Muss vom Repo-Eigentümer aktiviert sein: Settings → Pages → Source „GitHub Actions“.

## 7. Designsystem
- CSS-Variablen in `web/src/app/globals.css`, Theme über `data-theme` (dark Standard / light). Dark: `--bg #0c1420`, `--surface #121c2b`, `--ink #e9eef5`, Akzent Gold `--accent #f5c63c`; Light: `--bg #f3f5f8`, `--accent #e8b31d`, `--accent-text #8a6300`. Sieg/Niederlage `--win`/`--loss`, Lieblingsteam `--fav` (Violett), Radar-Variablen.
- Typo: Barlow (Text), Barlow Condensed (Überschriften/Zahlen). Sportlich-sachlich, kein Deko-Overkill.
- Pflicht: responsiv bis Mobil (keine horizontale Überlaufbreite), sichtbarer Fokus, reduced motion, beide Themes prüfen.
- Teamfarben nur aus belegten Quellen (`curation/teams.json` → `colors` mit `source`); ohne belegte Farbe keine farbige 3D-Darstellung.

## 8. Verbindliche Einschränkungen
- Stack bleibt Next.js 15 / React 19 / TS / Tailwind 4, statischer Export, GitHub Pages.
- **Geschützt (nie ändern/löschen/überschreiben, keine neuen Dateien darin):** `data/`, `db/`, `gflstats.db`, `scrapers/`, `parsers/`, `cli.py`. `.github/` ist für mich auf dem PC nicht beschreibbar.
- 3D nie auf Kosten der Datenqualität; immer Fallback ohne WebGL.

## 9. Regeln zur Datenkorrektheit
- Nichts erfinden: keine Statistiken, Spieler, Teams, Rückennummern, Positionen, Teamfarben, Spielzeiten, Ergebnisse, Snaps, Starter-Informationen, Einsatzzeiten, YouTube-Links/Video-IDs.
- Keine Routen, Catch-Koordinaten, Start-/Endpunkte erfinden; Längen (z. B. längster Catch) nur als statistische Distanz darstellen.
- Unbelegte Positionen bleiben sichtbar leer („nicht belegt“) statt aufgefüllt.
- Videos nur nach Prüfung (Titel/Datum/Teams) eintragen.

## 10. Zusammenarbeit und Präferenzen
- Kommunikation auf Deutsch; knappe Berichte.
- Phasenweise arbeiten: nach jeder Phase pausieren, berichten, auf Freigabe warten.
- **Keine Commits, Pushes oder Merges ohne ausdrückliche Freigabe.** Wenn freigegeben: ausführliche Commit-Nachricht, direkt auf `main`. Keine destruktiven Git-Befehle, kein Force-Push.
- Arbeitsweise mit dem PC: Code in der Sandbox bearbeiten/testen, geänderte Dateien per Datei-Übertragung in `C:\Users\Rasmus\Desktop\gflstats` schreiben; Vorschau als `web/vorschau/website.zip` (große Dateien getrennt übertragen). Git auf dem PC nur über `.bat`-Dateien in `web\vorschau\` (mit `git --no-pager`), per Doppelklick gestartet.
- Nutzer prüft im Browser (Brave); nach Updates Strg+F5.
