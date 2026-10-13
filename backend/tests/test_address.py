"""Run from backend/:  python -m unittest discover -s tests -v"""
import json
import os
import sys
import unittest
from unittest import mock
from types import SimpleNamespace

for key in ("OPENAI_API_KEY", "RETELL_API_KEY", "RESEND_API_KEY", "SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"):
    os.environ.setdefault(key, "test")
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.dirname(__file__))

from app.models.call import ExtractedCallData  # noqa: E402
from app.services import ai, call_ingest, notify  # noqa: E402
from fakes import FakeSupabase  # noqa: E402

BUSINESS = {"id": "biz1", "name": "LMC Agents", "language": "fr", "country": "FR", "notification_email": "hello@lmcagents.example", "opening_hours": {}}
ADDRESS = "12 rue des Lilas, Lyon"


def extraction(**over):
    base = dict(
        caller_name="Clémence", intent="book_appointment", summary="Fuite sous l'évier.", urgency="high",
        preferred_time="vendredi à 15 h", preferred_time_iso="2026-10-02T15:00:00+02:00", booking_type="appointment",
        extraction_complete=True, extraction_confidence=0.9, address=ADDRESS,
    )
    base.update(over)
    return ExtractedCallData(**base)


class AddressInTheModel(unittest.TestCase):
    def test_it_is_kept_exactly_as_said(self):
        self.assertEqual(extraction(address="  Calle Mayor 5, Zaragoza ").address, "Calle Mayor 5, Zaragoza")  # trimmed, nothing else
        self.assertEqual(extraction(address="14 Hawthorn Road, Leeds").address, "14 Hawthorn Road, Leeds")
        self.assertEqual(extraction(address="rue de l'Église 3, Genève").address, "rue de l'Église 3, Genève")  # accents and quotes untouched

    def test_nullish_strings_are_null_like_the_other_text_fields(self):
        for junk in ("null", "None", "n/a", "NA", "", "   "):
            self.assertIsNone(extraction(address=junk).address, repr(junk))
        self.assertIsNone(ExtractedCallData().address)

    def test_it_comes_through_the_model_json(self):
        parsed = json.loads('{"intent": "book_appointment", "address": "3 Quai Voltaire, Paris", "extraction_complete": true}')
        self.assertEqual(ExtractedCallData(**parsed).address, "3 Quai Voltaire, Paris")


class PromptRules(unittest.TestCase):
    def prompt(self, lang="fr"):
        return ai.build_system_prompt(lang)

    def test_address_is_asked_for_verbatim_not_translated(self):
        p = self.prompt()
        self.assertIn("- address:", p)
        self.assertIn("written as the caller said it", p)
        self.assertIn("DIGITS even when they were spoken as words", p)
        self.assertIn("do not translate", p)
        self.assertIn("Null if\n  the caller gave no address", p)

    def test_outcome_reason_says_captured_never_confirmed(self):
        p = self.prompt("es")
        self.assertIn("REQUEST WAS CAPTURED", p)
        self.assertIn('NEVER write that it was "confirmed", "booked"', p)

    def test_caller_phone_is_never_listed_as_missing(self):
        self.assertIn("NEVER list\n  caller_phone here", self.prompt("en"))

    def test_the_extraction_round_trip_uses_the_new_field(self):
        reply = json.dumps({"intent": "book_appointment", "address": "12 rue des Lilas, Lyon", "summary": "x", "extraction_complete": True,
                            "extraction_confidence": 0.9, "missing_fields": []})
        fake = mock.Mock()
        fake.with_options.return_value.chat.completions.create.return_value = SimpleNamespace(
            model="m", usage=SimpleNamespace(model_dump=lambda: {}), choices=[SimpleNamespace(message=SimpleNamespace(content=reply))])
        with mock.patch.object(ai, "client", fake):
            got, _ = ai.extract_call_data("Agent: Bonjour\nUser: au 12 rue des Lilas à Lyon", "2026-10-01T10:00:00+02:00", "fr")
        self.assertEqual(got.address, "12 rue des Lilas, Lyon")
        sent = fake.with_options.return_value.chat.completions.create.call_args.kwargs["messages"][0]["content"]
        self.assertIn("- address:", sent)


class AddressInTheIngest(unittest.TestCase):
    def setUp(self):
        self.db = FakeSupabase()
        self.call = {"call_id": "c1", "from_number": "+33600000001", "transcript": "t", "start_timestamp": 1_760_000_000_000, "end_timestamp": 1_760_000_090_000}

    def run_complete(self, ex):
        call_id, _ = call_ingest.store_stub(self.db, BUSINESS, self.call, "t")
        with mock.patch.object(call_ingest, "extract_call_data", return_value=(ex, {})), \
                mock.patch.object(call_ingest, "notify_owner"), mock.patch.object(call_ingest, "business_timezone", return_value="Europe/Paris"):
            call_ingest.complete_call(self.db, BUSINESS, call_id, self.call, "t")
        return self.db.rows("calls")[0]

    def test_the_address_lands_on_the_call_and_the_booking(self):
        row = self.run_complete(extraction())
        self.assertEqual(row["address"], ADDRESS)
        self.assertEqual(self.db.rows("bookings")[0]["address"], ADDRESS)

    def test_no_address_stays_null_on_both(self):
        row = self.run_complete(extraction(address=None))
        self.assertIsNone(row["address"])
        self.assertIsNone(self.db.rows("bookings")[0]["address"])

    def test_a_non_booking_call_still_stores_the_address_on_the_call(self):
        row = self.run_complete(extraction(intent="inquiry", booking_type=None))
        self.assertEqual(row["address"], ADDRESS)
        self.assertEqual(self.db.rows("bookings"), [])

    def test_caller_phone_is_dropped_from_missing_fields_when_a_number_is_stored(self):
        # the model listed it, but the caller-ID fallback stored a number
        row = self.run_complete(extraction(missing_fields=["caller_phone", "party_size"]))
        self.assertEqual(row["caller_phone"], "+33600000001")
        self.assertEqual(row["missing_fields"], ["party_size"])

    def test_caller_phone_stays_listed_when_no_number_exists_at_all(self):
        self.call["from_number"] = None
        row = self.run_complete(extraction(missing_fields=["caller_phone"]))
        self.assertIsNone(row["caller_phone"])
        self.assertEqual(row["missing_fields"], ["caller_phone"])


class AddressInTheEmail(unittest.TestCase):
    def html(self, lang, address):
        sent = {}
        with mock.patch.object(notify.resend.Emails, "send", side_effect=lambda m: sent.update(m)):
            notify.notify_owner({**BUSINESS, "language": lang}, extraction(address=address), "call-1", "+33600000001")
        return sent["html"]

    def test_the_address_is_labelled_in_the_business_language_and_linked_to_maps(self):
        for lang, label, maps in (("en", "Address", "Open in Maps"), ("es", "Dirección", "Abrir en Maps"), ("fr", "Adresse", "Ouvrir dans Maps")):
            h = self.html(lang, ADDRESS)
            self.assertIn(f">{label}</div>", h)
            self.assertIn(ADDRESS, h)
            self.assertIn(maps, h)
            self.assertIn("https://www.google.com/maps/search/?api=1&amp;query=12%20rue%20des%20Lilas%2C%20Lyon", h)

    def test_no_address_leaves_the_row_out_and_has_no_link(self):
        h = self.html("en", None)
        self.assertNotIn(">Address</div>", h)
        self.assertNotIn("google.com/maps", h)

    def test_the_extraction_failed_email_has_no_address_row(self):
        # nothing was extracted, so the row would always be a dash: it is left out, in every language
        for lang, label, maps in (("en", "Address", "Open in Maps"), ("es", "Dirección", "Abrir en Maps"), ("fr", "Adresse", "Ouvrir dans Maps")):
            _, h = notify.render_review_email({**BUSINESS, "language": lang}, "call-2", "+33600000001")
            self.assertNotIn(f">{label}</div>", h)
            self.assertNotIn(maps, h)
            self.assertNotIn("google.com/maps", h)
            self.assertIn("+33600000001", h)  # the phone row and the dashboard button are still there
            self.assertIn("/dashboard/calls/call-2", h)

    def test_the_address_is_escaped(self):
        h = self.html("en", '<script>alert(1)</script> "x"')
        self.assertNotIn("<script>", h)
        self.assertIn("&lt;script&gt;", h)


class EmailsWithoutDashes(unittest.TestCase):
    """The owner never sees a placeholder dash: empty rows are left out, subject and heading carry no em dash."""
    LANGS = ("en", "es", "fr")

    def biz(self, lang, **over):
        return {**BUSINESS, "language": lang, "name": "Plomberie Lilas", **over}

    def empty(self, **over):
        base = dict(caller_name=None, caller_phone=None, preferred_time=None, preferred_time_iso=None, booking_type="appointment",
                    party_size=None, summary=None, urgency="normal", address=None)
        base.update(over)
        return SimpleNamespace(**base)

    def test_a_fully_empty_extraction_has_no_em_dash_in_subject_or_body(self):
        for lang in self.LANGS:
            subject, h = notify.render_owner_email(self.biz(lang), self.empty(), "c1")
            self.assertNotIn("—", subject, lang)
            self.assertNotIn("—", h, lang)
            subject, h = notify.render_review_email(self.biz(lang), "c1", None)
            self.assertNotIn("—", subject, lang)
            self.assertNotIn("—", h, lang)

    def test_empty_rows_are_left_out_and_type_and_urgency_stay(self):
        labels = {"en": ("Client", "Phone", "Address", "Requested date/time", "Party size", "Summary", "Type", "Urgency"),
                  "es": ("Cliente", "Teléfono", "Dirección", "Fecha/hora solicitada", "Personas", "Resumen", "Tipo", "Urgencia"),
                  "fr": ("Client", "Téléphone", "Adresse", "Date/heure demandée", "Personnes", "Résumé", "Type", "Urgence")}
        for lang in self.LANGS:
            _, h = notify.render_owner_email(self.biz(lang), self.empty(), "c1")
            for gone in labels[lang][:6]:
                self.assertNotIn(f">{gone}</div>", h, f"{lang}: {gone}")
            for kept in labels[lang][6:]:
                self.assertIn(f">{kept}</div>", h, f"{lang}: {kept}")
            # one row present when its value is there
            _, h = notify.render_owner_email(self.biz(lang), self.empty(caller_name="Sam", party_size=2, summary="Fuite"), "c1")
            for present in (labels[lang][0], labels[lang][4], labels[lang][5]):
                self.assertIn(f">{present}</div>", h)

    def test_the_review_email_omits_the_phone_row_without_a_phone(self):
        labels = {"en": "Phone", "es": "Teléfono", "fr": "Téléphone"}
        for lang in self.LANGS:
            _, h = notify.render_review_email(self.biz(lang), "c1", None)
            self.assertNotIn(f">{labels[lang]}</div>", h)
            _, h = notify.render_review_email(self.biz(lang), "c1", "+33600000001")
            self.assertIn(f">{labels[lang]}</div>", h)

    def test_subjects_have_the_new_shape(self):
        s, _ = notify.render_owner_email(self.biz("fr"), self.empty(caller_name="Clémence"), "c1")
        self.assertEqual(s, "Nouvelle demande : Clémence (Plomberie Lilas)")
        s, _ = notify.render_owner_email(self.biz("fr"), self.empty(), "c1")
        self.assertEqual(s, "Nouvelle demande : Plomberie Lilas")
        s, _ = notify.render_owner_email(self.biz("en"), self.empty(caller_name="Sam"), "c1")
        self.assertEqual(s, "New request : Sam (Plomberie Lilas)")
        s, _ = notify.render_owner_email(self.biz("es"), self.empty(), "c1")
        self.assertEqual(s, "Nueva solicitud : Plomberie Lilas")
        s, _ = notify.render_review_email(self.biz("fr"), "c1")
        self.assertEqual(s, "Appel à vérifier : Plomberie Lilas")

    def test_the_heading_is_just_the_heading_and_the_business_name_moves_to_the_intro(self):
        _, h = notify.render_owner_email(self.biz("fr", name="Plomberie <b>Lilas</b>"), self.empty(), "c1")
        self.assertIn(">Nouvelle demande</td>", h)
        self.assertIn("Plomberie &lt;b&gt;Lilas&lt;/b&gt;</td>", h)  # escaped, in the cell under the heading
        _, h = notify.render_review_email(self.biz("fr"), "c1")
        self.assertIn(">Appel à vérifier</td>", h)
        self.assertIn("Plomberie Lilas<br>", h)

    def test_the_time_row_is_formatted_from_the_iso_value_in_the_business_timezone(self):
        # 15 Oct 2026 is a Thursday; 14:00 UTC is 16:00 in Paris (UTC+2)
        for lang, expected in (("fr", "jeudi 15 octobre à 16:00"), ("en", "Thursday 15 October at 16:00"), ("es", "jueves 15 de octubre a las 16:00")):
            _, h = notify.render_owner_email(self.biz(lang), self.empty(preferred_time="jeudi vers 16 h", preferred_time_iso="2026-10-15T14:00:00+00:00"), "c1")
            self.assertIn(expected, h, lang)
            self.assertNotIn("vers 16 h", h)  # never both
        # a naive ISO value is already local time; an explicit tz argument wins over the business country
        _, h = notify.render_owner_email(self.biz("en"), self.empty(preferred_time_iso="2026-10-15T16:00:00"), "c1")
        self.assertIn("Thursday 15 October at 16:00", h)
        from zoneinfo import ZoneInfo
        _, h = notify.render_owner_email(self.biz("en"), self.empty(preferred_time_iso="2026-10-15T14:00:00+00:00"), "c1", tz=ZoneInfo("America/New_York"))
        self.assertIn("Thursday 15 October at 10:00", h)

    def test_the_time_row_falls_back_to_the_raw_words(self):
        _, h = notify.render_owner_email(self.biz("fr"), self.empty(preferred_time="demain vers 15 h"), "c1")
        self.assertIn("demain vers 15 h", h)
        _, h = notify.render_owner_email(self.biz("fr"), self.empty(preferred_time="demain vers 15 h", preferred_time_iso="not a date"), "c1")
        self.assertIn("demain vers 15 h", h)  # an unparseable ISO value
        _, h = notify.render_owner_email(self.biz("fr"), self.empty(), "c1")
        self.assertNotIn(">Date/heure demandée</div>", h)


if __name__ == "__main__":
    unittest.main()
