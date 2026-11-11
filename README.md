# gflstats

Every GFL (German Football League) team, its players and their stats per game and per season, from [statsnscore.online](https://statsnscore.online). Covers regular season and playoff games from 2023 on.

## How it works

```
statsnscore.online → scrapers/ → data/raw/ → parsers/ → gflstats.db → Datasette
```

1. **Scrape**: download each game's player stats and save them in `data/raw/statsnscore/` (compressed, photo/logo links removed).
2. **Parse**: load the saved files into the SQLite database `gflstats.db`.
3. **Browse**: open the database in Datasette to sort, filter and search.

## What's in the database

| Table / view | Contents |
|---|---|
| `team_rosters` | every team's players per season, with games played |
| `player_season_stats` | each player's stats totaled per season and team |
| `player_game_stats_full` | each player's stats for every game, with date, team and opponent |
| `teams`, `players`, `games`, `player_game_stats` | the underlying tables |

Stat columns use the site's own names (`run`, `runyards`, `catched`, `tackletotal`, ...). `position` is empty for now: the site doesn't publish positions.

## Windows: quick start

1. Install [Python](https://www.python.org/downloads/) (tick **"Add python.exe to PATH"**) and [Git](https://git-scm.com/download/win).
2. Open PowerShell and get the project onto your Desktop:
   ```powershell
   cd "$([Environment]::GetFolderPath('Desktop'))"
   git clone https://github.com/buggernaut0/gflstats.git
   ```
3. In the new `gflstats` folder on your Desktop, double-click:
   - **`setup.bat`**: one-time setup
   - **`start.bat`**: opens the stats in your browser (close the window to stop)
   - **`update.bat`**: gets the latest stats from GitHub

## Setup (Mac/Linux)

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Usage

```bash
python cli.py update                 # download new games and load everything
python cli.py update --season 2026   # only one season
datasette gflstats.db                # browse at http://localhost:8001
```

`scrape` and `parse` can also be run on their own. Games already downloaded are skipped; add `--refresh` to download them again.
