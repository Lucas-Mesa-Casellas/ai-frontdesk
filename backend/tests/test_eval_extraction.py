"""Run from backend/:  python -m unittest discover -s tests -v

The extraction eval harness (scripts/eval_extraction.py) itself, with stub extractors only:
it must never call OpenAI from here."""
import io
import json
import os
import sys
import tempfile
import unittest
from contextlib import redirect_stdout
from unittest import mock

for key in ("OPENAI_API_KEY", "RETELL_API_KEY", "RESEND_API_KEY", "SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"):
    os.environ.setdefault(key, "test")
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "scripts"))

import eval_extraction as ev  # noqa: E402
from app.models.call import ExtractedCallData  # noqa: E402


class Scoring(unittest.TestCase):
    def test_exact_values_and_null(self):
        self.assertTrue(ev.check("high", "high")[0])
        self.assertFalse(ev.check("high", "normal")[0])
        self.assertTrue(ev.check(None, None)[0])
        self.assertFalse(ev.check(None, "12 rue des Lilas")[0])

    def test_datetimes_compare_instants_with_a_tolerance(self):
        exp = {"datetime": "2026-10-16T08:00:00+02:00"}
        self.assertTrue(ev.check(exp, "2026-10-16T06:00:00+00:00")[0])  # same instant, other offset
        self.assertFalse(ev.check(exp, "2026-10-16T09:00:00+02:00")[0])
        self.assertTrue(ev.check({**exp, "tolerance_minutes": 60}, "2026-10-16T09:00:00+02:00")[0])
        self.assertFalse(ev.check(exp, None)[0])
        self.assertFalse(ev.check(exp, "next friday")[0])  # unparseable is a failure, not a crash

    def test_text_matchers(self):
        self.assertTrue(ev.check({"iequals": "Paul Combe de force"}, "  paul  COMBE de Force ")[0])
        self.assertFalse(ev.check({"iequals": "Paul Combe de force"}, "Paul")[0])
        self.assertTrue(ev.check({"matches": "^12 rue"}, "12 rue des Lilas")[0])
        self.assertFalse(ev.check({"matches": "^12 rue"}, None)[0])
        self.assertTrue(ev.check({"not_matches": "confirm"}, None)[0])
        self.assertFalse(ev.check({"not_matches": "confirm"}, "Rendez-vous CONFIRMÉ")[0])

    def test_list_matchers(self):
        self.assertTrue(ev.check({"includes": ["address"]}, ["address", "party_size"])[0])
        self.assertFalse(ev.check({"includes": ["address"]}, [])[0])
        self.assertTrue(ev.check({"excludes": ["caller_phone"]}, ["address"])[0])
        self.assertFalse(ev.check({"excludes": ["caller_phone"]}, ["caller_phone"])[0])
        self.assertFalse(ev.check({"what": 1}, "x")[0])  # an unknown expectation never passes silently


class TheShippedFixtures(unittest.TestCase):
    def test_every_fixture_is_well_formed_and_uses_fake_data(self):
        cases = ev.load_cases(ev.DEFAULT_FIXTURES)
        self.assertEqual(len(cases), 8)
        for c in cases:
            for key in ("name", "language", "call_started_at", "from_number", "transcript", "expect"):
                self.assertIn(key, c, c.get("name"))
            self.assertTrue(all(line.startswith(("Agent: ", "User: ")) for line in c["transcript"]), c["name"])
            phone = c["from_number"].replace(" ", "")
            self.assertTrue(phone.startswith(("+3363998", "+447700900", "+346")), c["name"])  # reserved / masked ranges
            self.assertIn("LMC Agents", c["transcript"][0])
            ExtractedCallData(**c.get("stub_output", {}))  # the stub output is a valid extraction

    def test_a_dry_run_with_the_stubs_passes_end_to_end(self):
        out = io.StringIO()
        with redirect_stdout(out):
            code = ev.main(["--stub"])
        self.assertEqual(code, 0, out.getvalue())
        self.assertNotIn("SKIP", out.getvalue())  # the address-digits change is merged: case 5 runs too
        self.assertIn("16/16 checks passed", out.getvalue())
        # its stub returns the spoken form; the stored row has digits (the fallback in the model validator)
        self.assertIn("'12 rue des Lilas", out.getvalue())

    def test_the_caller_id_fallback_and_missing_fields_clean_up_are_applied(self):
        # the stub for fr_this_number has caller_phone null and lists caller_phone as missing:
        # the stored row must carry the caller ID and not list it
        case = ev.load_cases(ev.DEFAULT_FIXTURES, ["fr_this_number"])[0]
        row = ev.stored_row(case, ev.stub_extractor(case))
        self.assertEqual(row["caller_phone"], "+33639987788")
        self.assertNotIn("caller_phone", row["missing_fields"])


def write_case(directory, name, expect, stub, skip=None):
    case = {"name": name, "language": "fr", "country": "FR", "call_started_at": "2026-10-14T10:00:00+02:00",
            "from_number": "+33639981234", "transcript": ["Agent: Bonjour, LMC Agents.", "User: Bonjour."],
            "expect": expect, "stub_output": stub}
    if skip:
        case["skip"] = skip
    with open(os.path.join(directory, f"{name}.json"), "w", encoding="utf-8") as fh:
        json.dump(case, fh)


class ExitCodesAndOptions(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.dir = self.tmp.name
        write_case(self.dir, "good", {"urgency": "high"}, {"urgency": "high"})
        write_case(self.dir, "bad", {"urgency": "high"}, {"urgency": "normal"})
        write_case(self.dir, "later", {"urgency": "high"}, {}, skip="not yet")

    def main(self, *args):
        out = io.StringIO()
        with redirect_stdout(out):
            code = ev.main(["--fixtures", self.dir, *args])
        return code, out.getvalue()

    def test_all_pass_is_0_any_failure_is_1(self):
        self.assertEqual(self.main("--stub", "--only", "good")[0], 0)
        code, text = self.main("--stub")
        self.assertEqual(code, 1)
        self.assertIn("bad", text)
        self.assertIn("FAIL", text)

    def test_skipped_cases_never_fail_the_run(self):
        code, text = self.main("--stub", "--only", "later")
        self.assertEqual(code, 0)
        self.assertIn("SKIP   not yet", text)

    def test_no_case_matched_is_2(self):
        self.assertEqual(self.main("--stub", "--only", "nope")[0], 2)

    def test_no_key_is_2_and_nothing_runs(self):
        with mock.patch.dict(os.environ, {}, clear=True), mock.patch.object(ev.os.path, "exists", return_value=False), \
                mock.patch.object(ev, "production_extractor") as prod:
            code, text = self.main()
        self.assertEqual(code, 2)
        self.assertIn("OPENAI_API_KEY is not set", text)
        prod.assert_not_called()

    def test_n_repeats_and_exposes_a_flaky_answer(self):
        answers = iter(["high", "normal", "high"])

        def flaky(_case):
            return lambda *_a: (ExtractedCallData(urgency=next(answers)), {})

        out = []
        code = ev.run(ev.load_cases(self.dir, ["good"]), 3, flaky, out=out.append)
        self.assertEqual(code, 1)
        runs = [line for line in out if line.startswith("good")]
        self.assertEqual(len(runs), 3)
        self.assertEqual(sum("FAIL" in line for line in runs), 1)
        self.assertIn("2/3 checks passed, 1 FAILED", out[-1])

    def test_a_crashing_extractor_is_a_failed_run_not_a_crash(self):
        def boom(_case):
            def f(*_a):
                raise RuntimeError("model down")
            return f
        out = []
        self.assertEqual(ev.run(ev.load_cases(self.dir, ["good"]), 1, boom, out=out.append), 1)
        self.assertTrue(any("RuntimeError: model down" in line for line in out))

    def test_the_real_extractor_is_the_production_function(self):
        from app.services import ai
        self.assertIs(ev.production_extractor(), ai.extract_call_data)

    def test_help_exits_cleanly(self):
        with redirect_stdout(io.StringIO()) as out, self.assertRaises(SystemExit) as cm:
            ev.main(["--help"])
        self.assertEqual(cm.exception.code, 0)
        self.assertIn("--only", out.getvalue())


if __name__ == "__main__":
    unittest.main()
