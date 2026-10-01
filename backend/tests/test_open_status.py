"""Run from backend/:  python -m unittest discover -s tests -v"""
import hashlib
import hmac
import json
import os
import sys
import time
import unittest
from datetime import datetime
from unittest import mock
from zoneinfo import ZoneInfo

for key in ("OPENAI_API_KEY", "RETELL_API_KEY", "RESEND_API_KEY", "SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"):
    os.environ.setdefault(key, "test")
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from app.routers import webhooks  # noqa: E402
from app.services.open_status import open_status, resolve_timezone  # noqa: E402

PARIS = ZoneInfo("Europe/Paris")
UTC = ZoneInfo("UTC")


def _day(*windows):
    return [{"open": o, "close": c} for o, c in windows]


# Barazzetti Fils' real schedule (see scheduling.py / migration 010)
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


def at(y, mo, d, h, mi, tz=PARIS):
    """A local wall-clock time in tz, as the UTC instant the server would see."""
    return datetime(y, mo, d, h, mi, tzinfo=tz).astimezone(UTC)


class OpenStatus(unittest.TestCase):
    # 1 Oct 2026 is a Thursday, 2 Oct a Friday, 3 Oct a Saturday, 5 Oct a Monday
    def test_inside_a_window(self):
        self.assertEqual(open_status(OFFICE, PARIS, at(2026, 10, 1, 10, 15)), (True, "open now, until 12:00"))
        self.assertEqual(open_status(OFFICE, PARIS, at(2026, 10, 1, 15, 0)), (True, "open now, until 17:30"))

    def test_in_the_lunch_gap(self):
        self.assertEqual(open_status(OFFICE, PARIS, at(2026, 10, 1, 12, 30)), (False, "closed now, opens again today at 13:30"))

    def test_after_closing_the_reported_case(self):
        # the test call: about 19:30 Paris time, told "we are open right now"
        self.assertEqual(open_status(OFFICE, PARIS, at(2026, 10, 1, 19, 30)), (False, "closed now, next opening Friday 08:00"))

    def test_before_opening(self):
        self.assertEqual(open_status(OFFICE, PARIS, at(2026, 10, 1, 7, 59)), (False, "closed now, opens again today at 08:00"))

    def test_the_exact_boundaries(self):
        self.assertTrue(open_status(OFFICE, PARIS, at(2026, 10, 1, 8, 0))[0])      # opens at 08:00
        self.assertFalse(open_status(OFFICE, PARIS, at(2026, 10, 1, 12, 0))[0])    # closed at 12:00
        self.assertTrue(open_status(OFFICE, PARIS, at(2026, 10, 1, 13, 30))[0])
        self.assertTrue(open_status(OFFICE, PARIS, at(2026, 10, 1, 17, 29))[0])
        self.assertFalse(open_status(OFFICE, PARIS, at(2026, 10, 1, 17, 30))[0])   # closed at 17:30

    def test_friday_evening_rolls_over_the_weekend(self):
        self.assertEqual(open_status(OFFICE, PARIS, at(2026, 10, 2, 16, 30)), (False, "closed now, next opening Monday 08:00"))
        self.assertEqual(open_status(OFFICE, PARIS, at(2026, 10, 2, 19, 0))[1], "closed now, next opening Monday 08:00")

    def test_weekend(self):
        self.assertEqual(open_status(OFFICE, PARIS, at(2026, 10, 3, 10, 0)), (False, "closed now, next opening Monday 08:00"))
        self.assertEqual(open_status(OFFICE, PARIS, at(2026, 10, 4, 15, 0)), (False, "closed now, next opening Monday 08:00"))

    def test_24_7(self):
        always = {"is_24_7": True, "days": {}}
        for when in (at(2026, 10, 1, 3, 0), at(2026, 10, 3, 23, 59), at(2026, 10, 4, 12, 0)):
            self.assertEqual(open_status(always, PARIS, when), (True, "open 24/7"))

    def test_the_business_own_timezone_decides(self):
        instant = datetime(2026, 10, 1, 16, 0, tzinfo=UTC)  # 18:00 in Paris, 09:00 in Los Angeles
        self.assertFalse(open_status(OFFICE, PARIS, instant)[0])
        self.assertTrue(open_status(OFFICE, ZoneInfo("America/Los_Angeles"), instant)[0])

    def test_daylight_saving_time(self):
        # Monday 2 Feb 2026 08:00 Paris is 07:00 UTC (winter); Monday 6 Jul 08:00 Paris is 06:00 UTC (summer)
        self.assertTrue(open_status(OFFICE, PARIS, datetime(2026, 2, 2, 7, 0, tzinfo=UTC))[0])
        self.assertFalse(open_status(OFFICE, PARIS, datetime(2026, 2, 2, 6, 59, tzinfo=UTC))[0])
        self.assertTrue(open_status(OFFICE, PARIS, datetime(2026, 7, 6, 6, 0, tzinfo=UTC))[0])
        self.assertFalse(open_status(OFFICE, PARIS, datetime(2026, 7, 6, 5, 59, tzinfo=UTC))[0])

    def test_missing_hours_use_the_safe_default_not_24_7(self):
        self.assertFalse(open_status(None, PARIS, at(2026, 10, 1, 20, 0))[0])
        self.assertTrue(open_status({}, PARIS, at(2026, 10, 1, 10, 0))[0])  # Mon-Fri 09:00-18:00

    def test_a_schedule_that_never_opens_does_not_hang(self):
        never = {"is_24_7": False, "days": {k: [] for k in ("mon", "tue", "wed", "thu", "fri", "sat", "sun")}}
        self.assertEqual(open_status(never, PARIS, at(2026, 10, 1, 10, 0)), (False, "closed now"))

    def test_timezone_resolution(self):
        self.assertEqual(str(resolve_timezone("Europe/Lisbon", "ES")), "Europe/Lisbon")
        self.assertEqual(str(resolve_timezone(None, "FR")), "Europe/Paris")
        self.assertEqual(str(resolve_timezone("Not/AZone", "ES")), "Europe/Madrid")
        self.assertIsNone(resolve_timezone(None, "ZZ"))
        self.assertIsNone(resolve_timezone(None, None))


def signed(body: dict) -> tuple[bytes, dict]:
    raw = json.dumps(body).encode()
    ts = str(int(time.time() * 1000))
    digest = hmac.new(os.environ["RETELL_API_KEY"].encode(), raw + ts.encode(), hashlib.sha256).hexdigest()
    return raw, {"x-retell-signature": f"v={ts},d={digest}", "content-type": "application/json"}


class FakeTable:
    def __init__(self, data=None, boom=False):
        self.data, self.boom = data or [], boom

    def select(self, *_a):
        return self

    def eq(self, *_a):
        return self

    def limit(self, *_a):
        return self

    def execute(self):
        if self.boom:
            raise RuntimeError("column does not exist")
        return mock.Mock(data=self.data)


class FakeDb:
    def __init__(self, tz_rows=None, tz_boom=False):
        self.tz = FakeTable(tz_rows, tz_boom)

    def table(self, name):
        assert name == "businesses"
        return self.tz


class InboundEndpoint(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.body = {"event": "call_inbound", "call_inbound": {"agent_id": "agent_1", "from_number": "+33600000001", "to_number": "+33100000001", "call_id": "c1"}}

    def post(self, db, business, now):
        raw, sig = signed(self.body)
        with mock.patch.object(webhooks, "get_supabase_admin", return_value=db), \
             mock.patch.object(webhooks, "find_business", return_value=business), \
             mock.patch("app.services.open_status.datetime") as dt:
            # the clock the service reads; everything else on datetime stays real
            dt.now.return_value = now
            return self.client.post("/webhooks/retell-inbound", content=raw, headers=sig)

    def test_closed_answer_has_the_exact_retell_shape(self):
        biz = {"id": "b1", "opening_hours": OFFICE, "country": "FR"}
        r = self.post(FakeDb([{"timezone": "Europe/Paris"}]), biz, at(2026, 10, 1, 19, 30))
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json(), {"call_inbound": {"dynamic_variables": {"is_open_now": "no", "open_status": "closed now, next opening Friday 08:00"}}})

    def test_open_answer(self):
        biz = {"id": "b1", "opening_hours": OFFICE, "country": "FR"}
        r = self.post(FakeDb([{"timezone": "Europe/Paris"}]), biz, at(2026, 10, 1, 10, 0))
        self.assertEqual(r.json()["call_inbound"]["dynamic_variables"], {"is_open_now": "yes", "open_status": "open now, until 12:00"})

    def test_a_missing_timezone_column_falls_back_to_the_countrys(self):
        biz = {"id": "b1", "opening_hours": OFFICE, "country": "FR"}
        r = self.post(FakeDb(tz_boom=True), biz, at(2026, 10, 1, 19, 30))
        self.assertEqual(r.json()["call_inbound"]["dynamic_variables"]["is_open_now"], "no")

    def test_failures_answer_with_no_variables_never_an_error(self):
        empty = {"call_inbound": {"dynamic_variables": {}}}
        now = at(2026, 10, 1, 10, 0)
        self.assertEqual(self.post(FakeDb(), None, now).json(), empty)  # unknown business
        self.assertEqual(self.post(FakeDb(), {"id": "b1", "opening_hours": OFFICE, "country": "ZZ"}, now).json(), empty)  # no timezone known
        bad = {"id": "b1", "opening_hours": {"days": {"mon": [{"open": "oops"}]}}, "country": "FR"}
        self.assertEqual(self.post(FakeDb([{"timezone": "Europe/Paris"}]), bad, at(2026, 10, 5, 10, 0)).json(), empty)  # unreadable hours
        raw, sig = signed(self.body)
        with mock.patch.object(webhooks, "get_supabase_admin", side_effect=RuntimeError("down")):
            r = self.client.post("/webhooks/retell-inbound", content=raw, headers=sig)
        self.assertEqual((r.status_code, r.json()), (200, empty))  # database down

    def test_unsigned_or_forged_requests_are_rejected(self):
        self.assertEqual(self.client.post("/webhooks/retell-inbound", json=self.body).status_code, 401)
        self.assertEqual(self.client.post("/webhooks/retell-inbound", json=self.body, headers={"x-retell-signature": "v=1,d=bad"}).status_code, 401)


if __name__ == "__main__":
    unittest.main()
