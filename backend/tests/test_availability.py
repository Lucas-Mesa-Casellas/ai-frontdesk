"""Run from backend/:  python -m unittest discover -s tests -v"""
import hashlib
import hmac
import io
import json
import logging
import os
import sys
import time
import unittest
from contextlib import redirect_stdout
from datetime import datetime
from unittest import mock
from zoneinfo import ZoneInfo

for key in ("OPENAI_API_KEY", "RETELL_API_KEY", "RESEND_API_KEY", "SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"):
    os.environ.setdefault(key, "test")
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.dirname(__file__))

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from app.routers import functions  # noqa: E402
from app.services.scheduling import DEFAULT_APPOINTMENT_MINUTES  # noqa: E402
from fakes import FakeSupabase  # noqa: E402

PARIS = ZoneInfo("Europe/Paris")


def _day(*windows):
    return [{"open": o, "close": c} for o, c in windows]


# Barazzetti Fils' schedule (see scheduling.py / migration 010)
OFFICE = {
    "is_24_7": False,
    "days": {
        "mon": _day(("08:00", "12:00"), ("13:30", "17:30")),
        "tue": _day(("08:00", "12:00"), ("13:30", "17:30")),
        "wed": _day(("08:00", "12:00"), ("13:30", "17:30")),
        "thu": _day(("08:00", "12:00"), ("13:30", "17:30")),
        "fri": _day(("08:00", "12:00"), ("13:30", "16:30")),
        "sat": [], "sun": [],
    },
}
BUSINESS = {"id": "biz1", "name": "Test Biz", "language": "fr", "country": "FR", "opening_hours": OFFICE}
# 1 Oct 2026 is a Thursday: "now" for every test is that morning in Paris
NOW = datetime(2026, 10, 1, 9, 0, tzinfo=PARIS)


def signed(body):
    raw = json.dumps(body).encode()
    ts = str(int(time.time() * 1000))
    digest = hmac.new(os.environ["RETELL_API_KEY"].encode(), raw + ts.encode(), hashlib.sha256).hexdigest()
    return raw, {"x-retell-signature": f"v={ts},d={digest}", "content-type": "application/json"}


class Availability(unittest.TestCase):
    def setUp(self):
        self.db = FakeSupabase()
        self.client = TestClient(app)
        self.patches = [
            mock.patch.object(functions, "get_supabase_admin", return_value=self.db),
            mock.patch.object(functions, "find_business", return_value=BUSINESS),
            mock.patch.object(functions, "business_timezone", return_value="Europe/Paris"),
            mock.patch.object(functions, "_now", return_value=NOW),
            mock.patch.object(functions, "RESPONSE_DELAY_SECONDS", 0),
        ]
        for p in self.patches:
            p.start()
            self.addCleanup(p.stop)
        self.queried = []
        real = self.db.table
        self.db.table = lambda name: (self.queried.append(name), real(name))[1]

    def check(self, requested_time, duration=None, **extra):
        args = {"requested_time": requested_time, **extra}
        if duration is not None:
            args["duration_minutes"] = duration
        raw, headers = signed({"call": {"agent_id": "a"}, "args": args})
        return self.client.post("/functions/check-availability", content=raw, headers=headers).json()

    # ---- the hallucinated date
    def test_a_date_in_the_past_is_invalid_and_bookings_are_not_queried(self):
        r = self.check("2024-06-14T16:00:00")
        self.assertEqual(r, {"available": False, "reason": "invalid_date", "message": "That date is not valid. Ask the caller to repeat the day and time."})
        self.assertNotIn("bookings", self.queried)

    def test_a_date_beyond_180_days_is_invalid(self):
        self.assertEqual(self.check("2027-04-01T10:00:00")["reason"], "invalid_date")  # 182 days ahead
        self.assertNotIn("bookings", self.queried)
        self.assertTrue(self.check("2027-03-26T10:00:00")["available"])  # 176 days ahead, a Friday morning: fine

    def test_the_five_minute_grace_for_a_time_that_just_passed(self):
        self.assertTrue(self.check("2026-10-01T08:56:00")["available"])   # 4 min ago: still accepted
        self.assertEqual(self.check("2026-10-01T08:54:00")["reason"], "invalid_date")  # 6 min ago

    # ---- naive vs aware
    def test_naive_time_is_read_as_the_business_local_time(self):
        self.assertTrue(self.check("2026-10-01T16:00:00")["available"])

    def test_aware_time_is_converted_to_the_business_timezone(self):
        # 14:00 UTC is 16:00 in Paris (UTC+2 in October): Thursday 16:00, inside the afternoon window
        self.assertTrue(self.check("2026-10-01T14:00:00+00:00")["available"])
        self.assertTrue(self.check("2026-10-01T16:00:00+02:00")["available"])
        # 16:00 UTC is 18:00 in Paris: after closing, although "16:00" alone would have been fine
        self.assertEqual(self.check("2026-10-01T16:00:00+00:00")["reason"], "outside_business_hours")

    def test_naive_input_with_alternatives_does_not_crash(self):
        # the old code read the clock in the (absent) tzinfo of a naive input
        r = self.check("2026-10-01T19:00:00")
        self.assertEqual(r["reason"], "outside_business_hours")
        self.assertTrue(r["alternatives"])
        first = datetime.fromisoformat(r["alternatives"][0]["time"])
        self.assertEqual(first.utcoffset().total_seconds(), 7200)  # offset-aware, Paris
        self.assertGreater(first, NOW)

    # ---- duration
    def test_missing_zero_negative_or_junk_duration_uses_the_default(self):
        self.assertEqual(DEFAULT_APPOINTMENT_MINUTES, 60)
        # Thursday 16:45 + 60 min ends 17:45, after the 17:30 close: only the default makes this fail
        for dur in (None, 0, -30, "abc"):
            self.assertEqual(self.check("2026-10-01T16:45:00", dur)["reason"], "outside_business_hours", f"duration={dur!r}")
        self.assertTrue(self.check("2026-10-01T16:45:00", 30)["available"])  # a real 30 minutes does fit

    # ---- the Barazzetti hours
    def test_thursday_1600_is_available(self):
        self.assertEqual(self.check("2026-10-01T16:00:00"), {"available": True, "message": "That time is available."})

    def test_friday_1600_for_an_hour_is_outside_business_hours(self):
        r = self.check("2026-10-02T16:00:00", 60)  # Friday closes 16:30
        self.assertEqual((r["available"], r["reason"]), (False, "outside_business_hours"))
        self.assertTrue(r["alternatives"])

    def test_an_existing_booking_still_reports_already_booked(self):
        self.db.tables["bookings"].append({"id": "b1", "business_id": "biz1", "status": "confirmed",
                                           "start_time": "2026-10-01T16:00:00+02:00", "end_time": "2026-10-01T17:00:00+02:00"})
        self.assertEqual(self.check("2026-10-01T16:00:00")["reason"], "already_booked")

    # ---- other inputs and the log
    def test_missing_or_unreadable_time_keeps_the_old_answers(self):
        self.assertEqual(self.check(None)["message"], "No time was provided to check.")
        self.assertEqual(self.check("next tuesday")["message"], "Could not understand the requested time.")

    def test_one_info_line_per_call_with_no_personal_data(self):
        logger = logging.getLogger("lmc.availability")
        with self.assertLogs(logger, level="INFO") as cm:
            self.check("2026-10-01T16:00:00", 45, customer_name="Sam Carter", phone="+33600000001", address="1 Rue Exemple")
            self.check("2024-06-14T16:00:00")
        self.assertEqual(len(cm.output), 2)
        self.assertIn("business=biz1", cm.output[0])
        self.assertIn("requested='2026-10-01T16:00:00'", cm.output[0])
        self.assertIn("resolved=2026-10-01T16:00:00+02:00", cm.output[0])
        self.assertIn("result=available", cm.output[0])
        self.assertIn("duration=45", cm.output[0])
        self.assertIn("result=invalid_date", cm.output[1])
        everything = "\n".join(cm.output)
        for private in ("Sam", "Carter", "+33", "Rue Exemple"):
            self.assertNotIn(private, everything)

    def test_a_business_without_a_timezone_falls_back_instead_of_failing(self):
        with mock.patch.object(functions, "business_timezone", return_value=None), \
                mock.patch.object(functions, "find_business", return_value={**BUSINESS, "country": "ZZ"}), \
                mock.patch.object(functions, "_now", return_value=NOW.astimezone(ZoneInfo("Europe/Madrid"))):
            self.assertTrue(self.check("2026-10-01T16:00:00")["available"])


class SystemTimezoneVariable(unittest.TestCase):
    """/webhooks/retell-inbound now also hands the prompt the business's timezone name."""

    def post(self, business, tz_row):
        from app.routers import webhooks
        body = {"event": "call_inbound", "call_inbound": {"agent_id": "a", "from_number": "+33600000001", "to_number": "+33100000001", "call_id": "c1"}}
        raw, headers = signed(body)
        with mock.patch.object(webhooks, "get_supabase_admin", return_value=mock.Mock()), \
                mock.patch.object(webhooks, "find_business", return_value=business), \
                mock.patch.object(webhooks, "business_timezone", return_value=tz_row), \
                redirect_stdout(io.StringIO()):
            return TestClient(app).post("/webhooks/retell-inbound", content=raw, headers=headers).json()["call_inbound"]["dynamic_variables"]

    def test_it_carries_the_business_timezone_name_and_keeps_the_existing_variables(self):
        v = self.post({"id": "b1", "opening_hours": OFFICE, "country": "FR"}, "Europe/Paris")
        self.assertEqual(v["system_timezone"], "Europe/Paris")
        self.assertIn(v["is_open_now"], ("yes", "no"))
        self.assertTrue(v["open_status"])

    def test_the_name_follows_the_business_not_a_default(self):
        self.assertEqual(self.post({"id": "b1", "opening_hours": OFFICE, "country": "FR"}, "America/New_York")["system_timezone"], "America/New_York")
        # no timezone of its own: the country's usual one
        self.assertEqual(self.post({"id": "b1", "opening_hours": OFFICE, "country": "ES"}, None)["system_timezone"], "Europe/Madrid")

    def test_when_the_timezone_is_unknown_the_call_is_never_blocked(self):
        self.assertEqual(self.post({"id": "b1", "opening_hours": OFFICE, "country": "ZZ"}, None), {})


if __name__ == "__main__":
    unittest.main()
