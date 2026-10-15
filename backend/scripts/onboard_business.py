"""Onboard a new client: the owner's login and their business row, from one JSON file.

DRY RUN BY DEFAULT: it validates the file and prints exactly what would be created. Nothing is
written without --apply.

    cd backend
    python scripts/onboard_business.py scripts/onboard_example.json            # validate + show the plan
    python scripts/onboard_business.py path/to/client.json --apply             # create it for real

With --apply it needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment, and then:
  1. refuses if a user with the owner email, or a business with the Retell agent id, already exists;
  2. creates the Auth user (email already confirmed, user_metadata.language set, so the sign-in
     email arrives in the right language; the owner signs in with the magic link, no password);
  3. inserts the businesses row with owner_id = that user's id.
If step 3 fails, the user created in step 2 is deleted again, so a retry starts clean.
The client's file holds personal data: keep it out of the repo (scripts/onboard_example.json is invented).

The JSON (see scripts/onboard_example.json):
    owner_email          the owner's sign-in address
    user_language        fr | es | en   (the sign-in email's language)
    business_name, business_type (e.g. "plumber"), notification_email (where call alerts go)
    language             fr | es | en   (the dashboard and alert language)
    country              FR | ES
    timezone             an IANA name, e.g. "Europe/Paris"
    opening_hours        {"mon": [{"open": "08:00", "close": "12:00"}, ...], ..., "sun": []}
                         (or {"is_24_7": true}); every weekday listed; windows HH:MM, open < close, no overlaps
    retell_agent_id      "agent_" + lowercase hex, as Retell shows it
    phone_number         optional, the Twilio number in E.164 ("+33...")
"""
import argparse
import json
import os
import re
import sys
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
AGENT_RE = re.compile(r"^agent_[0-9a-f]{20,40}$")
HHMM_RE = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")
E164_RE = re.compile(r"^\+[1-9]\d{7,14}$")
LANGS = {"fr", "es", "en"}
COUNTRIES = {"FR", "ES"}
REQUIRED = ["owner_email", "user_language", "business_name", "business_type", "notification_email",
            "language", "country", "timezone", "opening_hours", "retell_agent_id"]


def _minutes(hhmm: str) -> int:
    return int(hhmm[:2]) * 60 + int(hhmm[3:])


def validate_hours(hours) -> list[str]:
    if not isinstance(hours, dict):
        return ["opening_hours must be an object"]
    if hours.get("is_24_7") is True:
        return []
    days = hours.get("days", hours)
    errors = [f"opening_hours: unknown day {d!r}" for d in days if d not in DAYS and d != "is_24_7"]
    for day in DAYS:
        windows = days.get(day)
        if not isinstance(windows, list):
            errors.append(f"opening_hours.{day}: must be a list of windows ([] when closed)")
            continue
        spans = []
        for w in windows:
            if not (isinstance(w, dict) and set(w) == {"open", "close"} and all(isinstance(w[k], str) and HHMM_RE.match(w[k]) for k in w)):
                errors.append(f"opening_hours.{day}: {w!r} must be {{\"open\": \"HH:MM\", \"close\": \"HH:MM\"}}")
                continue
            start, end = _minutes(w["open"]), _minutes(w["close"])
            if start >= end:
                errors.append(f"opening_hours.{day}: {w['open']}-{w['close']} closes before it opens")
                continue
            spans.append((start, end, f"{w['open']}-{w['close']}"))
        spans.sort()
        errors += [f"opening_hours.{day}: {a[2]} overlaps {b[2]}" for a, b in zip(spans, spans[1:]) if b[0] < a[1]]
    return errors


def validate(cfg: dict) -> tuple[list[str], dict]:
    """(errors, the normalised record). Empty errors = valid."""
    if not isinstance(cfg, dict):
        return ["the file must hold one JSON object"], {}
    errors = [f"missing field: {k}" for k in REQUIRED if cfg.get(k) in (None, "")]
    text = {k: str(cfg.get(k, "")).strip() for k in REQUIRED if k != "opening_hours"}
    for key in ("owner_email", "notification_email"):
        if text[key] and not EMAIL_RE.match(text[key]):
            errors.append(f"{key}: not an email address")
    for key in ("user_language", "language"):
        if text[key] and text[key] not in LANGS:
            errors.append(f"{key}: must be one of fr, es, en")
    if text["country"] and text["country"] not in COUNTRIES:
        errors.append("country: must be FR or ES")
    if text["timezone"]:
        try:
            ZoneInfo(text["timezone"])
        except (ZoneInfoNotFoundError, ValueError):
            errors.append(f"timezone: {text['timezone']!r} is not a valid IANA timezone")
    if text["retell_agent_id"] and not AGENT_RE.match(text["retell_agent_id"]):
        errors.append("retell_agent_id: expected 'agent_' followed by lowercase hex")
    phone = cfg.get("phone_number")
    if phone not in (None, "") and not (isinstance(phone, str) and E164_RE.match(phone)):
        errors.append("phone_number: expected E.164, e.g. +33639981234")
    if "opening_hours" in cfg:
        errors += validate_hours(cfg["opening_hours"])
    if errors:
        return errors, {}
    hours = cfg["opening_hours"]
    hours = {"is_24_7": True, "days": {}} if hours.get("is_24_7") is True else {"is_24_7": False, "days": {d: hours.get("days", hours)[d] for d in DAYS}}
    record = {
        "user": {"email": text["owner_email"].lower(), "email_confirm": True, "user_metadata": {"language": text["user_language"]}},
        "business": {
            "name": text["business_name"], "business_type": text["business_type"],
            "notification_email": text["notification_email"], "phone_number": phone or None,
            "language": text["language"], "country": text["country"], "timezone": text["timezone"],
            "opening_hours": hours, "retell_agent_id": text["retell_agent_id"],
        },
    }
    return [], record


def _existing_user(client, email: str):
    page = 1
    while True:
        users = client.auth.admin.list_users(page=page, per_page=1000)
        for u in users:
            if (u.email or "").lower() == email:
                return u
        if len(users) < 1000:
            return None
        page += 1


def apply(client, record: dict, out=print) -> dict:
    """Creates the user, then the business. Refuses duplicates; undoes the user if the insert fails."""
    email, agent = record["user"]["email"], record["business"]["retell_agent_id"]
    if _existing_user(client, email):
        raise SystemExit(f"refused: a user with {email} already exists (nothing was created)")
    if client.table("businesses").select("id").eq("retell_agent_id", agent).limit(1).execute().data:
        raise SystemExit(f"refused: a business already uses {agent} (nothing was created)")
    user = client.auth.admin.create_user(record["user"]).user
    out(f"created user {user.id}")
    try:
        row = client.table("businesses").insert({**record["business"], "owner_id": user.id}).execute().data[0]
    except Exception as e:  # noqa: BLE001 - undo, then report
        client.auth.admin.delete_user(user.id)
        raise SystemExit(f"business insert failed ({type(e).__name__}: {e}); the user was deleted again, nothing is left behind")
    out(f"created business {row['id']} for owner {user.id}")
    return {"user_id": user.id, "business_id": row["id"]}


def main(argv=None, client_factory=None, out=print) -> int:
    ap = argparse.ArgumentParser(description="Onboard a client from a JSON file (dry run unless --apply). See the docstring.")
    ap.add_argument("file", help="the client's JSON file")
    ap.add_argument("--apply", action="store_true", help="really create the user and the business")
    args = ap.parse_args(argv)
    try:
        with open(args.file, encoding="utf-8") as fh:
            cfg = json.load(fh)
    except (OSError, json.JSONDecodeError) as e:
        out(f"cannot read {args.file}: {e}")
        return 2
    errors, record = validate(cfg)
    if errors:
        out("INVALID, nothing would be created:")
        for e in errors:
            out(f"  - {e}")
        return 1
    out("Would create (step 1, Auth user):")
    out(json.dumps(record["user"], ensure_ascii=False, indent=2))
    out("then (step 2, businesses row, owner_id = the new user's id):")
    out(json.dumps(record["business"], ensure_ascii=False, indent=2))
    if not args.apply:
        out("\nDRY RUN: nothing was created. Re-run with --apply to create it.")
        return 0
    if client_factory is None:
        url, key = os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        if not url or not key:
            out("--apply needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment")
            return 2
        from supabase import create_client
        client_factory = lambda: create_client(url, key)  # noqa: E731
    apply(client_factory(), record, out)
    return 0


if __name__ == "__main__":
    sys.exit(main())
