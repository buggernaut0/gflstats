"""Erzeugt die Daten der Website aus gflstats.db und data/raw/ - ausschliesslich lesend.

    python scripts/build_data.py            schreibt web/public/data/
    python scripts/build_data.py --check    prueft nur, schreibt nichts

Ablauf:
  1. gflstats.db im Nur-Lese-Modus oeffnen, gamelist.json.gz lesen.
  2. Korrekturen aus curation/ anwenden (ausgeschlossene Spiele, Heim/Gast,
     Team-Franchises, Spieler-Aliasse). Die Originaldateien bleiben unveraendert.
  3. Rollen ableiten, Saison- und Teamwerte summieren.
  4. Abgleich: jede Summe der Website-Daten muss der Datenbank entsprechen.
  5. JSON-Dateien nach web/public/data/ schreiben.

Nur Python-Standardbibliothek, damit es ohne zusaetzliche Installation laeuft.
"""

import argparse
import csv
import gzip
import hashlib
import json
import re
import sqlite3
import sys
import unicodedata
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "gflstats.db"
GAMELIST_PATH = ROOT / "data" / "raw" / "statsnscore" / "gamelist.json.gz"
CURATION = ROOT / "curation"
FIELDS_PATH = ROOT / "web" / "src" / "config" / "fields.json"
OUT = ROOT / "web" / "public" / "data"


# --------------------------------------------------------------------------- helpers

def slugify(text):
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def clean_name(raw):
    """Schreibweise bereinigen, ohne den Namen inhaltlich zu aendern.

    Gibt (name, shared) zurueck. shared=True heisst: Die Quelle hat zwei Spieler
    in einem gemeinsamen Eintrag erfasst ('Anna Muster,Max Beispiel').
    """
    name = unicodedata.normalize("NFC", raw)
    name = name.replace("\u00ad", "").replace("\u00a0", " ")
    shared = False
    if "," in name:
        parts = [re.sub(r"\s+", " ", x).strip() for x in name.split(",")]
        if len(parts) == 2 and parts[0] == parts[1]:
            name = parts[0]
        elif all(len(x.split()) >= 2 for x in parts):
            name, shared = " / ".join(parts), True
        else:
            name = " ".join(parts)
    name = re.sub(r"\s*-\s*", "-", name)          # 'Gyebi- Buaben' -> 'Gyebi-Buaben'
    name = re.sub(r"\s+", " ", name).strip()
    if not shared and " " not in name and name.count("-") >= 1:  # 'Chrisman-Kyei' -> 'Chrisman Kyei'
        name = name.replace("-", " ", 1)
    return name, shared


TRANSLIT = str.maketrans({"ä": "ae", "ö": "oe", "ü": "ue", "ß": "ss", "Ä": "Ae", "Ö": "Oe", "Ü": "Ue"})


def match_key(name):
    """Schluessel, unter dem Schreibvarianten derselben Person zusammenfallen ('Högl' = 'Hoegl')."""
    name = unicodedata.normalize("NFKD", name.translate(TRANSLIT)).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z]", "", name)


def levenshtein(a, b, limit=3):
    if abs(len(a) - len(b)) > limit:
        return limit + 1
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


def num(value):
    if value is None:
        return None
    if isinstance(value, float) and value.is_integer():
        return int(value)
    return value


def load_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def read_csv(path):
    with open(path, encoding="utf-8", newline="") as f:
        return [row for row in csv.DictReader(f) if any(v.strip() for v in row.values() if v)]


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


# --------------------------------------------------------------------------- load

def load_sources():
    if not DB_PATH.exists():
        sys.exit(f"Datenbank fehlt: {DB_PATH}")
    conn = sqlite3.connect(f"file:{DB_PATH.as_posix()}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    with gzip.open(GAMELIST_PATH, "rt", encoding="utf-8") as f:
        gamelist = {g["_id"]: g for g in json.load(f)}
    return conn, gamelist


def load_curation():
    teams = load_json(CURATION / "teams.json")["franchises"]
    team_by_name = {}
    for t in teams:
        for n in t["names"]:
            team_by_name[n] = t["id"]
    return {
        "teams": teams,
        "team_by_name": team_by_name,
        "excluded": {g["id"]: g for g in load_json(CURATION / "excluded_games.json")["games"]},
        "swaps": load_json(CURATION / "game_corrections.json")["swap_home_away"],
        "aliases": {clean_name(r["alias"])[0]: (clean_name(r["canonical"])[0], r["reason"])
                    for r in read_csv(CURATION / "player_aliases.csv")},
        "keep_separate": {frozenset((match_key(r["name_a"]), match_key(r["name_b"])))
                          for r in read_csv(CURATION / "player_keep_separate.csv")},
        "role_overrides": read_csv(CURATION / "role_overrides.csv"),
        "videos": load_json(CURATION / "videos.json")["videos"],
        "game_videos": load_json(CURATION / "game_videos.json")["videos"],
    }


# --------------------------------------------------------------------------- game highlight videos

YOUTUBE_ID = re.compile(r"^[A-Za-z0-9_-]{11}$")


def attach_game_videos(games, videos):
    """Haengt geprueft zugeordnete Highlight-Videos (curation/game_videos.json) an die Spiele.

    Bricht ab, wenn ein Eintrag nicht eindeutig zu den Daten passt: unbekannte Game-ID, ungueltige
    YouTube-ID, doppelt verwendetes Video oder ein Lesehinweis 'game', dessen Datum/Teams abweichen.
    """
    seen = {}
    for gid, v in videos.items():
        g = games.get(gid)
        if g is None:
            raise SystemExit(f"game_videos.json: Spiel {gid} gibt es nicht (oder es ist ausgeschlossen)")
        yid = v.get("youtubeId", "")
        if not YOUTUBE_ID.match(yid):
            raise SystemExit(f"game_videos.json: ungueltige YouTube-ID bei Spiel {gid}: {yid!r}")
        if yid in seen:
            raise SystemExit(f"game_videos.json: Video {yid} ist zwei Spielen zugeordnet ({seen[yid]}, {gid})")
        seen[yid] = gid
        hint = v.get("game")
        if hint:
            m = re.match(r"^(\d{4}-\d{2}-\d{2}) (\S+) @ (\S+)", hint)
            if not m or (m.group(1), m.group(2), m.group(3)) != (g["date"], g["away"], g["home"]):
                raise SystemExit(f"game_videos.json: Hinweis {hint!r} passt nicht zu Spiel {gid} "
                                 f"({g['date']} {g['away']} @ {g['home']})")
        g["video"] = {"youtubeId": yid, "title": v.get("title") or "Game Highlights",
                      "channel": v.get("channel"), "published": v.get("published")}


# --------------------------------------------------------------------------- team stats per game

TEAM_STAT_KEYS = {
    # eigene Werte der Perspektive (Heimteam laut Quelle)      Gegnerwert (allowed_*)
    "points": ("points", "allowed_points"),
    "rushAtt": ("run", "allowed_run"),
    "rushYds": ("runyards", "allowed_runyards"),
    "passAtt": ("pass", "allowed_pass"),
    "passCmp": ("catched", "allowed_catched"),
    "passYds": ("passingyards", "allowed_passingyards"),
    "thirdAtt": ("try3rddown", "allowed_try3rddown"),
    "thirdConv": ("conversion3rddown", "allowed_conversion3rddown"),
    "fourthAtt": ("try4thdown", "allowed_try4thdown"),
    "fourthConv": ("conversion4thdown", "allowed_conversion4thdown"),
    "redzone": ("redzone", "allowed_redzone"),
    "redzoneTd": ("redzonetd", "allowed_redzonetd"),
}
OWN_ONLY = {"firstDowns": "firstdown", "penalties": "penalty", "penaltyYds": "penaltyyards",
            "timeOfPossession": "timeofpossession", "totalYds": "totalyards"}


def team_game_stats(stats):
    """statsexist beschreibt das Heimteam laut Quelle; allowed_* das Gastteam."""
    own, opp = {}, {}
    for key, (own_key, opp_key) in TEAM_STAT_KEYS.items():
        if stats.get(own_key) is not None:
            own[key] = num(stats[own_key])
        if stats.get(opp_key) is not None:
            opp[key] = num(stats[opp_key])
    for key, src in OWN_ONLY.items():
        if stats.get(src) not in (None, ""):
            own[key] = stats[src] if key == "timeOfPossession" else num(stats[src])
    return own, opp


# --------------------------------------------------------------------------- build

def build(write=True):
    conn, gamelist = load_sources()
    cur = load_curation()
    fields = load_json(FIELDS_PATH)["fields"]
    field_keys = [f["key"] for f in fields]
    agg = {f["key"]: f["agg"] for f in fields}
    report = {"corrections": [], "warnings": [], "checks": []}

    def unknown_team(name):
        report["warnings"].append(f"Team ohne Franchise-Zuordnung: {name} (in curation/teams.json ergaenzen)")
        tid = slugify(name)
        cur["team_by_name"][name] = tid
        cur["teams"].append({"id": tid, "name": name, "short": name, "abbr": name[:3].upper(),
                             "names": [name], "colors": None, "logo": None, "sources": []})
        return tid

    def team_id(name):
        return cur["team_by_name"].get(name) or unknown_team(name)

    # ---- games
    games = {}
    swapped = 0
    for r in conn.execute("""
        SELECT g.*, h.name AS home, a.name AS away FROM games g
        JOIN teams h ON h.id = g.home_team_id JOIN teams a ON a.id = g.away_team_id"""):
        gid = r["id"]
        if gid in cur["excluded"]:
            report["corrections"].append({"type": "Spiel ausgeschlossen", "id": gid,
                                          "detail": cur["excluded"][gid]["label"],
                                          "reason": cur["excluded"][gid]["reason"]})
            continue
        src = gamelist.get(gid, {})
        home, away, hs, as_ = r["home"], r["away"], r["home_score"], r["away_score"]
        # statsexist beschreibt das Heimteam laut Quelle (= Heimteam in der Datenbank), allowed_* den Gegner
        own, opp = team_game_stats(src.get("statsexist") or {})
        team_stats = {team_id(home): own, team_id(away): opp}
        for rule in cur["swaps"]:
            name = r["name"] or ""
            if r["season"] == rule["season"] and " at " in name and name.split(" at ")[0].strip() == home:
                home, away, hs, as_ = away, home, as_, hs
                swapped += 1
        hid, aid = team_id(home), team_id(away)
        games[gid] = {
            "id": gid, "season": r["season"], "type": "playoff" if r["gametype"] == "Playoff" else "regular",
            "date": r["date"], "name": r["name"], "home": hid, "away": aid,
            "homeScore": hs, "awayScore": as_,
            "teamStats": {hid: team_stats.get(hid, {}), aid: team_stats.get(aid, {})},
            "statsSource": "presto" if src.get("imported") == "presto" else "statsnscore",
        }
    attach_game_videos(games, cur["game_videos"])
    if swapped:
        report["corrections"].append({"type": "Heim/Gast getauscht", "id": "Saison 2023",
                                      "detail": f"{swapped} Spiele", "reason": cur["swaps"][0]["reason"]})

    # ---- players: Schreibweisen zusammenfuehren
    # Stufe 1: bereinigen + Alias-Liste -> Schluessel. Stufe 2: Tippfehler (max. 2 Zeichen
    # Abstand, gleiches Team, nie im selben Spiel). Stufe 3: Anzeigename waehlen.
    raw_names = [r["name"] for r in conn.execute("SELECT name FROM players")]
    rows_per_name = Counter()
    games_of_raw, teams_of_raw = defaultdict(set), defaultdict(set)
    for r in conn.execute("""SELECT p.name, t.name AS team, s.game_id FROM player_game_stats s
                             JOIN players p ON p.id = s.player_id JOIN teams t ON t.id = s.team_id"""):
        if r["game_id"] in games:
            rows_per_name[r["name"]] += 1
            games_of_raw[r["name"]].add(r["game_id"])
            teams_of_raw[r["name"]].add(team_id(r["team"]))

    info = {}  # raw -> (canonical, shared, alias_reason)
    for raw in raw_names:
        cleaned, shared = clean_name(raw)
        canonical, reason = cur["aliases"].get(cleaned, (cleaned, None))
        info[raw] = (canonical, shared, reason)

    parent = {}
    def find(k):
        parent.setdefault(k, k)
        while parent[k] != k:
            parent[k] = parent[parent[k]]
            k = parent[k]
        return k

    key_games, key_teams, key_shared = defaultdict(set), defaultdict(set), {}
    for raw, (canonical, shared, _) in info.items():
        k = match_key(canonical) + ("#shared" if shared else "")
        find(k)
        key_games[k] |= games_of_raw[raw]
        key_teams[k] |= teams_of_raw[raw]
        key_shared[k] = shared

    fuzzy_merged = []
    by_team = defaultdict(list)
    for k, teams_ in key_teams.items():
        if not key_shared[k]:
            for t in teams_:
                by_team[t].append(k)
    for t, keys in by_team.items():
        keys = sorted(keys)
        for i, a in enumerate(keys):
            for b in keys[i + 1:]:
                if frozenset((a, b)) in cur["keep_separate"] or find(a) == find(b):
                    continue
                if levenshtein(a, b, 2) <= 2 and min(len(a), len(b)) >= 8:
                    ga = set().union(*(key_games[x] for x in key_games if find(x) == find(a)))
                    gb = set().union(*(key_games[x] for x in key_games if find(x) == find(b)))
                    if ga & gb:
                        continue  # im selben Spiel -> zwei Personen
                    parent[find(b)] = find(a)
                    fuzzy_merged.append((a, b))

    groups = defaultdict(list)
    for raw, (canonical, shared, _) in info.items():
        groups[find(match_key(canonical) + ("#shared" if shared else ""))].append(raw)

    player_of_raw, players = {}, {}
    for key, members in groups.items():
        weight = Counter()
        for raw in members:
            weight[info[raw][0]] += rows_per_name[raw]
        # Anzeigename: Umlaut-Schreibweise vor Umschrift, dann haeufigste, dann vollstaendigste, dann mit Grossbuchstaben (McGovern)
        display = sorted(weight, key=lambda n: (-any(ord(ch) > 127 for ch in n), -weight[n],
                                                -len(n.replace(" ", "")), -sum(ch.isupper() for ch in n), n))[0]
        pid = slugify(display)
        while pid in players:
            pid += "-2"
        variants = sorted(set(members))
        shared = any(info[m][1] for m in members)
        players[pid] = {"id": pid, "name": display, "sourceNames": variants, "shared": shared}
        for raw in members:
            player_of_raw[raw] = pid
        if len(variants) > 1:
            reasons = {info[m][2] for m in members if info[m][2]}
            keys = {match_key(info[m][0]) for m in members}
            how = "; ".join(sorted(reasons)) if reasons else (
                "Tippfehler (max. 2 Zeichen Abstand, gleiches Team, nie im selben Spiel)" if len(keys) > 1
                else "abweichende Schreibweise (Leerzeichen, Bindestrich, Umlaut, Groß-/Kleinschreibung)")
            report["corrections"].append({"type": "Spieler zusammengefuehrt", "id": pid, "name": display,
                                          "variants": variants,
                                          "detail": " | ".join(repr(v) for v in variants) + f" -> {display}",
                                          "reason": how})
        elif variants[0] != display:
            report["corrections"].append({"type": "Name bereinigt", "id": pid,
                                          "detail": f"{variants[0]!r} -> {display}",
                                          "reason": "geteilter Eintrag zweier Spieler" if shared
                                          else "Leer-/Sonderzeichen oder fehlendes Leerzeichen"})

    # ---- player game rows
    cols = ", ".join(f"s.{k}" for k in field_keys)
    pg_rows = []
    for r in conn.execute(f"""
        SELECT s.game_id, p.name AS player, t.name AS team, {cols}
        FROM player_game_stats s JOIN players p ON p.id = s.player_id JOIN teams t ON t.id = s.team_id"""):
        if r["game_id"] not in games:
            continue
        stats = {k: num(r[k]) for k in field_keys if r[k] is not None}
        pg_rows.append({"g": r["game_id"], "p": player_of_raw[r["player"]], "t": team_id(r["team"]), "s": stats})

    # Doppelte Zeilen (gleicher Spieler, gleiches Spiel nach Zusammenfuehrung)?
    dup = Counter((x["g"], x["p"]) for x in pg_rows)
    for (g, p), n in dup.items():
        if n > 1:
            report["warnings"].append(f"Spieler {p} steht nach Zusammenfuehrung {n}x im Spiel {g} - bitte pruefen")

    # ---- field availability per season
    # Die Quelle hat zwei Erfassungsformate: importierte Statistikboegen (2023/24, "presto") und
    # direkt erfasste Spiele (ab 2025). Ein Feld gilt in einer Saison als erfasst, wenn es im
    # ueberwiegenden Format dieser Saison in mindestens einem Spiel vorkommt. So bleiben seltene
    # Ereignisse (Spikes, Safeties) "erfasst", obwohl sie nur in wenigen Spielen auftreten.
    seasons = sorted({g["season"] for g in games.values()})
    season_format = {s: Counter(g["statsSource"] for g in games.values() if g["season"] == s).most_common(1)[0][0]
                     for s in seasons}
    format_fields = defaultdict(set)
    for x in pg_rows:
        format_fields[games[x["g"]]["statsSource"]].update(x["s"])
    availability = {k: [s for s in seasons if k in format_fields[season_format[s]]] for k in field_keys}

    # ---- season aggregates per player (gesamt und je Team)
    def add(total, stats):
        for k, v in stats.items():
            if agg[k] == "max":
                total[k] = v if total.get(k) is None else max(total[k], v)
            else:
                total[k] = num(round(total.get(k, 0) + v, 2))

    ps = {}
    for x in pg_rows:
        g = games[x["g"]]
        for scope in ("all", g["type"]):
            key = (x["p"], g["season"], scope)
            e = ps.setdefault(key, {"player": x["p"], "season": g["season"], "scope": scope,
                                    "games": 0, "teams": [], "stats": {}, "_g": set()})
            if x["g"] not in e["_g"]:
                e["_g"].add(x["g"])
                e["games"] += 1
            if x["t"] not in e["teams"]:
                e["teams"].append(x["t"])
            add(e["stats"], x["s"])

    # ---- roles (abgeleitet, auf Basis Saison gesamt)
    def role_of(games_played, s):
        g = lambda k: s.get(k, 0) or 0
        att, car, rec = g("pass"), g("run"), g("catched")
        tkl = g("tackletotal") + g("sacktotal") + g("intercepted") + g("brokenuppass")
        kick = g("fieldgoaltry") + g("fieldgoalgood") + g("patkick") + g("patkickgood") + g("kickoff")
        offense = att + car + rec
        if att >= max(20, 2 * games_played):
            return "QB"
        if kick >= 5 and offense < 5:
            return "K"
        if g("punt") >= 5 and offense < 5:
            return "P"
        if car >= max(15, rec * 1.5):
            return "RB"
        if rec >= 5 and rec >= car:
            return "WR/TE"
        if tkl >= 3 and offense <= 2:
            return "DEF"
        return None

    overrides = {(o["player_id"], int(o["season"])): o["role"] for o in cur["role_overrides"]}
    roles = {}
    for (pid, season, scope), e in ps.items():
        if scope == "all":
            role = overrides.get((pid, season)) or role_of(e["games"], e["stats"])
            roles[(pid, season)] = {"role": role, "source": "manuell" if (pid, season) in overrides else "abgeleitet"}

    # ---- team seasons
    ts = {}
    for g in games.values():
        for side, opp in (("home", "away"), ("away", "home")):
            tid, oid = g[side], g[opp]
            pf, pa = g[f"{side}Score"], g[f"{opp}Score"]
            for scope in ("all", g["type"]):
                e = ts.setdefault((tid, g["season"], scope), {
                    "team": tid, "season": g["season"], "scope": scope, "games": 0, "wins": 0,
                    "losses": 0, "ties": 0, "pointsFor": 0, "pointsAgainst": 0, "offense": {}, "defenseAllowed": {}})
                e["games"] += 1
                e["pointsFor"] += pf or 0
                e["pointsAgainst"] += pa or 0
                e["wins" if pf > pa else "losses" if pf < pa else "ties"] += 1
    team_offense_keys = ["passingyards", "touchdownpass", "interception", "run", "runyards", "touchdownrun",
                         "catched", "receivingyards", "fumbledandlost", "touchdown", "tackletotal", "sacktotal",
                         "intercepted", "forcedfumble", "penalty", "penaltyyards"]
    for x in pg_rows:
        g = games[x["g"]]
        opp = g["away"] if x["t"] == g["home"] else g["home"]
        for scope in ("all", g["type"]):
            off = ts[(x["t"], g["season"], scope)]["offense"]
            allowed = ts[(opp, g["season"], scope)]["defenseAllowed"]
            for k in team_offense_keys:
                v = x["s"].get(k)
                if v is not None:
                    off[k] = num(round(off.get(k, 0) + v, 2))
                    allowed[k] = num(round(allowed.get(k, 0) + v, 2))

    # ---- checks against the database (nach Ausschluessen)
    excl = tuple(cur["excluded"]) or ("",)
    ph = ",".join("?" * len(excl))
    for k in field_keys:
        db_val = conn.execute(f"SELECT {'MAX' if agg[k] == 'max' else 'SUM'}({k}) FROM player_game_stats "
                              f"WHERE game_id NOT IN ({ph})", excl).fetchone()[0]
        vals = [x["s"][k] for x in pg_rows if k in x["s"]]
        ours = (max(vals) if vals else None) if agg[k] == "max" else (round(sum(vals), 2) if vals else None)
        ok = (num(db_val) == num(ours)) or (db_val is not None and ours is not None and abs(db_val - ours) < 1e-6)
        report["checks"].append({"check": f"Summe {k}", "db": num(db_val), "website": num(ours), "ok": bool(ok)})
    db_rows = conn.execute(f"SELECT COUNT(*) FROM player_game_stats WHERE game_id NOT IN ({ph})", excl).fetchone()[0]
    report["checks"].append({"check": "Spieler-Spiel-Zeilen", "db": db_rows, "website": len(pg_rows),
                             "ok": db_rows == len(pg_rows)})
    db_games = conn.execute(f"SELECT COUNT(*) FROM games WHERE id NOT IN ({ph})", excl).fetchone()[0]
    report["checks"].append({"check": "Spiele", "db": db_games, "website": len(games), "ok": db_games == len(games)})
    failed = [c for c in report["checks"] if not c["ok"]]
    conn.close()

    # ---- output
    team_meta = {t["id"]: t for t in cur["teams"]}
    team_seasons_by_team = defaultdict(dict)
    for (pid, season, scope), e in ps.items():
        if scope == "all":
            for t in e["teams"]:
                team_seasons_by_team[t].setdefault(season, set()).add(pid)
    team_names_by_season = defaultdict(dict)
    with sqlite3.connect(f"file:{DB_PATH.as_posix()}?mode=ro", uri=True) as c2:
        for season, name in c2.execute("""SELECT DISTINCT g.season, t.name FROM player_game_stats s
                                         JOIN games g ON g.id = s.game_id JOIN teams t ON t.id = s.team_id"""):
            team_names_by_season[cur["team_by_name"][name]][season] = name

    out_players = []
    for pid, p in sorted(players.items()):
        seasons_of = []
        for (q, season, scope), e in ps.items():
            if q == pid and scope == "all":
                seasons_of.append({"season": season, "teams": e["teams"], "games": e["games"],
                                   **roles[(pid, season)]})
        if not seasons_of:
            continue
        seasons_of.sort(key=lambda s: s["season"])
        out_players.append({**p, "seasons": seasons_of,
                            "videos": [v for v in cur["videos"] if v["player"] == pid]})

    out_teams = []
    for tid, t in sorted(team_meta.items()):
        if tid not in team_names_by_season:
            continue
        logo = t.get("logo") or {}
        logo_file = OUT.parent / "logos" / logo["file"] if logo.get("file") else None
        out_teams.append({"id": tid, "name": t["name"], "short": t["short"], "abbr": t["abbr"],
                          "namesBySeason": {str(s): n for s, n in sorted(team_names_by_season[tid].items())},
                          "colors": t.get("colors"),
                          # Logo nur, wenn die Datei heruntergeladen wurde (scripts/download_logos.py)
                          "logo": f"logos/{logo['file']}" if logo_file and logo_file.exists() else None,
                          "logoSource": logo.get("url") if logo_file and logo_file.exists() else None,
                          "logoPage": logo.get("sourcePage") if logo_file and logo_file.exists() else None,
                          "sources": t.get("sources", []), "note": t.get("note")})

    meta = {
        "builtAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": {"database": "gflstats.db", "databaseSha256": sha256(DB_PATH),
                   "gamelist": "data/raw/statsnscore/gamelist.json.gz", "gamelistSha256": sha256(GAMELIST_PATH),
                   "origin": "statsnscore.online"},
        "seasons": seasons,
        "currentSeason": max(seasons),
        "availability": availability,
        "availabilityRule": "Maßgeblich ist das Erfassungsformat der Saison: 2023/24 importierte Statistikbögen, ab 2025 direkt erfasste Spiele. Ein Wert gilt als erfasst, wenn das Format ihn in mindestens einem Spiel enthält.",
        "seasonFormat": season_format,
        "counts": {"games": len(games), "playerGameRows": len(pg_rows), "players": len(out_players), "teams": len(out_teams)},
        "corrections": report["corrections"],
        "warnings": report["warnings"],
        "checks": {"total": len(report["checks"]), "failed": failed},
    }

    print(f"Spiele: {len(games)}  Spieler: {len(out_players)}  Zeilen: {len(pg_rows)}  Teams: {len(out_teams)}")
    print(f"Korrekturen: {Counter(c['type'] for c in report['corrections'])}")
    for w in report["warnings"]:
        print("WARNUNG:", w)
    print(f"Abgleich mit Datenbank: {len(report['checks']) - len(failed)}/{len(report['checks'])} ok")
    for f in failed:
        print("  ABWEICHUNG:", f)

    if failed:
        sys.exit("Abgleich fehlgeschlagen - keine Dateien geschrieben.")
    if not write:
        return

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "pg").mkdir(exist_ok=True)

    def dump(name, data):
        with open(OUT / name, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, separators=(",", ":"))

    dump("meta.json", meta)
    dump("teams.json", out_teams)
    dump("players.json", out_players)
    dump("games.json", sorted(games.values(), key=lambda g: (g["date"] or "", g["id"])))
    dump("player_seasons.json", sorted(
        [{k: v for k, v in e.items() if k != "_g"} for e in ps.values()],
        key=lambda e: (e["season"], e["player"], e["scope"])))
    dump("team_seasons.json", sorted(ts.values(), key=lambda e: (e["season"], e["team"], e["scope"])))
    for season in seasons:
        dump(f"pg/{season}.json", [x for x in pg_rows if games[x["g"]]["season"] == season])
    dump("checks.json", report["checks"])
    # Kompakter Suchindex fuer die globale Suche: [Typ, ID, Name, Zusatz]
    abbr = {t["id"]: t["abbr"] for t in out_teams}
    search = [["t", t["id"], t["name"], "Team"] for t in out_teams]
    for pl in out_players:
        last = pl["seasons"][-1]
        span = f'{pl["seasons"][0]["season"]}' + (f'-{last["season"]}' if len(pl["seasons"]) > 1 else "")
        extra = " ".join(filter(None, [last["role"], "/".join(abbr.get(t, t) for t in last["teams"]), span]))
        search.append(["p", pl["id"], pl["name"], extra])
    dump("search.json", search)
    print(f"Geschrieben nach {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--check", action="store_true", help="nur pruefen, nichts schreiben")
    build(write=not ap.parse_args().check)
