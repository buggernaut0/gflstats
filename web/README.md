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
| `/spieler/`, `/spieler/<id>/` | Spielerliste mit Filtern; Profil mit Karriere, Perzentil-Radar, Entwicklung, Saisontabellen, Spielprotokoll, Videos |
| `/teams/`, `/teams/<id>/` | Teamübersicht; Teamseite mit Team Analytics, Kader-Filter, Spielplan |
| `/spiele/`, `/spiele/<id>/` | Spielplan je Saison; Box Score mit Team- und Spielerstatistik |
| `/analytics/` | Übersicht der Werkzeuge |
| `/analytics/spieler/`, `/analytics/spiele/`, `/analytics/teams/` | Advanced Player, Game und Team Search mit UND/ODER-Bedingungen |
| `/vergleich/` | Spielervergleich im Radar-Chart (bis zu 3 Spieler) |
| `/analytics/breakouts/` | Breakouts und Rollen-Index aller Saisons |
| `/rekorde/` | Rekorde: Einzelspiel, Saison, Karriere |
| `/methodik/` | Formeln, Modelle, Korrekturen, Datenverfügbarkeit |

Alle Such- und Filterzustände stehen in der Adresse und lassen sich als Link teilen.

## Ordner

| Pfad | Inhalt |
| --- | --- |
| `src/app/` | Seiten (eine Datei je Adresse) |
| `src/components/` | wiederverwendbare Bausteine |
| `src/lib/` | Datenzugriff und Berechnungen ohne Darstellung: `stats.ts` (Kennzahlen-Katalog), `profile.ts` (Perzentile), `insights.ts` (Rekorde, Breakouts), `team.ts`, `query.ts` (Bedingungen) |
| `src/config/fields.json` | Datenwörterbuch: Bezeichnung, Kürzel, Rechenregel je Statistikfeld |
| `tests/` | Rechentests |
