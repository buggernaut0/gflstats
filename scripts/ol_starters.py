"""Starting Offensive Line je Team aus den offiziellen Starterlisten der Liga (statsnscore.online).

Hintergrund: Die Statistikboegen enthalten fuer Offensive Linemen praktisch keine Werte, und der Kader sagt nur,
wer zur Offensive Line gehoert - nicht, wer startet. Die Spielseiten von statsnscore.online
(https://statsnscore.online/stats/v2/gamedata?gameid=<id>, Abschnitt "Offense Starters") fuehren dagegen je Spiel
und Team die elf Starter der Offense, erfasst von der Statistik-Crew am Spieltag. Diese Listen sind die
Grundlage fuer die Starting Offensive Line der Website.

Was die Quelle NICHT hergibt: die Seite (Left/Right). Die Position ist meist nur "OL"; einige Teams tragen
"T"/"OT", "G"/"OG", "C"/"Center" ein. Daraus wird hoechstens die Rolle (Tackle, Guard, Center) uebernommen,
nie eine Seite. LT/LG/C/RG/RT ('slot') wird nur von Hand mit eigener Quelle gesetzt (siehe curation/README.md).

Aufrufe:
    python scripts/ol_starters.py fetch 2026            # Starterlisten aller Spiele laden -> data/raw/statsnscore/starters/2026.json.gz
    python scripts/ol_starters.py fetch 2026 --html DIR # stattdessen aus bereits gespeicherten Spielseiten (DIR/<gameid>.html)
    python scripts/ol_starters.py build 2026            # curation/ol_starters.json neu erzeugen (Teams mit "manual": true bleiben)

Regel fuer die Starting Five (build):
    - Massgeblich ist das letzte Spiel des Teams mit vollstaendiger Starterliste (mind. fuenf O-Liner).
    - Zuverlaessigkeit je Spieler: "hoch" = in diesem Spiel Starter UND in mindestens der Haelfte der Spiele mit
      Starterliste; "mittel" = im letzten Spiel Starter, sonst seltener (spaeter Wechsel, Verletzungsvertretung).
    - Zuordnung zur Spieler-ID nur ueber Team + Name (Nachname muss passen, dazu Vorname oder Rueckennummer).
      Ohne sichere Zuordnung bleibt 'player' null, der Name aus der Liga-Liste wird angezeigt.
"""

import argparse
import gzip
import html
import json
import re
import sys
import time
import unicodedata
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

RAW = ROOT / "data" / "raw" / "statsnscore"
CURATION = ROOT / "curation"
GAME_URL = "https://statsnscore.online/stats/v2/gamedata?gameid={}"
# Positionsangaben der Starterlisten, die zur Offensive Line gehoeren
OL_POS = {"OL", "T", "OT", "G", "OG", "C", "CENTER", "OG/C", "DL/OL"}
ROLE = {"T": "T", "OT": "T", "G": "G", "OG": "G", "C": "C", "CENTER": "C", "OG/C": "G/C"}
ROSTER_ROLE = {"TACKLE": "T", "OT": "T", "GUARD": "G", "OG": "G", "LG/RG": "G", "CENTER": "C", "C": "C"}


# --------------------------------------------------------------------------- fetch

def _starter_tables(page):
    """Liest die beiden Tabellen 'Offense Starters' (Heim, Gast) aus einer Spielseite."""
    out = {}
    for side, tid in (("home", "listHomeOffenseStarters"), ("guest", "listGuestOffenseStarters")):
        i = page.find(f'id="{tid}"')
        if i < 0:
            out[side] = None
            continue
        j = page.find("</table>", i)
        players = []
        for row in re.findall(r"<tr>(.*?)</tr>", page[i:j], re.S):
            tds = re.findall(r"<td[^>]*>(.*?)</td>", row, re.S)
            if len(tds) < 4:
                continue
            clean = lambda x: html.unescape(re.sub(r"<[^>]+>", "", x)).replace("�", "").strip()
            players.append({"number": clean(tds[0]), "position": clean(tds[2]), "name": clean(tds[3])})
        out[side] = players
    return out


def fetch(season, html_dir=None):
    from scrapers.statsnscore import wanted_games
    import requests

    with gzip.open(RAW / "gamelist.json.gz", "rt", encoding="utf-8") as f:
        games = wanted_games(json.load(f), season)
    session = requests.Session()
    session.headers["User-Agent"] = "gflstats (https://github.com/buggernaut0/gflstats)"
    result = []
    for g in games:
        if html_dir:
            page = (Path(html_dir) / f"{g['_id']}.html").read_bytes().decode("utf-8", "replace")
        else:
            time.sleep(1.0)
            r = session.get("https://statsnscore.online/stats/v2/gamedata", params={"gameid": g["_id"]}, timeout=60)
            r.raise_for_status()
            page = r.content.decode("utf-8", "replace")
        t = _starter_tables(page)
        result.append({"game": g["_id"], "date": g["dateformat"], "gametype": g["gametype"], "gamename": g["gamename"],
                       "home": g["hometeam"], "guest": g["guestteam"], "homeStarters": t["home"], "guestStarters": t["guest"]})
    path = RAW / "starters" / f"{season}.json.gz"
    path.parent.mkdir(parents=True, exist_ok=True)
    with gzip.open(path, "wt", encoding="utf-8") as f:
        json.dump({"source": "statsnscore.online gamedata, Abschnitt 'Offense Starters'", "retrieved": date.today().isoformat(),
                   "games": result}, f, ensure_ascii=False)
    print(f"{len(result)} Spiele -> {path.relative_to(ROOT)}")


# --------------------------------------------------------------------------- build

def tokens(name):
    n = unicodedata.normalize("NFKD", name.lower())
    n = "".join(c for c in n if not unicodedata.combining(c)).replace("ß", "ss")
    return [t for t in re.split(r"[^a-z]+", n) if t]


def same_person(sheet_name, sheet_number, entry):
    """Nachname muss passen, dazu Vorname (auch Kurzform/Initial) oder Rueckennummer."""
    a, b = tokens(sheet_name), tokens(entry["name"])
    if not a or not b:
        return False
    first = a[0] == b[0] or a[0].startswith(b[0]) or b[0].startswith(a[0])
    number = str(entry.get("number")) == str(sheet_number)
    if a[-1] in b or b[-1] in a:
        return first or number
    # Tippfehler im Nachnamen (z. B. Carmenz/Camenz, Fleury/Fuery): nur mit Vorname UND Rueckennummer,
    # hoechstens zwei Zeichen Unterschied
    return first and number and min(edits(a[-1], x) for x in b) <= 2


def edits(a, b):
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


def date_key(d):
    return tuple(int(x) for x in d.split("-"))


def build(season):
    with gzip.open(RAW / "starters" / f"{season}.json.gz", "rt", encoding="utf-8") as f:
        raw = json.load(f)
    teams = json.load(open(CURATION / "teams.json", encoding="utf-8"))["franchises"]
    team_id = {n: t["id"] for t in teams for n in t["names"]}
    rosters = json.load(open(CURATION / "rosters.json", encoding="utf-8"))["rosters"].get(str(season), {})
    players_path = ROOT / "web" / "public" / "data" / "players.json"
    players = json.load(open(players_path, encoding="utf-8")) if players_path.exists() else []
    path = CURATION / "ol_starters.json"
    existing = json.load(open(path, encoding="utf-8")) if path.exists() else {"starters": {}}

    per_team = defaultdict(list)
    for g in raw["games"]:
        for side, opp in (("home", "guest"), ("guest", "home")):
            per_team[team_id[g[side]]].append({"game": g["game"], "date": g["date"], "gametype": g["gametype"],
                                                "opponent": team_id[g[opp]], "starters": g[f"{side}Starters"] or []})

    out = {}
    report = []
    for tid in sorted(per_team):
        old = existing.get("starters", {}).get(str(season), {}).get(tid)
        if old and old.get("manual"):
            out[tid] = old
            report.append(f"{tid}: von Hand gepflegt, unveraendert")
            continue
        roster = rosters.get(tid, {}).get("players", [])
        # Kandidaten fuer die Zuordnung: Kader des Teams, ohne Kader die Spieler des Teams aus players.json
        candidates = roster or [{"name": p["name"], "number": None, "player": p["id"], "position": None}
                                for p in players for s in p["seasons"] if s["season"] == season and tid in s["teams"]]

        def ol_rows(starters):
            rows = []
            for p in starters:
                pos = p["position"].upper()
                if pos in OL_POS:
                    rows.append(p)
                elif pos == "":
                    # ohne Positionsangabe: nur wenn der Kader den Spieler als O-Liner fuehrt
                    m = next((e for e in roster if same_person(p["name"], p["number"], e)), None)
                    if m and m["position"] == "OL":
                        rows.append(p)
            return rows

        def match(p):
            hits = [e for e in candidates if same_person(p["name"], p["number"], e)]
            return hits[0] if len(hits) == 1 else None

        games = sorted(per_team[tid], key=lambda x: date_key(x["date"]))
        # Starts zaehlen in jedem Spiel mit O-Linern in der Liste; die Starting Five kommt aus dem letzten Spiel
        # mit vollstaendiger Liste (mind. fuenf O-Liner)
        listed = [g for g in games if ol_rows(g["starters"])]
        if not any(len(ol_rows(g["starters"])) >= 5 for g in listed):
            report.append(f"{tid}: keine vollstaendige Starterliste")
            continue
        # Starts je Person (Schluessel: zugeordneter Kader-Eintrag, sonst Name aus der Liste)
        starts = defaultdict(lambda: {"starts": 0, "playoff": 0, "last": None, "names": Counter(), "numbers": Counter(), "roles": Counter()})
        keyed = []
        for g in listed:
            row = []
            for p in ol_rows(g["starters"]):
                m = match(p)
                key = (("id", m["player"]) if m["player"] else ("roster", m["name"])) if m else ("name", " ".join(tokens(p["name"])))
                s = starts[key]
                s["starts"] += 1
                s["playoff"] += g["gametype"] == "Playoff"
                s["last"] = g["date"]
                s["names"][p["name"]] += 1
                s["numbers"][p["number"]] += 1
                if ROLE.get(p["position"].upper()):
                    s["roles"][ROLE[p["position"].upper()]] += 1
                row.append((key, p, m))
            keyed.append((g, row))
        last_game, last_row = [(g, row) for g, row in keyed if len(row) >= 5][-1]
        n = len(listed)
        line = []
        for key, p, m in last_row:
            s = starts[key]
            role = ROLE.get(p["position"].upper())
            role_source = "Starterliste" if role else None
            if not role and m and ROSTER_ROLE.get(str(m.get("detail", "")).upper()):
                role, role_source = ROSTER_ROLE[str(m["detail"]).upper()], "Kader"
            sheet_no = int(p["number"]) if p["number"].isdigit() else None
            # Rueckennummer: website-weit gilt der Kader (eine Quelle fuer Nummern); abweichende Listen-Nummer in sourceNumber
            entry = {"number": m["number"] if m and m.get("number") is not None else sheet_no,
                     "name": m["name"] if m else p["name"], "sourceName": p["name"],
                     "player": m["player"] if m else None,
                     "role": role, "roleSource": role_source, "slot": None,
                     "starts": s["starts"], "playoffStarts": s["playoff"],
                     "confidence": "hoch" if s["starts"] * 2 >= n else "mittel"}
            if not m:
                entry["note"] = ("nicht eindeutig einem Kader-Eintrag zugeordnet - Name und Nummer laut Starterliste" if roster
                                 else "kein Kader hinterlegt und kein Spielerprofil gefunden - Name und Nummer laut Starterliste")
            elif m.get("number") is not None and str(m["number"]) != p["number"]:
                entry["sourceNumber"] = sheet_no
                entry["note"] = f"Starterliste: Nr. {p['number']}, Kader: Nr. {m['number']} (angezeigt wird die Kadernummer)"
            line.append(entry)
        in_line = {k for k, _, _ in last_row}
        others = [{"number": int(s["numbers"].most_common(1)[0][0]) if s["numbers"].most_common(1)[0][0].isdigit() else None,
                   "name": s["names"].most_common(1)[0][0], "player": k[1] if k[0] == "id" else None,
                   "starts": s["starts"], "lastStart": s["last"]}
                  for k, s in sorted(starts.items(), key=lambda kv: -kv[1]["starts"]) if k not in in_line]
        first = keyed[0]
        regular = [(g, row) for g, row in keyed if g["gametype"] != "Playoff"]
        playoff = [(g, row) for g, row in keyed if g["gametype"] == "Playoff"]
        five = lambda row: sorted(int(p["number"]) for _, p, _ in row if p["number"].isdigit())
        out[tid] = {
            "basis": "letztes Spiel mit vollstaendiger Starterliste",
            "lastListed": "%04d-%02d-%02d" % date_key(listed[-1]["date"]),
            "game": last_game["game"], "date": "%04d-%02d-%02d" % date_key(last_game["date"]),
            "gametype": last_game["gametype"], "opponent": last_game["opponent"],
            "url": GAME_URL.format(last_game["game"]),
            "teamGames": len(games), "listedGames": n,
            "line": line,
            "otherStarters": others,
            "phases": {
                "first": {"date": "%04d-%02d-%02d" % date_key(first[0]["date"]), "numbers": five(first[1])},
                "lastRegular": {"date": "%04d-%02d-%02d" % date_key(regular[-1][0]["date"]), "numbers": five(regular[-1][1])} if regular else None,
                "playoffs": [{"date": "%04d-%02d-%02d" % date_key(g["date"]), "numbers": five(row)} for g, row in playoff],
            },
        }
        if len(line) != 5:
            report.append(f"{tid}: {len(line)} O-Liner im letzten Spiel")
        for e in line:
            if e.get("note"):
                report.append(f"{tid}: #{e['number']} {e['sourceName']}: {e['note']}")

    existing.setdefault("starters", {})[str(season)] = out
    existing["_info"] = (
        "Starting Offensive Line je Saison und Team. Quelle: offizielle Starterlisten der Liga auf statsnscore.online "
        "(Spielseite, Abschnitt 'Offense Starters'), erzeugt mit scripts/ol_starters.py. 'line' = die fuenf O-Liner "
        "des letzten Spiels mit vollstaendiger Liste (Reihenfolge wie in der Quelle, sagt nichts ueber die Seite). "
        "'role' = T/G/C nur, wenn Starterliste oder Kader es angeben; 'slot' (LT/LG/C/RG/RT) nur von Hand mit Quelle "
        "('slotSource'). 'confidence': hoch = auch in mind. der Haelfte der Spiele mit Liste Starter, mittel = sonst. "
        "'manual': true schuetzt einen Team-Eintrag vor dem Neuerzeugen.")
    existing["retrieved"] = raw.get("retrieved")
    with open(path, "w", encoding="utf-8") as f:
        json.dump({"_info": existing["_info"], "retrieved": existing["retrieved"], "starters": existing["starters"]},
                  f, ensure_ascii=False, indent=1)
        f.write("\n")
    print(f"{len(out)} Teams -> {path.relative_to(ROOT)}")
    for r in report:
        print("  ", r)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("command", choices=["fetch", "build"])
    ap.add_argument("season", type=int)
    ap.add_argument("--html", help="Ordner mit gespeicherten Spielseiten (<gameid>.html) statt Download")
    a = ap.parse_args()
    fetch(a.season, a.html) if a.command == "fetch" else build(a.season)
