"""Command-line entry point.

Usage:
    python cli.py init-db                 create gflstats.db from db/schema.sql
    python cli.py scrape [--season 2025]  download GFL games into data/raw/
    python cli.py parse  [--season 2025]  load the downloaded games into gflstats.db
    python cli.py update [--season 2025]  scrape + parse

Without --season, all seasons on the site are used.
"""

import argparse
import sqlite3
from pathlib import Path

from parsers import statsnscore as statsnscore_parser
from scrapers import statsnscore as statsnscore_scraper

ROOT = Path(__file__).parent
DB_PATH = ROOT / "gflstats.db"
SCHEMA_PATH = ROOT / "db" / "schema.sql"


def init_db(args):
    with sqlite3.connect(DB_PATH) as conn:
        conn.executescript(SCHEMA_PATH.read_text())
    print(f"Database ready at {DB_PATH.name}")


def scrape(args):
    statsnscore_scraper.scrape(args.season, args.refresh)


def parse(args):
    init_db(args)
    with sqlite3.connect(DB_PATH) as conn:
        statsnscore_parser.parse(conn, args.season)


def update(args):
    scrape(args)
    parse(args)


def main():
    parser = argparse.ArgumentParser(description="GFL player stats tools")
    commands = parser.add_subparsers(dest="command", required=True)

    commands.add_parser("init-db", help="create the database from db/schema.sql").set_defaults(func=init_db)

    for name, func, help_text in [
        ("scrape", scrape, "download GFL games into data/raw/"),
        ("parse", parse, "load the downloaded games into the database"),
        ("update", update, "scrape, then parse"),
    ]:
        cmd = commands.add_parser(name, help=help_text)
        cmd.add_argument("--season", type=int, help="only this season, e.g. 2025 (default: all)")
        if name != "parse":
            cmd.add_argument("--refresh", action="store_true", help="download games again even if already saved")
        cmd.set_defaults(func=func, refresh=False)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
