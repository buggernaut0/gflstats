"""Lädt die offiziellen Teamlogos aus curation/teams.json nach web/public/logos/.

    python scripts/download_logos.py            fehlende Logos laden
    python scripts/download_logos.py --neu      alle Logos neu laden

Nur Python-Standardbibliothek. Es werden nur Dateien gespeichert, die tatsächlich
Bilder sind (PNG, JPEG, SVG, WebP). Ergebnis und Quellen stehen danach in
web/public/logos/QUELLEN.md. Die Originaldaten werden nicht berührt.
"""

import json
import sys
import urllib.request
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TEAMS = ROOT / "curation" / "teams.json"
OUT = ROOT / "web" / "public" / "logos"
SIGNATURES = (b"\x89PNG", b"\xff\xd8\xff", b"<svg", b"<?xml", b"RIFF")


def main():
    refresh = "--neu" in sys.argv
    OUT.mkdir(parents=True, exist_ok=True)
    teams = json.loads(TEAMS.read_text(encoding="utf-8"))["franchises"]
    rows = []
    for t in teams:
        logo = t.get("logo")
        if not logo:
            rows.append((t["name"], "kein offizielles Logo hinterlegt", "", ""))
            continue
        target = OUT / logo["file"]
        if target.exists() and not refresh:
            rows.append((t["name"], "vorhanden", logo["url"], logo["sourcePage"]))
            continue
        try:
            req = urllib.request.Request(logo["url"], headers={"User-Agent": "gflstats (https://github.com/buggernaut0/gflstats)"})
            with urllib.request.urlopen(req, timeout=30) as r:
                data = r.read()
            if not data.lstrip()[:5].startswith(SIGNATURES) and not data[:4] == b"RIFF":
                raise ValueError("keine Bilddatei")
            # Hinweis: Browser erkennen das Format am Inhalt, die Endung aus teams.json bleibt gültig.
            target.write_bytes(data)
            rows.append((t["name"], f"geladen ({len(data) // 1024} KB)", logo["url"], logo["sourcePage"]))
            print(f"OK      {t['name']}")
        except Exception as e:  # noqa: BLE001 - jedes Problem nur melden, nichts erfinden
            rows.append((t["name"], f"FEHLER: {e}", logo["url"], logo["sourcePage"]))
            print(f"FEHLER  {t['name']}: {e}")

    lines = [
        "# Teamlogos: Quellen",
        "",
        f"Stand: {date.today().isoformat()}. Erzeugt von scripts/download_logos.py aus curation/teams.json.",
        "Die Logos sind Marken der jeweiligen Vereine und werden nur zur Kennzeichnung der Teams verwendet.",
        "",
        "| Team | Status | Datei-Quelle | Verlinkt auf |",
        "| --- | --- | --- | --- |",
    ] + [f"| {a} | {b} | {c} | {d} |" for a, b, c, d in rows]
    (OUT / "QUELLEN.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    ok = sum(1 for r in rows if r[1].startswith(("geladen", "vorhanden")))
    print(f"\n{ok} von {len(teams)} Teams mit Logo. Übersicht: web/public/logos/QUELLEN.md")


if __name__ == "__main__":
    main()
