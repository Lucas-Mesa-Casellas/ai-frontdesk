"""Test the call extraction without phoning: run the REAL production extraction over saved transcripts.

Each fixture in tests/fixtures/transcripts/*.json is an invented call in the Retell transcript format
(the same "Agent: ... / User: ..." text the call_ended webhook stores). For every case this script runs
app.services.ai.extract_call_data (the production function, prompt and model included), then the same
post-processing call_ingest applies before saving (resolve_caller_phone + build_update: caller-ID
fallback, missing_fields clean-up), and compares the stored fields with the fixture's expectations.

COSTS MONEY AND NEEDS A KEY: every case is one OpenAI request. It needs OPENAI_API_KEY (in the
environment or backend/.env). Nothing is written anywhere: no database, no email.

    cd backend
    python scripts/eval_extraction.py                  # every case once
    python scripts/eval_extraction.py --n 3            # every case three times (shows flaky answers)
    python scripts/eval_extraction.py --only fr_alternative_slot --only es_vague_time
    python scripts/eval_extraction.py --stub           # dry run: no OpenAI, uses each fixture's stub_output
    python scripts/eval_extraction.py --help

Exit code: 0 every checked case passed, 1 at least one failed, 2 setup error (no key, no case matched).
A case with "skip" in its fixture is listed as SKIP and never fails the run.

Fixture shape (all values invented; numbers in the reserved ranges):
    {
      "name": "fr_alternative_slot",            # used by --only
      "language": "fr",                          # businesses.language
      "country": "FR",                           # businesses.country (caller-ID normalisation)
      "call_started_at": "2026-10-14T10:00:00+02:00",
      "from_number": "+33639981234",             # Retell call metadata (caller ID)
      "transcript": ["Agent: ...", "User: ..."],
      "expect": { field: expectation, ... },
      "stub_output": { ...ExtractedCallData fields... },   # optional, for --stub
      "skip": "why"                              # optional
    }
Expectations (fields are those of the stored row: build_update's output):
    "high"                                exact value (null for None)
    {"datetime": ISO, "tolerance_minutes": 0}   same instant (offsets may differ)
    {"iequals": "Paul Combe de force"}    case-insensitive and whitespace-normalised
    {"matches": regex} / {"not_matches": regex}  re.search, case-insensitive
    {"includes": [...]} / {"excludes": [...]}    for list fields such as missing_fields
"""
import argparse
import glob
import json
import os
import re
import sys
from datetime import datetime, timedelta

BACKEND = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
DEFAULT_FIXTURES = os.path.join(BACKEND, "tests", "fixtures", "transcripts")
sys.path.insert(0, BACKEND)


def _backend_env(stub: bool) -> None:
    """Importing the app reads its settings; the eval only ever uses the OpenAI key (and not even that with --stub)."""
    for key in ("SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "RETELL_API_KEY", "RESEND_API_KEY") + (("OPENAI_API_KEY",) if stub else ()):
        os.environ.setdefault(key, "unused-by-eval")


# ---------------------------------------------------------------- scoring (pure, unit-tested)
def _dt(v):
    return datetime.fromisoformat(str(v).replace("Z", "+00:00"))


def check(expected, got) -> tuple[bool, str]:
    """(passed, short explanation) for one field."""
    if not isinstance(expected, dict):
        return got == expected, f"expected {expected!r}"
    if "datetime" in expected:
        if got is None:
            return False, f"expected {expected['datetime']}"
        try:
            ok = abs(_dt(got) - _dt(expected["datetime"])) <= timedelta(minutes=expected.get("tolerance_minutes", 0))
        except (TypeError, ValueError):
            return False, f"unparseable, expected {expected['datetime']}"
        return ok, f"expected {expected['datetime']}"
    if "iequals" in expected:
        norm = lambda v: " ".join(str(v).split()).casefold()  # noqa: E731
        return got is not None and norm(got) == norm(expected["iequals"]), f"expected ~{expected['iequals']!r}"
    if "matches" in expected:
        return got is not None and re.search(expected["matches"], str(got), re.I) is not None, f"should match /{expected['matches']}/"
    if "not_matches" in expected:
        return got is None or re.search(expected["not_matches"], str(got), re.I) is None, f"must not match /{expected['not_matches']}/"
    if "includes" in expected:
        return all(x in (got or []) for x in expected["includes"]), f"should include {expected['includes']}"
    if "excludes" in expected:
        return not any(x in (got or []) for x in expected["excludes"]), f"must not include {expected['excludes']}"
    return False, f"unknown expectation {expected!r}"


def score(expect: dict, row: dict) -> list[tuple[str, bool, str, object]]:
    return [(field, *check(exp, row.get(field)), row.get(field)) for field, exp in expect.items()]


def load_cases(directory: str, only: list[str] | None = None) -> list[dict]:
    cases = []
    for path in sorted(glob.glob(os.path.join(directory, "*.json"))):
        with open(path, encoding="utf-8") as fh:
            case = json.load(fh)
        case.setdefault("name", os.path.splitext(os.path.basename(path))[0])
        if not only or case["name"] in only:
            cases.append(case)
    return cases


# ---------------------------------------------------------------- the pipeline
def production_extractor():
    """The real extraction. Imported only when needed: importing app.services.ai builds the OpenAI client."""
    _backend_env(stub=False)
    from app.services.ai import extract_call_data  # noqa: E402
    return extract_call_data


def stub_extractor(case: dict):
    """A stand-in that returns the fixture's stub_output (for --stub and the harness tests)."""
    from app.models.call import ExtractedCallData
    return lambda transcript, started, language: (ExtractedCallData(**case.get("stub_output", {})), {"stub": True})


def stored_row(case: dict, extractor) -> dict:
    """What call_ingest would save for this call: the extraction, then its own post-processing."""
    from app.services.call_ingest import build_update, resolve_caller_phone
    transcript = "\n".join(case["transcript"]) if isinstance(case["transcript"], list) else case["transcript"]
    extracted, raw = extractor(transcript, case["call_started_at"], case.get("language", "es"))
    phone = resolve_caller_phone(extracted, case.get("from_number"), case.get("country") or "ES")
    return build_update(extracted, raw, phone)


def run(cases: list[dict], n: int, extractor_for, out=print) -> int:
    """Runs every case n times and prints a table. Returns the exit code."""
    failed = checked = 0
    out(f"{'case':<28} {'run':>3}  {'field':<20} {'result':<6} got / expected")
    for case in cases:
        if case.get("skip"):
            out(f"{case['name']:<28} {'-':>3}  {'-':<20} SKIP   {case['skip']}")
            continue
        for i in range(1, n + 1):
            try:
                row = stored_row(case, extractor_for(case))
                results = score(case["expect"], row)
            except Exception as e:  # noqa: BLE001 - report it as a failed run, keep going
                results = [("(run)", False, f"{type(e).__name__}: {e}", None)]
            for field, ok, why, got in results:
                checked += 1
                failed += not ok
                out(f"{case['name']:<28} {i:>3}  {field:<20} {'PASS' if ok else 'FAIL':<6} {got!r}" + ("" if ok else f"  ({why})"))
    out(f"\n{checked - failed}/{checked} checks passed" + (f", {failed} FAILED" if failed else ""))
    return 1 if failed else 0


def main(argv=None, out=print) -> int:
    ap = argparse.ArgumentParser(description="Run the production call extraction over saved transcripts (see the docstring).")
    ap.add_argument("--n", type=int, default=1, help="run every case N times (default 1)")
    ap.add_argument("--only", action="append", help="run only this case (repeatable)")
    ap.add_argument("--fixtures", default=DEFAULT_FIXTURES, help="fixture directory")
    ap.add_argument("--stub", action="store_true", help="dry run: no OpenAI call, use each fixture's stub_output")
    args = ap.parse_args(argv)
    if args.n < 1:
        ap.error("--n must be at least 1")
    cases = load_cases(args.fixtures, args.only)
    if not cases:
        out("no case matched")
        return 2
    if args.stub:
        _backend_env(stub=True)
        extractor_for = stub_extractor
    else:
        if not os.environ.get("OPENAI_API_KEY") and not os.path.exists(os.path.join(BACKEND, ".env")):
            out("OPENAI_API_KEY is not set (and there is no backend/.env): nothing was run. Use --stub for a dry run.")
            return 2
        extract = production_extractor()
        extractor_for = lambda _case: extract  # noqa: E731
    return run(cases, args.n, extractor_for, out)


if __name__ == "__main__":
    sys.exit(main())
