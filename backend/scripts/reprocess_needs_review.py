"""Re-run the AI extraction on calls that were stored but never finished.

A call lands as 'needs_review' with no ai_extracted_at when the extraction failed
or timed out (backend/app/services/call_ingest.py). This script finishes them.

DRY-RUN BY DEFAULT: it only lists what it would do. Nothing is written without --apply.
It never sends owner emails (the owner already saw the 'needs review' alert).

    cd backend
    python scripts/reprocess_needs_review.py                    # list candidates
    python scripts/reprocess_needs_review.py --limit 5 --apply  # do five
    python scripts/reprocess_needs_review.py --business-id <uuid> --apply

Needs the backend's environment (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY,
RETELL_API_KEY, RESEND_API_KEY). The output never prints names, numbers or transcripts.
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from app.db.supabase_client import get_supabase_admin  # noqa: E402
from app.services.ai import extract_call_data  # noqa: E402
from app.services.call_ingest import build_update, ensure_booking, resolve_caller_phone  # noqa: E402


def candidates(supabase, business_id: str | None, limit: int):
    """needs_review rows that still have a transcript and whose extraction never ran."""
    query = (
        supabase.table("calls")
        .select("id, business_id, created_at, transcript, caller_phone, status, ai_extracted_at, extraction_complete")
        .eq("status", "needs_review")
        .is_("ai_extracted_at", "null")
        .not_.is_("transcript", "null")
        .order("created_at", desc=False)
        .limit(limit)
    )
    if business_id:
        query = query.eq("business_id", business_id)
    return query.execute().data or []


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--apply", action="store_true", help="actually run the extraction and write the results (default: dry run)")
    ap.add_argument("--limit", type=int, default=50, help="at most this many calls (default 50)")
    ap.add_argument("--business-id", help="only this business")
    args = ap.parse_args()

    supabase = get_supabase_admin()
    rows = candidates(supabase, args.business_id, args.limit)
    mode = "APPLY" if args.apply else "DRY RUN (nothing will be written; add --apply)"
    print(f"{mode}: {len(rows)} call(s) to reprocess")

    businesses: dict[str, dict] = {}
    done = failed = 0
    for row in rows:
        short = row["id"][:8]
        if not args.apply:
            print(f"  would reprocess {short}…  stored {row['created_at'][:16]}  transcript {len(row['transcript'])} chars")
            continue
        biz = businesses.get(row["business_id"]) or supabase.table("businesses").select("id, language, country").eq("id", row["business_id"]).limit(1).execute().data[0]
        businesses[row["business_id"]] = biz
        extracted, raw = extract_call_data(row["transcript"], row["created_at"], biz.get("language", "es"))
        if raw.get("error"):
            print(f"  {short}…  extraction failed again, left as is ({raw.get('error_type')})")
            failed += 1
            continue
        phone = resolve_caller_phone(extracted, row.get("caller_phone"), biz.get("country") or "ES")
        supabase.table("calls").update(build_update(extracted, raw, phone)).eq("id", row["id"]).execute()
        made = ensure_booking(supabase, biz, row["id"], extracted, phone)
        print(f"  {short}…  extracted ({'complete' if extracted.extraction_complete else 'still incomplete'}){', booking created' if made else ''}")
        done += 1
    if args.apply:
        print(f"finished: {done} updated, {failed} failed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
