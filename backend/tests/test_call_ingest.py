"""Run from backend/:  python -m unittest discover -s tests -v"""
import asyncio
import hashlib
import hmac
import io
import json
import os
import sys
import time
import unittest
from contextlib import redirect_stdout
from unittest import mock

for key in ("OPENAI_API_KEY", "RETELL_API_KEY", "RESEND_API_KEY", "SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"):
    os.environ.setdefault(key, "test")
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.dirname(__file__))

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from app.models.call import ExtractedCallData  # noqa: E402
from app.routers import webhooks  # noqa: E402
from app.services import call_ingest  # noqa: E402
from fakes import FakeSupabase  # noqa: E402

BUSINESS = {"id": "biz1", "name": "Test Biz", "language": "en", "country": "FR", "notification_email": "owner@example.com", "opening_hours": {}}
RAW_OK = {"model": "x", "usage": {}, "raw_text": "{}"}


def call_ended(call_id="call_1", **over):
    call = {
        "call_id": call_id, "agent_id": "agent_1", "from_number": "+33600000001", "to_number": "+33100000001",
        "transcript": "Agent: Hello\nUser: I need a plumber tomorrow at three, my name is Sam",
        "start_timestamp": 1_760_000_000_000, "end_timestamp": 1_760_000_090_000, "disconnection_reason": "user_hangup",
    }
    call.update(over)
    return {"event": "call_ended", "call": call}


def signed(body, raw=None):
    raw = raw if raw is not None else json.dumps(body).encode()
    ts = str(int(time.time() * 1000))
    digest = hmac.new(os.environ["RETELL_API_KEY"].encode(), raw + ts.encode(), hashlib.sha256).hexdigest()
    return raw, {"x-retell-signature": f"v={ts},d={digest}", "content-type": "application/json"}


def booking_extraction(**over):
    base = dict(
        caller_name="Sam", caller_phone=None, intent="book_appointment", summary="Needs a plumber tomorrow at three.",
        urgency="normal", preferred_time="tomorrow at three", preferred_time_iso="2026-10-02T15:00:00+02:00",
        booking_type="appointment", extraction_complete=True, extraction_confidence=0.9,
    )
    base.update(over)
    return ExtractedCallData(**base)


class Harness(unittest.TestCase):
    """Posts signed webhooks to the real route with a fake database, a fake
    extraction and a recorded owner email."""

    def setUp(self):
        self.db = FakeSupabase()
        self.client = TestClient(app)
        self.extract = mock.Mock(return_value=(booking_extraction(), RAW_OK))
        self.notify = mock.Mock()
        self.patches = [
            mock.patch.object(webhooks, "get_supabase_admin", return_value=self.db),
            mock.patch.object(webhooks, "find_business", return_value=BUSINESS),
            mock.patch.object(call_ingest, "extract_call_data", self.extract),
            mock.patch.object(call_ingest, "notify_owner", self.notify),
        ]
        for p in self.patches:
            p.start()
            self.addCleanup(p.stop)

    def post(self, body, raw=None):
        raw, headers = signed(body, raw)
        return self.client.post("/webhooks/retell", content=raw, headers=headers)


class CallEnded(Harness):
    def test_the_call_is_stored_then_completed_on_the_same_row(self):
        r = self.post(call_ended())
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["status"], "accepted")
        calls = self.db.rows("calls")
        self.assertEqual(len(calls), 1)
        row = calls[0]
        self.assertEqual(row["retell_call_id"], "call_1")
        self.assertEqual(row["duration_seconds"], 90)
        self.assertEqual(row["status"], "request_captured")  # updated after the extraction
        self.assertEqual(row["caller_name"], "Sam")
        self.assertEqual(row["caller_phone"], "+33600000001")  # Caller ID, none was stated
        self.assertEqual(len(self.db.rows("bookings")), 1)
        self.assertEqual(self.db.rows("bookings")[0]["status"], "pending")
        self.notify.assert_not_called()  # routine, complete: no email (urgent-only rule)

    def test_the_response_does_not_wait_for_the_extraction(self):
        with mock.patch.object(call_ingest, "complete_call") as complete:
            r = self.post(call_ended())
        self.assertEqual(r.json()["status"], "accepted")
        row = self.db.rows("calls")[0]
        self.assertEqual(row["status"], "needs_review")  # the stub, before any extraction
        self.assertEqual(row["raw_payload"], {"stage": "received"})
        complete.assert_called_once()  # scheduled to run after the response
        self.extract.assert_not_called()

    def test_duplicate_delivery_makes_one_row_one_booking_one_extraction(self):
        first = self.post(call_ended())
        second = self.post(call_ended())
        third = self.post(call_ended())
        self.assertEqual(first.json()["status"], "accepted")
        self.assertEqual(second.json()["status"], "duplicate")
        self.assertEqual(third.json()["status"], "duplicate")
        self.assertEqual(len(self.db.rows("calls")), 1)
        self.assertEqual(len(self.db.rows("bookings")), 1)
        self.assertEqual(self.extract.call_count, 1)

    def test_two_deliveries_racing_the_unique_index(self):
        # the second insert loses to the unique index: it must find the winner, not fail
        biz = BUSINESS
        call = call_ended()["call"]
        first_id, created = call_ingest.store_stub(self.db, biz, call, call["transcript"])
        self.assertTrue(created)
        original = call_ingest.store_stub

        # simulate: the pre-insert lookup sees nothing (stale), the insert then collides
        db2 = self.db
        real_table = db2.table
        state = {"lookups": 0}

        def table(name):
            q = real_table(name)
            if name == "calls":
                real_exec = q.execute

                def execute():
                    if q.op == "select" and state["lookups"] == 0:
                        state["lookups"] += 1
                        from types import SimpleNamespace
                        return SimpleNamespace(data=[])
                    return real_exec()

                q.execute = execute
            return q

        with mock.patch.object(db2, "table", table):
            second_id, created2 = original(db2, biz, call, call["transcript"])
        self.assertEqual((second_id, created2), (first_id, False))
        self.assertEqual(len(db2.rows("calls")), 1)

    def test_extraction_failure_leaves_the_call_as_needs_review_and_alerts_the_owner(self):
        fallback = ExtractedCallData(extraction_complete=False, extraction_confidence=0.0, notes="AI extraction failed (APIError).")
        self.extract.return_value = (fallback, {"error": "boom", "error_type": "APIError"})
        r = self.post(call_ended())
        self.assertEqual(r.json()["status"], "accepted")
        row = self.db.rows("calls")[0]
        self.assertEqual(row["status"], "needs_review")
        self.assertEqual(row["transcript"], call_ended()["call"]["transcript"])  # nothing lost
        self.assertEqual(len(self.db.rows("bookings")), 0)
        self.notify.assert_called_once()  # a human must read this transcript

    def test_extraction_timeout_or_crash_leaves_the_stub_untouched(self):
        for error in (TimeoutError("timed out"), RuntimeError("worker crashed")):
            db = FakeSupabase()
            call = call_ended(call_id=f"c_{type(error).__name__}")["call"]
            call_id, _ = call_ingest.store_stub(db, BUSINESS, call, call["transcript"])
            with mock.patch.object(call_ingest, "extract_call_data", side_effect=error), redirect_stdout(io.StringIO()):
                result = call_ingest.complete_call(db, BUSINESS, call_id, call, call["transcript"])
            self.assertEqual(result, "left_needs_review")
            row = db.rows("calls")[0]
            self.assertEqual((row["status"], row["extraction_complete"], row.get("ai_extracted_at")), ("needs_review", False, None))

    def test_a_failed_update_does_not_lose_the_call(self):
        call = call_ended()["call"]
        call_id, _ = call_ingest.store_stub(self.db, BUSINESS, call, call["transcript"])
        with mock.patch.object(self.db, "table", side_effect=RuntimeError("db hiccup")), redirect_stdout(io.StringIO()):
            self.assertEqual(call_ingest.complete_call(self.db, BUSINESS, call_id, call, call["transcript"]), "left_needs_review")
        self.assertEqual(len(self.db.rows("calls")), 1)

    def test_if_the_first_insert_fails_the_webhook_errors_so_retell_retries(self):
        self.db.fail_inserts_on = {"calls"}
        with redirect_stdout(io.StringIO()):
            with self.assertRaises(RuntimeError):
                self.post(call_ended())
        self.assertEqual(len(self.db.rows("calls")), 0)

    def test_missing_fields_still_complete(self):
        self.extract.return_value = (ExtractedCallData(summary="Short call.", extraction_complete=False), RAW_OK)
        self.post(call_ended(from_number=None))
        row = self.db.rows("calls")[0]
        self.assertIsNone(row["caller_phone"])
        self.assertIsNone(row["intent"])
        self.assertEqual(row["summary"], "Short call.")
        self.assertEqual(row["status"], "needs_review")
        self.assertEqual(row["missing_fields"], [])

    def test_null_urgency_is_stored_as_null(self):
        self.extract.return_value = (booking_extraction(urgency=None), RAW_OK)
        self.post(call_ended())
        self.assertIsNone(self.db.rows("calls")[0]["urgency"])
        self.notify.assert_not_called()

    def test_the_word_null_is_not_a_value(self):
        self.extract.return_value = (booking_extraction(caller_name="null", caller_phone="None", summary="n/a", notes="null"), RAW_OK)
        self.post(call_ended())
        row = self.db.rows("calls")[0]
        self.assertIsNone(row["caller_name"])
        self.assertIsNone(row["summary"])
        self.assertIsNone(row["notes"])
        self.assertEqual(row["caller_phone"], "+33600000001")  # the "None" the model wrote is ignored; Caller ID used
        self.assertEqual(call_ingest.resolve_caller_phone(booking_extraction(caller_phone="null"), "null", "FR"), None)

    def test_urgent_calls_email_the_owner_routine_ones_do_not(self):
        self.extract.return_value = (booking_extraction(urgency="high"), RAW_OK)
        self.post(call_ended())
        self.notify.assert_called_once()
        self.notify.reset_mock()
        self.extract.return_value = (booking_extraction(urgency="normal"), RAW_OK)
        self.post(call_ended(call_id="call_2"))
        self.notify.assert_not_called()

    def test_a_non_booking_call_creates_no_booking(self):
        self.extract.return_value = (booking_extraction(intent="inquiry", booking_type=None), RAW_OK)
        self.post(call_ended())
        self.assertEqual(len(self.db.rows("bookings")), 0)

    def test_a_bad_iso_time_does_not_break_the_booking(self):
        self.extract.return_value = (booking_extraction(preferred_time_iso="soon"), RAW_OK)
        self.post(call_ended())
        self.assertEqual(len(self.db.rows("bookings")), 1)
        self.assertIsNone(self.db.rows("bookings")[0]["start_time"])

    def test_filtered_and_empty_calls_store_nothing(self):
        for body in (call_ended(disconnection_reason="dial_no_answer"), call_ended(end_timestamp=1_760_000_002_000), call_ended(transcript="")):
            self.assertIn(self.post(body).json()["status"], ("filtered", "no_transcript"))
        self.assertEqual(len(self.db.rows("calls")), 0)

    def test_no_matching_business_stores_nothing(self):
        with mock.patch.object(webhooks, "find_business", return_value=None):
            self.assertEqual(self.post(call_ended()).json()["status"], "error")
        self.assertEqual(len(self.db.rows("calls")), 0)

    def test_malformed_payloads_are_acknowledged_not_crashed(self):
        for raw in (b"not json at all", b"[]", b'{"event": "call_ended", "call": "oops"}', b'{"event": "call_ended"}'):
            r = self.post(None, raw=raw)
            self.assertEqual(r.status_code, 200, raw)
        self.assertEqual(len(self.db.rows("calls")), 0)

    def test_unsigned_requests_are_rejected(self):
        self.assertEqual(self.client.post("/webhooks/retell", json=call_ended()).status_code, 401)


class CallAnalyzed(Harness):
    def analyzed(self, call_id="call_1", sentiment="Positive"):
        return {"event": "call_analyzed", "call": {"call_id": call_id, "call_analysis": {"user_sentiment": sentiment}}}

    def test_sentiment_lands_on_the_matching_row_only(self):
        with mock.patch.object(call_ingest, "ANALYZED_DELAY_SECONDS", 0):
            self.post(call_ended(call_id="call_1"))
            self.post(call_ended(call_id="call_2"))
            r = self.post(self.analyzed("call_1", "Negative"))
        self.assertEqual(r.json()["status"], "updated")
        by_id = {c["retell_call_id"]: c for c in self.db.rows("calls")}
        self.assertEqual(by_id["call_1"]["user_sentiment"], "Negative")
        self.assertIsNone(by_id["call_2"]["user_sentiment"])

    def test_it_never_creates_a_row(self):
        with mock.patch.object(call_ingest, "ANALYZED_DELAY_SECONDS", 0):
            r = self.post(self.analyzed("call_nobody"))
        self.assertEqual(r.json()["status"], "no_match")
        self.assertEqual(len(self.db.rows("calls")), 0)

    def test_arriving_before_call_ended_is_picked_up_when_the_row_appears(self):
        looks = {"n": 0}
        real_sleep = asyncio.sleep

        async def fake_sleep(_s):
            looks["n"] += 1
            if looks["n"] == 2:  # call_ended finally stores its row
                call = call_ended()["call"]
                call_ingest.store_stub(self.db, BUSINESS, call, call["transcript"])
            await real_sleep(0)

        with mock.patch.object(call_ingest.asyncio, "sleep", fake_sleep):
            status = asyncio.run(call_ingest.apply_sentiment(self.db, self.analyzed()["call"]))
        self.assertEqual(status, "updated")
        self.assertEqual(self.db.rows("calls")[0]["user_sentiment"], "Positive")

    def test_nothing_to_do_without_a_sentiment_or_an_id_and_errors_are_quiet(self):
        self.assertEqual(asyncio.run(call_ingest.apply_sentiment(self.db, {"call_id": "x", "call_analysis": {}})), "ignored")
        self.assertEqual(asyncio.run(call_ingest.apply_sentiment(self.db, {"call_analysis": {"user_sentiment": "Neutral"}})), "ignored")
        with mock.patch.object(self.db, "table", side_effect=RuntimeError("down")), redirect_stdout(io.StringIO()):
            self.assertEqual(asyncio.run(call_ingest.apply_sentiment(self.db, self.analyzed()["call"])), "error")


class ReprocessScript(unittest.TestCase):
    def test_dry_run_lists_only_unextracted_needs_review_rows_and_writes_nothing(self):
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "scripts"))
        import reprocess_needs_review as script

        db = FakeSupabase()
        db.tables["calls"] = [
            {"id": "aaaaaaaa-1", "business_id": "b", "created_at": "2026-10-01T10:00:00Z", "transcript": "Agent: hi", "status": "needs_review", "ai_extracted_at": None},
            {"id": "bbbbbbbb-2", "business_id": "b", "created_at": "2026-10-01T11:00:00Z", "transcript": "Agent: hi", "status": "request_captured", "ai_extracted_at": "2026-10-01T11:01:00Z"},
            {"id": "cccccccc-3", "business_id": "b", "created_at": "2026-10-01T12:00:00Z", "transcript": None, "status": "needs_review", "ai_extracted_at": None},
        ]
        before = json.dumps(db.tables, sort_keys=True)
        out = io.StringIO()
        with mock.patch.object(script, "get_supabase_admin", return_value=db), mock.patch.object(sys, "argv", ["x"]), redirect_stdout(out):
            self.assertEqual(script.main(), 0)
        self.assertIn("DRY RUN", out.getvalue())
        self.assertIn("1 call(s)", out.getvalue())
        self.assertIn("aaaaaaaa", out.getvalue())
        self.assertEqual(json.dumps(db.tables, sort_keys=True), before)


if __name__ == "__main__":
    unittest.main()
