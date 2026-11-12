# GFL Analytics – Website

Statische Website (Next.js, TypeScript, Tailwind CSS) auf Basis von `gflstats.db`.
Die Originaldaten (`gflstats.db`, `data/raw/`) werden nur gelesen, nie verändert.

## So hängt alles zusammen

```
gflstats.db + data/raw/   (unverändert, nur gelesen)
        │
        ▼
scripts/build_data.py  ◄── curation/   (Korrekturen mit Begründung)
        │   prüft jede Summe gegen die Datenbank
        ▼
web/public/data/*.json    (wird bei jedem Build neu erzeugt, nicht im Git)
        │
        ▼
web/ (Next.js)  →  web/out/   (fertige Website, ohne Server lauffähig)
```

## Lokal starten

Voraussetzungen: Python 3 (habt ihr schon) und [Node.js](https://nodejs.org/) ab Version 22.

```bash
cd web
npm install          # einmalig
npm run data         # Website-Daten aus gflstats.db erzeugen
npm run dev          # Entwicklungsansicht unter http://localhost:3000
```

Ohne Node.js: `web/vorschau.bat` zeigt einen fertigen Build aus `web/vorschau/website.zip` mit Python an.

Unter Windows erledigt `web/start-web.bat` alle drei Schritte per Doppelklick.

Nach jedem `python cli.py update` einfach `npm run data` erneut ausführen –
neue Spiele, Spieler und Saisons erscheinen ohne weitere Anpassung.

## Prüfen

```bash
npm run data                                   # bricht ab, wenn eine Summe von der Datenbank abweicht
python -m unittest ../scripts/test_build_data.py
npm test                                       # Rechentests der Website
npm run typecheck
```

## Veröffentlichen

`.github/workflows/pages.yml` baut die Seite bei jedem Push auf `main` und stellt sie auf
GitHub Pages bereit (`https://<konto>.github.io/gflstats/`). Einmalig unter
*Settings → Pages → Source* „GitHub Actions“ auswählen.

## Seiten

| Adresse | Inhalt |
| --- | --- |
| `/`, `/saison/<jahr>/` | Saisonübersicht: Finale, League Leaders, Teamtabelle, Einzelleistungen, Rollen-Index, Breakouts |
| `/leaders/` | Rangliste für jede Kennzahl (Saison, beste Einzelsaisons, Karriere) |
| `/spieler/`, `/spieler/<id>/` | Spielersuche: Namenssuche, Filter nach Saison, Team, Rolle und Phase, aufklappbare Statistiksuche (alle Kennzahlen, UND/ODER, Bereiche, Saison- oder Karrierewerte, Vorlagen); Profil mit Karriere, Perzentil-Radar, Entwicklung, Saisontabellen, Spielprotokoll, Videos |
| `/teams/`, `/teams/<id>/` | Teamübersicht; Teamseite mit Team Analytics, Kader-Filter, Spielplan |
| `/spiele/`, `/spiele/<id>/` | Spielplan je Saison; Box Score mit Team- und Spielerstatistik |
| `/analytics/` | Analytics-Hub: Vorschau auf Leaders, Rekorde und Breakouts, Such-Werkzeuge mit Beispielen, Vergleiche. Leaders, Rekorde und Vergleich stehen nicht mehr in der Kopfleiste, sondern sind hier verlinkt (Adressen unverändert) |
| `/analytics/spiele/`, `/analytics/teams/` | Advanced Game und Team Search mit UND/ODER-Bedingungen. `/analytics/spieler/` leitet samt Suchparametern auf `/spieler/` weiter (eine einzige Implementierung in `components/PlayerSearch.tsx`) |
| `/vergleich/` | Spielervergleich im Radar-Chart (bis zu 3 Spieler) |
| `/analytics/breakouts/` | Breakouts und Rollen-Index aller Saisons |
| `/rekorde/` | Rekorde: Einzelspiel, Saison, Karriere |
| `/methodik/` | Formeln, Modelle, Korrekturen, Datenverfügbarkeit |

Alle Such- und Filterzustände stehen in der Adresse und lassen sich als Link teilen.

## Lieblingsteam

Oben rechts in der Kopfleiste („Mein Team“) lässt sich ein Team wählen. Die Wahl liegt nur im Browser
(`localStorage`, Schlüssel `gfl-favorite-team`); es gibt kein Konto und keinen Server.

- Logik zentral in `src/lib/favorite.ts`, Auswahl und Hook `useFavoriteTeam()` in `src/components/FavoriteTeam.tsx`.
- Jedes Element mit Spieler- oder Teambezug trägt `data-teams="<team-id> …"` (Helfer `teamsAttr()`), und zwar das Team
  des jeweiligen Datensatzes (Saison, Spiel), nicht ein festes Karriereteam.
- Für das gewählte Team werden Regeln in `<style id="fav-style">` geschrieben: violetter Streifen links, leichte Tönung,
  Kennzeichen „Dein Team“. Ein kleines Skript im `<head>` setzt sie vor dem ersten Zeichnen; dadurch kein Aufblitzen und
  keine Hydration-Unterschiede, und die Markierung bleibt beim Sortieren und Filtern erhalten.
- Neue Tabellen: `ResultTable` hat dafür die Eigenschaft `rowTeams`; eigene Zeilen bekommen `{...teamsAttr(team)}`.

## Game Highlights

Highlight-Videos je Spiel stehen in `curation/game_videos.json` (Game-ID → YouTube-ID, Titel, Kanal, Datum).
`scripts/build_data.py` prüft die Einträge und hängt sie als `video` an das Spiel in `games.json`.
Anzeige: Spielseite (Bereich „Game Highlights“), Spielübersicht (Symbol und Filter „nur mit Highlights“,
Adresse `?highlights=1`), Spielplan der Teamseite (Symbol) und „Highlights <Saison>“ auf der Startseite.
`components/VideoPlayer.tsx` lädt den YouTube-Player (youtube-nocookie.com) erst nach einem Klick; vorher
wird nichts von YouTube geladen, das Plakat besteht aus den Teamlogos. Derselbe Player zeigt die Spieler-Videos.

## Radar in 3D

Das Radar (Spielerprofil und `/vergleich/`) hat einen Umschalter 2D/3D. 2D ist Standard; die 3D-Ansicht (`src/components/Radar3D.tsx`,
three.js) wird erst beim Umschalten geladen und nur angeboten, wenn der Browser WebGL kann. Sie zeigt dieselben Werte: Abstand von
der Mitte und Höhe eines Eckpunkts sind beide der normalisierte Wert (0–100). Ziehen oder Pfeiltasten drehen und kippen die Ansicht;
die Wahl wird im Browser gemerkt (`gfl-radar-view`).

## Starting Lineup (3D)

Jede Teamseite zeigt für die aktuelle Saison eine interaktive 3D-Aufstellung (Offense/Defense) mit dem Teamlogo auf dem Rasen.
- Mit Kader in `curation/rosters.json` (derzeit: Ravensburg Razorbacks 2026): Positionen und Rückennummern aus dem offiziellen Kader (`startingLineup`).
- Ohne Kader: vorläufige Aufstellung nur aus der abgeleiteten Rolle (`provisionalLineup`): QB, RB, 3 Receiver (WR/TE gemeinsam), 11 × „DEF“
  (Anordnung nach Statistikprofil, keine Positionsangabe), keine Nummern, Offensive Line frei. Auf der Seite als vorläufig gekennzeichnet.
- Elf Offense-Plätze: QB, RB, 2 WR, TE, 5 OL und ein elfter Platz, der nach Statistik an den zweiten RB oder den dritten WR geht
  (Mindestvolumen vor Kulanz, sonst Yards from Scrimmage; `applyFlex` in `src/lib/lineup.ts`).
- Trikotfarben nur aus `curation/teams.json` (`colors` mit Quelle), sonst neutrales Trikot.
Auswahl der Starter: `src/lib/lineup.ts` (Einsatzschwelle, Mindestvolumen, Kulanzregel für Stammkräfte; unbelegte Plätze bleiben leer).
Darstellung: `src/components/lineup/` mit three.js, erst beim Scrollen in den Sichtbereich geladen; ohne WebGL
erscheint dieselbe Aufstellung als flaches Feld. Die Anordnung ist schematisch, keine Aussage über das Spielsystem.

## Teamlogos

Offizielle Logos liegen in `public/logos/` (Quellen in `public/logos/QUELLEN.md`). Pfad und Quelle stehen zentral in
`curation/teams.json` (`logo.url`, `logo.sourcePage`, `logo.file`); `scripts/build_data.py` übernimmt ein Logo nur, wenn die
Datei wirklich vorhanden ist. Ohne Logo zeigt `TeamLogo` das Teamkürzel. Logos neu laden: `scripts/logos-laden.bat`
(oder `python scripts/download_logos.py --neu`). Die Logos sind Marken der Vereine.

## Ordner

| Pfad | Inhalt |
| --- | --- |
| `src/app/` | Seiten (eine Datei je Adresse) |
| `src/components/` | wiederverwendbare Bausteine |
| `src/lib/` | Datenzugriff und Berechnungen ohne Darstellung: `stats.ts` (Kennzahlen-Katalog), `profile.ts` (Perzentile), `insights.ts` (Rekorde, Breakouts), `team.ts`, `query.ts` (Bedingungen) |
| `src/config/fields.json` | Datenwörterbuch: Bezeichnung, Kürzel, Rechenregel je Statistikfeld |
| `tests/` | Rechentests |
