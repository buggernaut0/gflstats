"""Command-line entry point.

Usage:
    python cli.py init-db
    python cli.py scrape --source gfl --season 2025
    python cli.py parse  --source gfl --season 2025
"""

import argparse
import sqlite3
from pathlib import Path

ROOT = Path(__file__).parent
DB_PATH = ROOT / "gflstats.db"
SCHEMA_PATH = ROOT / "db" / "schema.sql"


def init_db(args):
    with sqlite3.connect(DB_PATH) as conn:
        conn.executescript(SCHEMA_PATH.read_text())
    print(f"Database ready at {DB_PATH.name}")


def scrape(args):
    # Will dispatch to scrapers/<source>.py once the first scraper exists.
    raise SystemExit(f"No scraper for '{args.source}' yet.")


def parse(args):
    # Will dispatch to parsers/<source>.py once the first parser exists.
    raise SystemExit(f"No parser for '{args.source}' yet.")


def main():
    parser = argparse.ArgumentParser(description="GFL player stats tools")
    commands = parser.add_subparsers(dest="command", required=True)

    commands.add_parser("init-db", help="create the database from db/schema.sql").set_defaults(func=init_db)

    for name, func, help_text in [
        ("scrape", scrape, "download raw pages into data/raw/"),
        ("parse", parse, "read raw pages and load them into the database"),
    ]:
        cmd = commands.add_parser(name, help=help_text)
        cmd.add_argument("--source", required=True, help="website to use, e.g. gfl")
        cmd.add_argument("--season", type=int, required=True, help="season year, e.g. 2025")
        cmd.set_defaults(func=func)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
