"""Load the downloaded statsnscore files from data/raw/statsnscore/ into the database."""

import gzip
import json
from datetime import date

from scrapers.statsnscore import RAW_DIR, wanted_games


def _load(path):
    with gzip.open(path, "rt", encoding="utf-8") as f:
        return json.load(f)


def _iso_date(dateformat):
    # The site writes dates like '2025-5-3'.
    year, month, day = (int(x) for x in dateformat.split("-"))
    return date(year, month, day).isoformat()


def _id(conn, table, name):
    conn.execute(f"INSERT OR IGNORE INTO {table} (name) VALUES (?)", (name,))
    return conn.execute(f"SELECT id FROM {table} WHERE name = ?", (name,)).fetchone()[0]


def parse(conn, season=None):
    stat_columns = [
        row[1] for row in conn.execute("PRAGMA table_info(player_game_stats)")
        if row[1] not in ("game_id", "player_id", "team_id")
    ]
    insert_stats = (
        f"INSERT OR REPLACE INTO player_game_stats (game_id, player_id, team_id, {', '.join(stat_columns)}) "
        f"VALUES ({', '.join('?' * (len(stat_columns) + 3))})"
    )

    loaded = 0
    for game in wanted_games(_load(RAW_DIR / "gamelist.json.gz"), season):
        path = RAW_DIR / game["season"] / f"{game['_id']}.json.gz"
        if not path.exists():
            continue
        players = _load(path)
        if not players:  # some games are marked as having stats but are empty test entries
            continue

        home_id = _id(conn, "teams", game["hometeam"])
        away_id = _id(conn, "teams", game["guestteam"])
        conn.execute(
            "INSERT OR REPLACE INTO games VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (game["_id"], int(game["season"]), game["gametype"], _iso_date(game["dateformat"]),
             game["starttime"], game["gamename"], home_id, away_id,
             game["hometeampoints"], game["guestteampoints"]),
        )

        conn.execute("DELETE FROM player_game_stats WHERE game_id = ?", (game["_id"],))
        for player in players:
            team_id = _id(conn, "teams", player["teamname"][0])
            player_id = _id(conn, "players", player["_id"])
            conn.execute(insert_stats, (game["_id"], player_id, team_id, *(player.get(c) for c in stat_columns)))
        loaded += 1

    conn.commit()
    print(f"Loaded {loaded} games into the database.")
