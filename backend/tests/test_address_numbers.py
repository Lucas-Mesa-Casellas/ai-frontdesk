"""Run from backend/:  python -m unittest discover -s tests -v"""
import os
import sys
import unittest
from types import SimpleNamespace
from unittest import mock

for key in ("OPENAI_API_KEY", "RETELL_API_KEY", "RESEND_API_KEY", "SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"):
    os.environ.setdefault(key, "test")
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.models.call import ExtractedCallData  # noqa: E402
from app.services import notify  # noqa: E402
from app.services.address_numbers import digits_for_leading_number as digits  # noqa: E402


class LeadingNumberWords(unittest.TestCase):
    def test_the_cases_from_the_brief(self):
        self.assertEqual(digits("douze rue des Lilas"), "12 rue des Lilas")
        self.assertEqual(digits("vingt-trois bis avenue Foch"), "23 bis avenue Foch")
        self.assertEqual(digits("Douze rue des Lilas à Versailles"), "12 rue des Lilas à Versailles")
        self.assertEqual(digits("douze boulevard du Maréchal-Pétin à Paris"), "12 boulevard du Maréchal-Pétin à Paris")

    def test_french_compounds(self):
        self.assertEqual(digits("dix-sept ter impasse des Roses"), "17 ter impasse des Roses")
        self.assertEqual(digits("soixante et onze route de Lyon"), "71 route de Lyon")
        self.assertEqual(digits("quatre-vingt-dix-neuf boulevard Voltaire"), "99 boulevard Voltaire")
        self.assertEqual(digits("cent vingt chemin des Vignes"), "120 chemin des Vignes")
        self.assertEqual(digits("vingt et un quai Claude Bernard"), "21 quai Claude Bernard")

    def test_spanish_and_english(self):
        self.assertEqual(digits("treinta y dos avenida del Parque"), "32 avenida del Parque")
        self.assertEqual(digits("ciento veintitrés calle Mayor"), "123 calle Mayor")
        self.assertEqual(digits("Doce calle de los Olmos, Zaragoza"), "12 calle de los Olmos, Zaragoza")
        # English puts the street type after the name
        self.assertEqual(digits("twenty-one Hawthorn Lane, Leeds"), "21 Hawthorn Lane, Leeds")
        self.assertEqual(digits("one hundred and twelve Park Road"), "112 Park Road")

    def test_left_unchanged(self):
        for same in (
            "12 rue des Lilas",                     # already digits
            "rue des Lilas, Versailles",            # no leading number word
            "les douze coups de minuit",            # not leading
            "trois enfants à la maison",            # number word, but no street type after it
            "une rue derrière la mairie",           # a lone article, not a number
            "un chemin de terre",
            "deux cents rue Saint-Denis",           # out of range / unknown word
            "one of the houses on Park Road",       # "of" stops the number; no street type right after
            "douze",                                # nothing after it
        ):
            self.assertEqual(digits(same), same, same)

    def test_null_and_empty_stay_as_they_are(self):
        self.assertIsNone(digits(None))
        self.assertEqual(digits(""), "")

    def test_it_runs_on_every_extraction(self):
        self.assertEqual(ExtractedCallData(address="  douze rue des Lilas à Versailles ").address, "12 rue des Lilas à Versailles")
        self.assertIsNone(ExtractedCallData(address="null").address)
        self.assertIsNone(ExtractedCallData().address)


class UrgencyShownOnce(unittest.TestCase):
    BIZ = {"id": "b", "name": "LMC Agents", "language": "fr", "country": "FR", "notification_email": "hello@lmcagents.example"}

    def ex(self, urgency):
        return SimpleNamespace(caller_name="Clémence", caller_phone=None, preferred_time=None, preferred_time_iso=None,
                               booking_type="appointment", party_size=None, summary="Fuite", urgency=urgency, address=None)

    def test_urgent_has_the_badge_and_no_urgency_row(self):
        for lang, label, high in (("fr", "Urgence", "élevée"), ("es", "Urgencia", "alta"), ("en", "Urgency", "high")):
            _, h = notify.render_owner_email({**self.BIZ, "language": lang}, self.ex("high"), "c1")
            self.assertNotIn(f">{label}</div>", h, lang)
            self.assertEqual(h.count(f">{high}</span>"), 1)  # the badge
            self.assertNotIn("—", h)

    def test_other_urgencies_keep_the_row_and_have_no_badge(self):
        for urgency, shown in (("normal", "normale"), ("low", "basse")):
            _, h = notify.render_owner_email(self.BIZ, self.ex(urgency), "c1")
            self.assertIn(">Urgence</div>", h)
            self.assertIn(shown, h)
            self.assertNotIn("#fdecea", h)  # the red badge colour


if __name__ == "__main__":
    unittest.main()
