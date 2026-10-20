-- GFL stats database schema (first draft).
-- Stat columns will grow once we know what the source websites actually provide.

CREATE TABLE IF NOT EXISTS sources (
    id          INTEGER PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,      -- e.g. 'gfl.info'
    base_url    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS seasons (
    id          INTEGER PRIMARY KEY,
    year        INTEGER NOT NULL,
    league      TEXT NOT NULL,             -- 'GFL' or 'GFL2'
    UNIQUE (year, league)
);

CREATE TABLE IF NOT EXISTS teams (
    id          INTEGER PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,      -- canonical name, e.g. 'Schwäbisch Hall Unicorns'
    city        TEXT
);

-- Other spellings/older names of a team as they appear on different sites.
CREATE TABLE IF NOT EXISTS team_aliases (
    alias       TEXT PRIMARY KEY,
    team_id     INTEGER NOT NULL REFERENCES teams(id)
);

CREATE TABLE IF NOT EXISTS players (
    id          INTEGER PRIMARY KEY,
    first_name  TEXT,
    last_name   TEXT NOT NULL
);

-- Other spellings of a player's name per source ('M. Müller' vs 'Max Mueller').
CREATE TABLE IF NOT EXISTS player_aliases (
    source_id   INTEGER NOT NULL REFERENCES sources(id),
    alias       TEXT NOT NULL,
    player_id   INTEGER NOT NULL REFERENCES players(id),
    PRIMARY KEY (source_id, alias)
);

-- Which team a player was on in a season, with jersey number and position.
CREATE TABLE IF NOT EXISTS rosters (
    player_id   INTEGER NOT NULL REFERENCES players(id),
    season_id   INTEGER NOT NULL REFERENCES seasons(id),
    team_id     INTEGER NOT NULL REFERENCES teams(id),
    number      INTEGER,
    position    TEXT,
    PRIMARY KEY (player_id, season_id, team_id)
);

CREATE TABLE IF NOT EXISTS games (
    id           INTEGER PRIMARY KEY,
    season_id    INTEGER NOT NULL REFERENCES seasons(id),
    week         INTEGER,
    date         TEXT,                     -- ISO date, 'YYYY-MM-DD'
    home_team_id INTEGER NOT NULL REFERENCES teams(id),
    away_team_id INTEGER NOT NULL REFERENCES teams(id),
    home_score   INTEGER,
    away_score   INTEGER
);

-- One row per player per game.
CREATE TABLE IF NOT EXISTS player_game_stats (
    player_id      INTEGER NOT NULL REFERENCES players(id),
    game_id        INTEGER NOT NULL REFERENCES games(id),
    team_id        INTEGER NOT NULL REFERENCES teams(id),
    source_id      INTEGER NOT NULL REFERENCES sources(id),
    -- passing
    pass_att       INTEGER,
    pass_cmp       INTEGER,
    pass_yds       INTEGER,
    pass_td        INTEGER,
    pass_int       INTEGER,
    -- rushing
    rush_att       INTEGER,
    rush_yds       INTEGER,
    rush_td        INTEGER,
    -- receiving
    rec            INTEGER,
    rec_yds        INTEGER,
    rec_td         INTEGER,
    -- defense
    tackles        REAL,                   -- REAL because assisted tackles may count as 0.5
    sacks          REAL,
    def_int        INTEGER,
    -- kicking
    fg_att         INTEGER,
    fg_made        INTEGER,
    xp_att         INTEGER,
    xp_made        INTEGER,
    PRIMARY KEY (player_id, game_id)
);

-- Every page we downloaded, so each row can be traced back to its origin.
CREATE TABLE IF NOT EXISTS fetches (
    id          INTEGER PRIMARY KEY,
    source_id   INTEGER NOT NULL REFERENCES sources(id),
    url         TEXT NOT NULL,
    file_path   TEXT NOT NULL,             -- where the raw page is saved under data/raw/
    fetched_at  TEXT NOT NULL              -- ISO timestamp
);
