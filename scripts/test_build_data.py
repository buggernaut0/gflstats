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


class FullBuild(unittest.TestCase):
    def test_build_matches_database(self):
        """Kompletter Lauf ohne Schreiben: bricht ab, falls eine Summe von der Datenbank abweicht."""
        b.build(write=False)


if __name__ == "__main__":
    unittest.main()
