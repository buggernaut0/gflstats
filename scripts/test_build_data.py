"""Tests fuer scripts/build_data.py. Ausfuehren: python -m unittest scripts/test_build_data.py"""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_data as b  # noqa: E402


class CleanName(unittest.TestCase):
    def test_whitespace_and_invisible_characters(self):
        self.assertEqual(b.clean_name(" Carl Luckman")[0], "Carl Luckman")
        self.assertEqual(b.clean_name("Erik\xa0 Bonitz\xa0")[0], "Erik Bonitz")
        self.assertEqual(b.clean_name("Chris\xadtian Fried\xadrich")[0], "Christian Friedrich")

    def test_hyphen_spacing(self):
        self.assertEqual(b.clean_name("Benedict Gyebi- Buaben")[0], "Benedict Gyebi-Buaben")

    def test_missing_space(self):
        self.assertEqual(b.clean_name("Chrisman-Kyei")[0], "Chrisman Kyei")

    def test_shared_entry_of_two_players(self):
        self.assertEqual(b.clean_name("Alexander Palm,Finn Willms"), ("Alexander Palm / Finn Willms", True))

    def test_comma_typo_is_not_shared(self):
        self.assertEqual(b.clean_name("Louis,Burghes"), ("Louis Burghes", False))
        self.assertEqual(b.clean_name("Neville Krüger,Neville Krüger"), ("Neville Krüger", False))


class MatchKey(unittest.TestCase):
    def test_umlaut_transliteration(self):
        self.assertEqual(b.match_key("Jonas Högl"), b.match_key("Jonas Hoegl"))
        self.assertEqual(b.match_key("Luis Maaßen"), b.match_key("Luis Maassen"))

    def test_case_and_punctuation(self):
        self.assertEqual(b.match_key("Broghean McGovern"), b.match_key("Broghean Mcgovern"))
        self.assertEqual(b.match_key("Finn-Krause"), b.match_key("Finn Krause"))

    def test_different_people_stay_different(self):
        self.assertNotEqual(b.match_key("Elias Frank"), b.match_key("Frank Elias"))


class Levenshtein(unittest.TestCase):
    def test_distance(self):
        self.assertEqual(b.levenshtein("hermann", "herrmann"), 1)
        self.assertEqual(b.levenshtein("abc", "abc"), 0)
        self.assertGreater(b.levenshtein("christian", "christopher", 2), 2)


class TeamLogos(unittest.TestCase):
    """Logos kommen ausschliesslich aus curation/teams.json und muessen eine Quelle haben."""

    def setUp(self):
        import json

        root = Path(__file__).resolve().parent.parent
        self.root = root
        self.teams = json.loads((root / "curation" / "teams.json").read_text(encoding="utf-8"))["franchises"]

    def test_every_logo_has_source_and_unique_file(self):
        files = []
        for t in self.teams:
            logo = t.get("logo")
            if not logo:
                continue
            self.assertTrue(logo["url"].startswith("https://"), t["id"])
            self.assertTrue(logo.get("sourcePage", "").startswith("https://"), t["id"])
            self.assertRegex(logo["file"], r"^[a-z0-9-]+\.(png|svg|webp|jpg)$")
            files.append(logo["file"])
        self.assertEqual(len(files), len(set(files)))

    def test_build_emits_logo_only_for_existing_files(self):
        import json

        out = self.root / "web" / "public" / "data" / "teams.json"
        if not out.exists():
            self.skipTest("public/data noch nicht gebaut")
        for t in json.loads(out.read_text(encoding="utf-8")):
            if t["logo"]:
                self.assertTrue((self.root / "web" / "public" / t["logo"]).exists(), t["id"])
                self.assertTrue(t["logoSource"].startswith("https://"), t["id"])


class GameVideos(unittest.TestCase):
    """Highlight-Videos: nur gueltige, eindeutig zugeordnete Eintraege."""

    GAMES = {"g1": {"id": "g1", "date": "2026-06-27", "home": "potsdam-royals", "away": "dresden-monarchs"}}

    def games(self):
        return {k: dict(v) for k, v in self.GAMES.items()}

    def test_attaches_video(self):
        g = self.games()
        b.attach_game_videos(g, {"g1": {"youtubeId": "WazXlAhkv9k", "title": "T", "channel": "C", "published": "2026-06-27",
                                        "game": "2026-06-27 dresden-monarchs @ potsdam-royals 24:22"}})
        self.assertEqual(g["g1"]["video"]["youtubeId"], "WazXlAhkv9k")

    def test_rejects_unknown_game_bad_id_duplicate_and_wrong_hint(self):
        ok = {"youtubeId": "WazXlAhkv9k"}
        with self.assertRaises(SystemExit):
            b.attach_game_videos(self.games(), {"gibt-es-nicht": ok})
        with self.assertRaises(SystemExit):
            b.attach_game_videos(self.games(), {"g1": {"youtubeId": "zu-kurz"}})
        two = self.games()
        two["g2"] = dict(two["g1"], id="g2")
        with self.assertRaises(SystemExit):
            b.attach_game_videos(two, {"g1": ok, "g2": ok})
        with self.assertRaises(SystemExit):
            b.attach_game_videos(self.games(), {"g1": dict(ok, game="2025-06-27 dresden-monarchs @ potsdam-royals 1:2")})

    def test_curation_file_is_consistent(self):
        import json

        root = Path(__file__).resolve().parent.parent
        videos = json.loads((root / "curation" / "game_videos.json").read_text(encoding="utf-8"))["videos"]
        ids = [v["youtubeId"] for v in videos.values()]
        self.assertEqual(len(ids), len(set(ids)))
        for gid, v in videos.items():
            self.assertRegex(v["youtubeId"], r"^[A-Za-z0-9_-]{11}$", gid)
            self.assertTrue(v.get("title") and v.get("channel"), gid)


class FullBuild(unittest.TestCase):
    def test_build_matches_database(self):
        """Kompletter Lauf ohne Schreiben: bricht ab, falls eine Summe von der Datenbank abweicht."""
        b.build(write=False)


if __name__ == "__main__":
    unittest.main()
