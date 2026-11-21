"""Ordnet die Spielerfotos der offiziellen Roster-Seiten den Spielern der Website zu.

    python scripts/match_player_photos.py

Liest die Roster-Seiten (SOURCES), sucht je Spielerkarte Foto, Rückennummer und Namen und gleicht sie
mit dem offiziellen Kader 2026 (curation/rosters.json) ab. Ein Foto wird nur zugeordnet, wenn

  1. das Team stimmt (Seite des Vereins),
  2. die Rückennummer auf der Karte der Nummer im Kader entspricht,
  3. der Nachname vollständig und der Vorname (kleine Schreibvarianten erlaubt) auf der Karte stehen,
  4. genau ein Kadereintrag passt und dieser eine Spieler-ID hat,
  5. ein Name im Dateinamen (z. B. 2026_DDM_5_Lombardi-Rocky.png) nicht auf einen anderen Spieler zeigt,
  6. weder das Foto zwei Spielern noch einem Spieler zwei verschiedene Fotos derselben Quelle zugeordnet würden.

Alles andere bleibt unzugeordnet und steht mit Grund in curation/FOTO_ABGLEICH_2026.md.
Ergebnis: curation/player_photos.json (zentrale Zuordnung Spieler-ID → Foto + Quelle).
Die Bilder lädt und verkleinert danach `npm run photos` (web/scripts/player-photos.ts).
"""

import json
import re
import sys
import unicodedata
from collections import defaultdict
from datetime import date
from pathlib import Path
from urllib.parse import unquote, urljoin

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent.parent
ROSTERS = ROOT / "curation" / "rosters.json"
OUT = ROOT / "curation" / "player_photos.json"
REPORT = ROOT / "curation" / "FOTO_ABGLEICH_2026.md"
SEASON = "2026"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"

# Roster-Seiten mit Spielerfotos (Vorgabe des Projektinhabers, 21.11.2026). priority 0 = Vereinsseite.
# Hildesheim: der genannte Link zeigt die zweite Mannschaft – verwendet wird die GFL-Liste derselben Vereinsseite
# (auch Quelle in rosters.json). Schwäbisch Hall: offizielle Vereinsseite zuerst, sport.de nur ergänzend.
# Ohne Fotos: Berlin und Regensburg (Kader nur als PDF), Saarland (keine Seite genannt).
SOURCES = [
    ("dresden-monarchs", "https://www.dresden-monarchs.de/gfl-team/roster", 0),
    ("potsdam-royals", "https://www.potsdamroyals.de/gfl/roster-2026/", 0),
    ("hildesheim-invaders", "https://goinvaders.de/list/invaders-2026-glf/", 0),
    ("duesseldorf-panther", "https://duesseldorfpanther.de/gfl-team/roster/", 0),
    ("kiel-baltic-hurricanes", "https://www.baltic-hurricanes.de/gfl/roster.html", 0),
    ("braunschweig-lions", "https://braunschweig-lions.de/roster/", 0),
    ("munich-cowboys", "https://www.munich-cowboys.de/gfl-roster/", 0),
    ("pforzheim-wilddogs", "https://wilddogs.de/teams/seniors-i", 0),
    ("ravensburg-razorbacks", "https://ifm-razorbacks.de/team/ifm-razorbacks/roster/", 0),
    ("schwaebisch-hall-unicorns", "https://unicorns.de/team/gfl-team/roster", 0),
    ("schwaebisch-hall-unicorns", "https://www.sport.de/american-football/te56453/schwaebisch-hall-unicorns/kader/", 1),
    ("allgaeu-comets", "https://allgaeu-comets.de/team/gfl-roster/", 0),
    ("straubing-spiders", "https://straubing-spiders.de/mannschaft-srs/roster/", 0),
]
NOT_COVERED = {
    "berlin-rebels": "Kader nur als PDF ohne Fotos",
    "regensburg-phoenix": "Kader nur als PDF ohne Fotos",
    "saarland-hurricanes": "keine Roster-Seite mit Fotos angegeben",
}

SKIP = re.compile(r"flag|logo|sponsor|partner|icon|banner|favicon|\.svg|header|footer|placeholder|dummy|social|effect", re.I)
SUFFIX = {"jr", "sr", "ii", "iii", "iv"}
SIZE = re.compile(r"-\d+x\d+(?=\.\w+$)")


def norm(s):
    s = s.replace("\xad", "").replace("ß", "ss")
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c)).lower()
    return re.sub(r"[^a-z0-9 ]+", " ", s)


def toks(s):
    return [t for t in norm(s).split() if t]


def tr(t):
    return t.replace("ae", "a").replace("oe", "o").replace("ue", "u")


def lev(a, b):
    d = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        p, d[0] = d[0], i
        for j, cb in enumerate(b, 1):
            p, d[j] = d[j], min(d[j] + 1, d[j - 1] + 1, p + (ca != cb))
    return d[-1]


def similar(a, b):
    a, b = tr(a), tr(b)
    if a == b:
        return True
    if min(len(a), len(b)) >= 4 and (a in b or b in a):
        return True
    return lev(a, b) <= max(1, int(max(len(a), len(b)) * 0.34))


def number_of(text):
    m = re.search(r"#\s*\(?(\d{1,2})\b", text)
    if m:
        return int(m.group(1))
    for f in (x.strip() for x in text.split("|")):
        if re.fullmatch(r"\d{1,2}", f):
            return int(f)
    return None


def best_src(el):
    if el.name != "img":
        m = re.search(r"url\(['\"]?([^'\")]+)", el.get("style", ""))
        return m.group(1) if m else None
    src = next((el.get(a) for a in ("data-src", "data-lazy-src", "src") if el.get(a) and not el.get(a).startswith("data:")), None)
    srcset = el.get("data-srcset") or el.get("srcset")
    if srcset:
        def width(p):
            try:
                return int(p[1].rstrip("w")) if len(p) > 1 else 0
            except ValueError:
                return 0
        parts = sorted((p.strip().split(" ") for p in srcset.split(",") if p.strip()), key=width)
        if parts:
            src = parts[-1][0]
    return src


def cards(html, base):
    """Jedes Foto mit dem Text seiner Karte (größter Block, der nur dieses eine Foto enthält)."""
    soup = BeautifulSoup(html, "html.parser")
    tag = soup.find("base", href=True)
    if tag:  # relative Bildpfade beziehen sich auf <base href>, nicht auf die Seitenadresse
        base = urljoin(base, tag["href"])
    found = []
    for el in soup.find_all("img"):
        s = best_src(el)
        if s and not SKIP.search(s):
            found.append((el, urljoin(base, s)))
    for el in soup.find_all(style=re.compile(r"background-image", re.I)):
        s = best_src(el)
        if s and not SKIP.search(s):
            found.append((el, urljoin(base, s)))
    ids = {id(e) for e, _ in found}
    for el, url in found:
        card = el
        while card.parent is not None and card.parent.name not in ("body", "html", "[document]"):
            p = card.parent
            if sum(1 for x in p.find_all(True) if id(x) in ids) + (id(p) in ids) > 1:
                break
            card = p
        text = " | ".join(t.strip() for t in card.stripped_strings)
        link = card if card.name == "a" and card.get("href") else card.find("a", href=True)
        yield url, text, el.get("alt", "") or "", urljoin(base, link["href"]) if link else None


IMGPROXY = re.compile(r"/fn:([^/]+)/q:\d+/rs:fill:(\d+):(\d+)")


CONTAO_THUMB = re.compile(r"/assets/images/[^/]+/([^/]+)-[0-9a-f]{8}\.(png|jpe?g|webp)$", re.I)


def contao_original(url, href):
    """Dresden (Contao): Die Übersicht zeigt nur ein 60 × 80-px-Vorschaubild (assets/images/…/<name>-<hash>.png).
    Der Bild-Link der Karte (Lightbox) führt auf das Original files/…/<name>.png – gleicher Dateiname ohne Hash."""
    m = CONTAO_THUMB.search(url)
    if not m or not href:
        return None
    name = unquote(href.split("?")[0].rsplit("/", 1)[-1])
    return href if "/files/" in href and name == unquote(f"{m.group(1)}.{m.group(2)}") else None


def larger(url, href):
    """Kiel (imgproxy): Die Übersicht zeigt das Porträt nur in 80 × 100 px. Die Spielerseite des Vereins enthält
    dasselbe Bild (gleicher Dateiname fn:…) in größeren Stufen – davon die Stufe 512 × 640 bzw. die nächstgrößere."""
    original = contao_original(url, href)
    if original:
        return original
    m = IMGPROXY.search(url)
    if not m or not href or int(m.group(2)) >= 320:
        return url
    try:
        html = requests.get(href, headers={"User-Agent": UA}, timeout=60).text
    except requests.RequestException:
        return url
    options = []
    for u in set(re.findall(r'(/_img/[^"\s,]+)', html)):
        n = IMGPROXY.search(u)
        if n and n.group(1) == m.group(1):
            options.append((int(n.group(2)), urljoin(href, u)))
    big = sorted(o for o in options if o[0] >= 512)
    return big[0][1] if big else url


def main():
    roster = json.loads(ROSTERS.read_text(encoding="utf-8"))["rosters"][SEASON]
    today = date.today().isoformat()
    accepted = defaultdict(list)  # player-id -> [(prio, url, page, entry, cardtext)]
    rejected = []  # (team, grund, karte, foto)
    for team, page, prio in SOURCES:
        print(f"{team}: {page}", file=sys.stderr)
        html = requests.get(page, headers={"User-Agent": UA}, timeout=60).content
        players = roster[team]["players"]
        for url, text, alt, href in cards(html, page):
            num = number_of(text)
            words = set(toks(text + " " + alt))
            fn = re.search(r"/(\d{4}_[A-Z]{3}_\d+_[^/]+?)(?:-\d+x\d+)?\.(?:png|jpe?g|webp)", url)
            fn_words = {tr(t) for t in toks(unquote(fn.group(1)).replace("_", " ").replace("-", " "))} if fn else None
            hits, near = [], []
            for e in players:
                nt = [t for t in toks(e["name"]) if t not in SUFFIX]
                if not nt:
                    continue
                first, rest = nt[0], nt[1:]
                last_ok = all(t in words for t in rest) if rest else first in words
                first_ok = first in words or (len(first) >= 3 and any(t.startswith(first[:3]) for t in words)) \
                    or any(len(t) >= 5 and lev(t, first) <= 2 for t in words)
                if not last_ok:
                    continue
                if fn_words is not None and not any(similar(u, t) for t in (rest or nt) for u in fn_words if len(u) >= 3):
                    near.append((e, f"Dateiname „{fn.group(1)}“ nennt einen anderen Spieler"))
                elif num is not None and e["number"] == num:
                    (hits if first_ok else near).append((e, None if first_ok else "Vorname weicht ab"))
                elif first_ok:
                    near.append((e, f"Nummer auf der Seite {num if num is not None else '–'}, im Kader {e['number']}"))
            label = re.sub(r"\s+", " ", text)[:90]
            if len(hits) == 1 and not near:
                e = hits[0][0]
                if e["player"] is None:
                    rejected.append((team, "steht im Kader, hat aber keine Spielerseite (keine Statistik)", label, url))
                else:
                    accepted[e["player"]].append((prio, url, page, e, label, href))
            elif hits or near:
                reasons = "; ".join(f"{e['name']} #{e['number']}: {r or 'mehrere Treffer'}" for e, r in hits + near)
                rejected.append((team, reasons, label, url))
            # Karten ohne jeden Namenstreffer (Trainer, Sponsoren, Spieler außerhalb des Kaders) zählen nicht

    def key(u):
        return SIZE.sub("", u.split("?")[0])

    photos, conflicts = {}, []
    for pid, items in accepted.items():
        top = min(p for p, *_ in items)
        best = [i for i in items if i[0] == top]
        if len({key(u) for _, u, *_ in best}) > 1:
            conflicts.append((pid, "verschiedene Fotos auf derselben Seite", [u for _, u, *_ in best]))
            continue
        # größte Variante (Dateiname ohne Größenangabe = Original bei WordPress)
        url = max((u for _, u, *_ in best), key=lambda u: (not SIZE.search(u), len(u)))
        _, _, page, e, label, href = best[0]
        url = larger(url, href)
        photos[pid] = {"team": e and next(t for t, p, _ in SOURCES if p == page), "number": e["number"], "name": e["name"],
                       "position": e["position"], "image": url, "source": page, "retrieved": today}
    used = defaultdict(list)
    for pid, ph in photos.items():
        used[key(ph["image"])].append(pid)
    for k, pids in used.items():
        if len(pids) > 1:
            for pid in pids:
                conflicts.append((pid, "dasselbe Foto bei mehreren Spielern", [photos.pop(pid)["image"]]))

    out = {
        "_info": ("Spielerfotos je Spieler-ID (Website). Nur eindeutig zugeordnete Fotos der offiziellen Roster-Seiten "
                  "(Abgleich mit curation/rosters.json über Team, Rückennummer, Name; Regeln: scripts/match_player_photos.py). "
                  "Datei auf der Website: web/public/players/<id>.webp (npm run photos). Ohne Eintrag zeigt die Website den Platzhalter."),
        "season": int(SEASON),
        "photos": dict(sorted(photos.items())),
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    per_team = defaultdict(int)
    for ph in photos.values():
        per_team[ph["team"]] += 1
    lines = [f"# Abgleich Spielerfotos {SEASON}", "",
             f"Stand {today}. Erzeugt von `scripts/match_player_photos.py`. Zugeordnet: **{len(photos)}** Spieler.", "",
             "| Team | Kader (mit Spielerseite) | Fotos zugeordnet |", "|---|---|---|"]
    for team in sorted(roster):
        n = sum(1 for p in roster[team]["players"] if p["player"])
        note = NOT_COVERED.get(team)
        lines.append(f"| {team} | {n} | {per_team.get(team, 0)}{' – ' + note if note else ''} |")
    lines += ["", "## Nicht zugeordnet (Prüffälle)", "", "Diese Fotos wurden bewusst nicht verwendet; der Spieler behält den Platzhalter.", "",
              "| Team | Grund | Karte auf der Seite | Foto |", "|---|---|---|---|"]
    for team, reason, label, url in sorted(rejected):
        lines.append(f"| {team} | {reason} | {label.replace('|', '/')} | {url} |")
    for pid, reason, urls in sorted(conflicts):
        lines.append(f"| – | {pid}: {reason} | | {' , '.join(urls)} |")
    notes = []
    for pid, ph in sorted(photos.items()):
        m = re.search(r"(?:/|fn:)\d{4}_[A-Z]{3}_(\d+)_", unquote(ph["image"]))
        if m and int(m.group(1)) != ph["number"]:
            notes.append(f"| {ph['team']} | {ph['name']} | {ph['number']} | {m.group(1)} | {ph['image']} |")
    if notes:
        lines += ["", "## Hinweise (zugeordnet)", "",
                  "Karte auf der Vereinsseite und Name im Dateinamen nennen denselben Spieler mit der Nummer aus dem Kader; "
                  "nur die Nummer im Dateinamen ist älter (Nummernwechsel in der Saison).", "",
                  "| Team | Spieler | Nummer (Kader und Seite) | Nummer im Dateinamen | Foto |", "|---|---|---|---|---|", *notes]
    REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"{len(photos)} Fotos zugeordnet, {len(rejected)} Prüffälle, {len(conflicts)} Konflikte", file=sys.stderr)


if __name__ == "__main__":
    main()
