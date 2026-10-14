"""Run from backend/:  python -m unittest discover -s tests -v

scripts/onboard_business.py with fakes only: it must never touch a real Supabase from here."""
import copy
import io
import json
import os
import sys
import tempfile
import unittest
from contextlib import redirect_stdout
from types import SimpleNamespace

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "scripts"))
sys.path.insert(0, os.path.dirname(__file__))

import onboard_business as ob  # noqa: E402
from fakes import FakeSupabase  # noqa: E402

EXAMPLE = os.path.join(os.path.dirname(__file__), "..", "scripts", "onboard_example.json")


def example():
    with open(EXAMPLE, encoding="utf-8") as fh:
        return json.load(fh)


class FakeAdmin:
    def __init__(self, log, existing=()):
        self.log, self.users = log, [SimpleNamespace(id=f"u{i}", email=e) for i, e in enumerate(existing)]

    def list_users(self, page=None, per_page=None):
        self.log.append("list_users")
        return list(self.users)

    def create_user(self, attrs):
        self.log.append(("create_user", copy.deepcopy(attrs)))
        user = SimpleNamespace(id="new-user", email=attrs["email"])
        self.users.append(user)
        return SimpleNamespace(user=user)

    def delete_user(self, uid, should_soft_delete=False):
        self.log.append(("delete_user", uid))
        self.users = [u for u in self.users if u.id != uid]


class FakeClient(FakeSupabase):
    """FakeSupabase's tables plus auth.admin, logging every write in order."""

    def __init__(self, existing_emails=(), fail_insert=False):
        super().__init__()
        self.log = []
        self.auth = SimpleNamespace(admin=FakeAdmin(self.log, existing_emails))
        if fail_insert:
            self.fail_inserts_on = {"businesses"}

    def table(self, name):
        q = super().table(name)
        original = q.insert

        def insert(row):
            self.log.append(("insert", name, copy.deepcopy(row)))
            return original(row)
        q.insert = insert
        return q


class Validation(unittest.TestCase):
    def errors(self, **over):
        cfg = example()
        cfg.update(over)
        return ob.validate(cfg)[0]

    def test_the_example_is_valid_and_normalised(self):
        errors, rec = ob.validate(example())
        self.assertEqual(errors, [])
        self.assertEqual(rec["user"], {"email": "hello@lmcagents.example", "email_confirm": True, "user_metadata": {"language": "fr"}})
        b = rec["business"]
        self.assertEqual((b["country"], b["timezone"], b["language"]), ("FR", "Europe/Paris", "fr"))
        self.assertEqual(b["opening_hours"]["is_24_7"], False)
        self.assertEqual(list(b["opening_hours"]["days"]), ob.DAYS)
        self.assertEqual(b["opening_hours"]["days"]["fri"][1], {"open": "13:30", "close": "16:30"})

    def test_field_checks(self):
        self.assertIn("timezone: 'Europe/Pariss' is not a valid IANA timezone", self.errors(timezone="Europe/Pariss"))
        self.assertIn("country: must be FR or ES", self.errors(country="GB"))
        self.assertIn("language: must be one of fr, es, en", self.errors(language="de"))
        self.assertIn("user_language: must be one of fr, es, en", self.errors(user_language="FR "))
        self.assertIn("owner_email: not an email address", self.errors(owner_email="owner at example"))
        self.assertIn("notification_email: not an email address", self.errors(notification_email="x@y"))
        self.assertIn("retell_agent_id: expected 'agent_' followed by lowercase hex", self.errors(retell_agent_id="agt_123"))
        self.assertIn("phone_number: expected E.164, e.g. +33639981234", self.errors(phone_number="06 39 98 12 34"))
        self.assertIn("missing field: business_name", self.errors(business_name=""))
        self.assertEqual(self.errors(phone_number=None), [])  # optional

    def test_opening_hours_shape_order_and_overlaps(self):
        week = {d: [] for d in ob.DAYS}
        self.assertEqual(ob.validate_hours(week), [])
        self.assertEqual(ob.validate_hours({"is_24_7": True}), [])
        self.assertEqual(ob.validate_hours({"days": week}), [])
        self.assertIn("opening_hours.sun: must be a list of windows ([] when closed)", ob.validate_hours({d: [] for d in ob.DAYS[:6]}))
        bad = dict(week, mon=[{"open": "12:00", "close": "08:00"}])
        self.assertIn("opening_hours.mon: 12:00-08:00 closes before it opens", ob.validate_hours(bad))
        bad = dict(week, tue=[{"open": "08:00", "close": "12:30"}, {"open": "12:00", "close": "17:00"}])
        self.assertIn("opening_hours.tue: 08:00-12:30 overlaps 12:00-17:00", ob.validate_hours(bad))
        touching = dict(week, wed=[{"open": "13:30", "close": "17:30"}, {"open": "08:00", "close": "13:30"}])
        self.assertEqual(ob.validate_hours(touching), [])  # back to back, any order, is fine
        bad = dict(week, thu=[{"open": "8:00", "close": "12:00"}])
        self.assertTrue(any("must be" in e for e in ob.validate_hours(bad)))  # H:MM is not HH:MM
        bad = dict(week, fri=[{"open": "24:00", "close": "25:00"}])
        self.assertTrue(any("fri" in e for e in ob.validate_hours(bad)))
        self.assertIn("opening_hours: unknown day 'lun'", ob.validate_hours(dict(week, lun=[])))


class Applying(unittest.TestCase):
    def setUp(self):
        self.rec = ob.validate(example())[1]

    def test_the_user_is_created_before_the_business_which_points_at_it(self):
        client = FakeClient()
        out = []
        ids = ob.apply(client, self.rec, out.append)
        writes = [e for e in client.log if isinstance(e, tuple)]
        self.assertEqual([w[0] for w in writes], ["create_user", "insert"])
        self.assertEqual(writes[0][1]["user_metadata"], {"language": "fr"})
        self.assertTrue(writes[0][1]["email_confirm"])
        self.assertEqual(writes[1][1], "businesses")
        self.assertEqual(writes[1][2]["owner_id"], "new-user")
        self.assertEqual(client.rows("businesses")[0]["retell_agent_id"], "agent_0123456789abcdef0123456789")
        self.assertEqual(ids["user_id"], "new-user")

    def test_refuses_an_existing_email_and_creates_nothing(self):
        client = FakeClient(existing_emails=["Hello@LMCAgents.example"])  # case does not matter
        with self.assertRaises(SystemExit) as cm:
            ob.apply(client, self.rec, lambda *_: None)
        self.assertIn("already exists", str(cm.exception))
        self.assertFalse([e for e in client.log if isinstance(e, tuple)])
        self.assertEqual(client.rows("businesses"), [])

    def test_refuses_an_agent_id_already_in_use_and_creates_nothing(self):
        client = FakeClient()
        client.tables["businesses"].append({"id": "b0", "retell_agent_id": "agent_0123456789abcdef0123456789"})
        with self.assertRaises(SystemExit) as cm:
            ob.apply(client, self.rec, lambda *_: None)
        self.assertIn("already uses", str(cm.exception))
        self.assertFalse([e for e in client.log if isinstance(e, tuple)])

    def test_a_failed_insert_deletes_the_new_user_again(self):
        client = FakeClient(fail_insert=True)
        with self.assertRaises(SystemExit) as cm:
            ob.apply(client, self.rec, lambda *_: None)
        self.assertIn("the user was deleted again", str(cm.exception))
        self.assertEqual([e[0] for e in client.log if isinstance(e, tuple)], ["create_user", "insert", "delete_user"])
        self.assertEqual(client.auth.admin.users, [])


class CommandLine(unittest.TestCase):
    def run_main(self, argv, factory=None):
        out = []
        return ob.main(argv, client_factory=factory, out=out.append), "\n".join(out)

    def test_dry_run_is_the_default_and_never_builds_a_client(self):
        def boom():
            raise AssertionError("a dry run must not connect")
        code, text = self.run_main([EXAMPLE], factory=boom)
        self.assertEqual(code, 0)
        self.assertIn("DRY RUN: nothing was created", text)
        self.assertIn("owner_id = the new user's id", text)

    def test_invalid_file_exits_1_and_lists_every_error(self):
        cfg = example()
        cfg.update(timezone="Mars/Olympus", country="DE")
        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as fh:
            json.dump(cfg, fh)
        self.addCleanup(os.unlink, fh.name)
        code, text = self.run_main([fh.name, "--apply"], factory=lambda: FakeClient())
        self.assertEqual(code, 1)
        self.assertIn("INVALID", text)
        self.assertIn("timezone", text)
        self.assertIn("country", text)

    def test_apply_without_credentials_exits_2(self):
        env = {k: v for k, v in os.environ.items() if k not in ("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY")}
        old = dict(os.environ)
        os.environ.clear()
        os.environ.update(env)
        try:
            code, text = self.run_main([EXAMPLE, "--apply"])
        finally:
            os.environ.clear()
            os.environ.update(old)
        self.assertEqual(code, 2)
        self.assertIn("SUPABASE_SERVICE_ROLE_KEY", text)

    def test_apply_with_a_fake_client(self):
        client = FakeClient()
        code, text = self.run_main([EXAMPLE, "--apply"], factory=lambda: client)
        self.assertEqual(code, 0)
        self.assertIn("created business", text)
        self.assertEqual(len(client.rows("businesses")), 1)

    def test_unreadable_file_exits_2(self):
        self.assertEqual(self.run_main(["no/such/file.json"])[0], 2)

    def test_help(self):
        with redirect_stdout(io.StringIO()), self.assertRaises(SystemExit) as cm:
            ob.main(["--help"])
        self.assertEqual(cm.exception.code, 0)


if __name__ == "__main__":
    unittest.main()
