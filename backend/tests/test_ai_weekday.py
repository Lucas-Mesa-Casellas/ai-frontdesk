"""Run from backend/:  python -m unittest discover -s tests -v"""
import os
import sys
import unittest

# app.services.ai builds its clients at import time; dummy values are enough here
for key in ("OPENAI_API_KEY", "RETELL_API_KEY", "SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"):
    os.environ.setdefault(key, "test")
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.ai import _phrase_names_weekday, _resolve_requested_weekday  # noqa: E402

THU_CALL = "2026-10-01T10:00:00+02:00"  # Thursday 1 October 2026


class WeekdayGuard(unittest.TestCase):
    def test_tomorrow_on_a_thursday_call_keeps_the_models_date(self):
        # the reported case: the model set requested_weekday="thu" for "tomorrow around three PM"
        iso = "2026-10-02T15:00:00+02:00"
        out = _resolve_requested_weekday(THU_CALL, "thu", iso, "tomorrow around three PM")
        self.assertEqual(out, iso)  # 2026-10-02 13:00 UTC, not 2026-10-08

    def test_jeudi_said_on_a_thursday_still_rolls_a_week(self):
        out = _resolve_requested_weekday(THU_CALL, "thu", "2026-10-01T15:00:00+02:00", "jeudi à trois heures")
        self.assertEqual(out, "2026-10-08T15:00:00+02:00")

    def test_a_named_weekday_other_than_today(self):
        out = _resolve_requested_weekday(THU_CALL, "tue", "2026-10-01T10:00:00+02:00", "next Tuesday at ten")
        self.assertEqual(out, "2026-10-06T10:00:00+02:00")

    def test_spanish_and_abbreviated_weekdays(self):
        self.assertEqual(_resolve_requested_weekday(THU_CALL, "fri", "2026-10-01T17:00:00+02:00", "el viernes por la tarde"), "2026-10-02T17:00:00+02:00")
        self.assertEqual(_resolve_requested_weekday(THU_CALL, "mon", "2026-10-01T09:00:00+02:00", "lun. a las nueve"), "2026-10-05T09:00:00+02:00")

    def test_no_weekday_in_the_words_keeps_the_models_date(self):
        iso = "2026-10-23T11:00:00+02:00"
        for phrase in ("the 23rd at eleven", "mañana por la tarde", "demain matin", "next month", None, ""):
            self.assertEqual(_resolve_requested_weekday(THU_CALL, "fri", iso, phrase), iso, phrase)

    def test_nothing_to_do_without_a_weekday_or_a_date(self):
        self.assertEqual(_resolve_requested_weekday(THU_CALL, None, "2026-10-02T15:00:00+02:00", "jeudi"), "2026-10-02T15:00:00+02:00")
        self.assertIsNone(_resolve_requested_weekday(THU_CALL, "thu", None, "jeudi"))


class PhraseDetection(unittest.TestCase):
    def test_names_in_three_languages(self):
        for phrase in (
            "on Monday", "next TUESDAY", "wednesday morning", "thursdays", "Friday at 5",
            "lundi", "mardi prochain", "mercredi après-midi", "tous les jeudis", "vendredi", "samedi matin", "dimanche",
            "el lunes", "el martes", "miércoles", "el jueves", "viernes", "el sábado", "domingo",
        ):
            self.assertTrue(_phrase_names_weekday(phrase), phrase)

    def test_abbreviations(self):
        for phrase in ("Fri 5pm", "tues at nine", "thurs", "jue a las 10", "mié por la tarde", "sáb", "mon. 9am", "jeu. soir", "ven. 14h", "sam. matin", "dim. 10h", "dom. tarde", "mar. 10h", "mer. 10h", "wed. 3pm", "sat. noon"):
            self.assertTrue(_phrase_names_weekday(phrase), phrase)

    def test_ordinary_words_are_not_weekdays(self):
        for phrase in (
            "tomorrow around three PM", "mon rendez-vous demain", "I sat down and waited", "in the sun", "we wed in June",
            "ven a verme", "la vie est belle", "en el mar", "dim light", "a game of jeu", "the 23rd", "mañana", "demain",
        ):
            self.assertFalse(_phrase_names_weekday(phrase), phrase)


if __name__ == "__main__":
    unittest.main()
