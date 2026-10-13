"""Render the owner notification emails (3 languages x urgent / routine / needs-review)
to HTML files with invented data, for looking at them in a browser. Sends nothing.
Run from backend/:  python scripts/render_email_previews.py [out_dir]"""
import os
import sys
from types import SimpleNamespace

os.environ.setdefault("RESEND_API_KEY", "test")
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services import notify  # noqa: E402

OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "..", "..", "docs", "email-previews")
os.makedirs(OUT, exist_ok=True)

CALLERS = {
    "en": dict(caller_name="Megan Pollard", caller_phone="07700 900123", address="14 Hawthorn Road, Leeds", preferred_time="Friday at 3 pm", summary="Blocked toilet overflowing, needs someone today. Access through the side gate."),
    "es": dict(caller_name="Diego Salvatierra", caller_phone="+34 6•• ••• 482", address="Calle de los Olmos 14, Zaragoza", preferred_time="el viernes a las 15:00", summary="Sin agua caliente en la vivienda desde ayer. Pide que alguien pase hoy si es posible."),
    "fr": dict(caller_name="Clémence Guyot", caller_phone="06 39 98 12 34", address="14 rue des Tilleuls, Lyon", preferred_time="vendredi à 15 h", summary="Chaudière en panne depuis ce matin, une fuite visible. Souhaite être rappelée rapidement."),
}
for lang, c in CALLERS.items():
    tz = {"en": "Europe/London", "es": "Europe/Madrid", "fr": "Europe/Paris"}[lang]
    biz = {"id": "demo", "name": "LMC Agents", "language": lang, "notification_email": "hello@lmcagents.example", "timezone": tz}
    for kind, urgency in (("urgent", "high"), ("routine", "normal")):
        # the urgent email has an address and a date from the ISO value; the routine one has neither
        # (no address row, the caller's own words for the time)
        ex = SimpleNamespace(caller_name=c["caller_name"], caller_phone=c["caller_phone"], preferred_time=c["preferred_time"],
                             address=c["address"] if kind == "urgent" else None,
                             preferred_time_iso="2026-10-15T14:00:00+00:00" if kind == "urgent" else None,
                             booking_type="appointment", party_size=None, summary=c["summary"], urgency=urgency)
        _, html = notify.render_owner_email(biz, ex, "5f1c2d3e-0000-4000-8000-000000000001", c["caller_phone"])
        open(os.path.join(OUT, f"{lang}-{kind}.html"), "w", encoding="utf-8").write(html)
    # almost nothing extracted: no name, address or time
    ex = SimpleNamespace(caller_name=None, caller_phone=None, preferred_time=None, preferred_time_iso=None, address=None,
                         booking_type="callback", party_size=None, summary=None, urgency="normal")
    _, html = notify.render_owner_email(biz, ex, "5f1c2d3e-0000-4000-8000-000000000003", None)
    open(os.path.join(OUT, f"{lang}-almost-empty.html"), "w", encoding="utf-8").write(html)
    _, html = notify.render_review_email(biz, "5f1c2d3e-0000-4000-8000-000000000002", c["caller_phone"])
    open(os.path.join(OUT, f"{lang}-needs-review.html"), "w", encoding="utf-8").write(html)
print("wrote", len(os.listdir(OUT)), "files to", os.path.abspath(OUT))
