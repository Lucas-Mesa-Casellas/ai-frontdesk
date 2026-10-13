"""Run from backend/:  python -m unittest discover -s tests -v

The same call and booking through three business timezones (Europe/Paris, Europe/Madrid and,
in tests only, America/Mexico_City), and the 25 Oct 2026 DST change in Paris."""
import os
import sys
import unittest
from types import SimpleNamespace
from unittest import mock
from zoneinfo import ZoneInfo

for key in ("OPENAI_API_KEY", "RETELL_API_KEY", "RESEND_API_KEY", "SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"):
    os.environ.setdefault(key, "test")
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.dirname(__file__))

from app.models.call import ExtractedCallData  # noqa: E402
from app.services import call_ingest, notify  # noqa: E402
from app.services.open_status import FALLBACK_TIMEZONE, business_zone  # noqa: E402
from fakes import FakeSupabase  # noqa: E402

BIZ = {"id": "b1", "name": "LMC Agents", "language": "fr", "country": "FR", "notification_email": "hello@lmcagents.example"}
# a call starting 2026-10-15 22:30 UTC; the caller asks for 16 Oct, 07:00 UTC
CALL = {"call_id": "c1", "from_number": "+33639981234", "transcript": "t",
        "start_timestamp": 1_792_103_400_000, "end_timestamp": 1_792_103_490_000}
BOOKING_ISO = "2026-10-16T07:00:00+00:00"


def extraction(iso=BOOKING_ISO):
    return ExtractedCallData(caller_name="Clémence", intent="book_appointment", urgency="high", booking_type="appointment",
                             preferred_time="demain matin", preferred_time_iso=iso, extraction_complete=True, extraction_confidence=0.9)


class TheChain(unittest.TestCase):
    def test_own_timezone_then_country_then_madrid(self):
        self.assertEqual(str(business_zone("America/Mexico_City", "FR")), "America/Mexico_City")
        self.assertEqual(str(business_zone(None, "FR")), "Europe/Paris")
        self.assertEqual(str(business_zone("Not/AZone", "GB")), "Europe/London")
        self.assertEqual(str(business_zone(None, "ZZ")), "Europe/Madrid")
        self.assertEqual(str(business_zone(None, None)), FALLBACK_TIMEZONE)


class SameCallThreeTimezones(unittest.TestCase):
    def run_call(self, tz_name):
        db = FakeSupabase()
        sent = {}
        call_id, _ = call_ingest.store_stub(db, BIZ, CALL, "t")
        with mock.patch.object(call_ingest, "business_timezone", return_value=tz_name), \
                mock.patch.object(call_ingest, "extract_call_data", return_value=(extraction(), {})) as ex, \
                mock.patch.object(notify.resend.Emails, "send", side_effect=lambda m: sent.update(m)):
            call_ingest.complete_call(db, BIZ, call_id, CALL, "t")
        return ex.call_args.args[1], db.rows("bookings")[0], sent["html"]

    def test_paris_madrid_and_mexico_city(self):
        for tz_name, started, when in (
            ("Europe/Paris", "2026-10-16T00:30:00+02:00", "vendredi 16 octobre à 09:00"),
            ("Europe/Madrid", "2026-10-16T00:30:00+02:00", "vendredi 16 octobre à 09:00"),
            ("America/Mexico_City", "2026-10-15T16:30:00-06:00", "vendredi 16 octobre à 01:00"),
        ):
            started_iso, booking, html = self.run_call(tz_name)
            # the call start given to the extraction is on the business's clock (and its date differs in Mexico City)
            self.assertEqual(started_iso, started, tz_name)
            # the booking keeps the absolute instant; only how it is shown depends on the timezone
            self.assertEqual(booking["start_time"], BOOKING_ISO)
            self.assertEqual(booking["end_time"], "2026-10-16T08:00:00+00:00")
            # the email date row, in the business timezone and language
            self.assertIn(when, html, tz_name)

    def test_a_business_without_a_timezone_uses_its_country_then_madrid(self):
        _, _, html = self.run_call(None)  # BIZ is FR: Paris
        self.assertIn("vendredi 16 octobre à 09:00", html)
        s = notify._STRINGS["fr"]
        self.assertEqual(notify.format_when(s, BOOKING_ISO, business_zone(None, "ZZ")), "vendredi 16 octobre à 09:00")  # Madrid

    def test_the_email_render_alone_uses_the_same_chain(self):
        ex = SimpleNamespace(caller_name=None, caller_phone=None, preferred_time=None, preferred_time_iso=BOOKING_ISO,
                             booking_type="appointment", party_size=None, summary=None, urgency="normal", address=None)
        _, html = notify.render_owner_email({**BIZ, "timezone": "America/Mexico_City"}, ex, "c1")
        self.assertIn("vendredi 16 octobre à 01:00", html)
        _, html = notify.render_owner_email({**BIZ, "country": "ES", "language": "es"}, ex, "c1")
        self.assertIn("viernes 16 de octubre a las 09:00", html)


class DstChangeInParis(unittest.TestCase):
    """Sunday 25 Oct 2026: 03:00 CEST (+02:00) becomes 02:00 CET (+01:00)."""
    s = notify._STRINGS["fr"]
    PARIS = ZoneInfo("Europe/Paris")

    def test_before_during_and_after(self):
        f = lambda iso: notify.format_when(self.s, iso, self.PARIS)  # noqa: E731
        self.assertEqual(f("2026-10-24T22:00:00+00:00"), "dimanche 25 octobre à 00:00")  # still +02:00
        self.assertEqual(f("2026-10-25T00:30:00+00:00"), "dimanche 25 octobre à 02:30")  # the first 02:30
        self.assertEqual(f("2026-10-25T01:30:00+00:00"), "dimanche 25 octobre à 02:30")  # the second one, +01:00
        self.assertEqual(f("2026-10-25T08:00:00+00:00"), "dimanche 25 octobre à 09:00")  # +01:00 after the change
        # a naive time the model wrote in local time is kept as local time
        self.assertEqual(f("2026-10-25T09:00:00"), "dimanche 25 octobre à 09:00")

    def test_the_extraction_label_on_the_day_of_the_change(self):
        db = FakeSupabase()
        call = {**CALL, "start_timestamp": 1_792_918_800_000, "end_timestamp": 1_792_918_890_000}  # 2026-10-25 09:00 UTC
        call_id, _ = call_ingest.store_stub(db, BIZ, call, "t")
        with mock.patch.object(call_ingest, "business_timezone", return_value="Europe/Paris"), \
                mock.patch.object(call_ingest, "extract_call_data", return_value=(extraction(), {})) as ex, \
                mock.patch.object(notify.resend.Emails, "send"):
            call_ingest.complete_call(db, BIZ, call_id, call, "t")
        self.assertEqual(ex.call_args.args[1], "2026-10-25T10:00:00+01:00")


if __name__ == "__main__":
    unittest.main()
