# gflstats

Archive, sort and filter player stats of the GFL (German Football League), pulled from different stats websites.

## How it works

```
websites → scrapers → data/raw/ → parsers → gflstats.db → Datasette
```

1. **Scrape**: download the stats pages and save them unchanged in `data/raw/`.
2. **Parse**: read the saved pages and load the stats into the SQLite database.
3. **Browse**: open the database in Datasette to sort, filter and search.

## Layout

| Path | Purpose |
|---|---|
| `scrapers/` | one module per website; only downloads pages |
| `parsers/` | one module per website; turns saved pages into database rows |
| `db/schema.sql` | the database tables |
| `data/raw/<source>/<season>/` | the downloaded pages (the archive) |
| `gflstats.db` | the SQLite database (created by `init-db`) |
| `cli.py` | runs everything |

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python cli.py init-db
```

## Usage

```bash
python cli.py scrape --source gfl --season 2025
python cli.py parse --source gfl --season 2025
datasette gflstats.db
```
