"""Download GFL game data from statsnscore.online into data/raw/statsnscore/.

The site's pages load their data from JSON feeds that need a short-lived token
(valid ~2 minutes). The token is embedded in each page's HTML, so we read it
from a page first, the same way a browser does, and refresh it regularly.

Files written (gzip-compressed JSON, photo and logo links removed):
    data/raw/statsnscore/gamelist.json.gz
    data/raw/statsnscore/<season>/<game id>.json.gz
"""

import gzip
import json
import re
import time
from pathlib import Path

import requests

BASE = "https://statsnscore.online/stats/v2"
RAW_DIR = Path(__file__).parent.parent / "data" / "raw" / "statsnscore"
LEAGUE = "GFL"
GAMETYPES = {"Regular", "Playoff"}
DELAY = 1.0           # seconds between requests
TOKEN_MAX_AGE = 90    # seconds; the site's tokens expire after 120

session = requests.Session()
session.headers["User-Agent"] = "gflstats (https://github.com/buggernaut0/gflstats)"

_token = None
_token_time = 0.0


def _get(url, **params):
    time.sleep(DELAY)
    response = session.get(url, params=params, timeout=60)
    response.raise_for_status()
    return response


def _token_for_feeds():
    global _token, _token_time
    if _token is None or time.time() - _token_time > TOKEN_MAX_AGE:
        html = _get(f"{BASE}/gamelist", season=2026, gametype="Regular", leagueGame="league").text
        match = re.search(r"snstoken=([\w.\-]+)", html)
        if not match:
            raise RuntimeError("Could not find a data token on the statsnscore game list page.")
        _token, _token_time = match.group(1), time.time()
    return _token


def _save(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    with gzip.open(path, "wt", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)


def _drop_logos(record):
    return {k: v for k, v in record.items() if "logo" not in k.lower() and "image" not in k.lower()}


def fetch_gamelist():
    """Download the list of all games (every league and season) and save it."""
    games = _get(f"{BASE}/gamelistjson", snstoken=_token_for_feeds()).json()["games"]
    games = [_drop_logos(g) for g in games]
    _save(RAW_DIR / "gamelist.json.gz", games)
    return games


def wanted_games(games, season=None):
    """GFL regular season and playoff games that have stats (relegation games count as playoffs)."""
    return [
        g for g in games
        if g["league"] == LEAGUE
        and g["gametype"] in GAMETYPES
        and g["stats"] == "Existing"
        and "demo" not in g["gamename"].lower()
        and (season is None or g["season"] == str(season))
    ]


def fetch_game(game):
    """Download the per-player stats of one game and save them."""
    data = _get(f"{BASE}/stats-playerjson", snstoken=_token_for_feeds(), gameid=game["_id"]).json()
    players = [_drop_logos(p) for p in data["playerData"]]
    _save(RAW_DIR / game["season"] / f"{game['_id']}.json.gz", players)


def scrape(season=None, refresh=False):
    games = wanted_games(fetch_gamelist(), season)
    todo = [g for g in games if refresh or not (RAW_DIR / g["season"] / f"{g['_id']}.json.gz").exists()]
    print(f"{len(games)} GFL games with stats, {len(todo)} to download.")
    for i, game in enumerate(todo, 1):
        print(f"  [{i}/{len(todo)}] {game['season']} {game['dateformat']} {game['hometeam']} vs {game['guestteam']}")
        fetch_game(game)
