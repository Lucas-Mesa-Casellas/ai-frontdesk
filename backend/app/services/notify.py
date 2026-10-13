import os
import html
import urllib.parse
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
import resend

from app.services.open_status import resolve_timezone

resend.api_key = os.environ["RESEND_API_KEY"]

# All business-facing strings, keyed by language. Add a language here before
# using it as a businesses.language value -- notify_owner falls back to "es"
# for any language not defined below.
_STRINGS = {
    "es": {
        "html_lang": "es",
        "subject_prefix": "Nueva solicitud",
        "weekdays": ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"],
        "months": ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"],
        "datetime_fmt": "{weekday} {day} de {month} a las {time}",
        "heading": "Nueva solicitud",
        "label_client": "Cliente",
        "label_phone": "Teléfono",
        "label_address": "Dirección",
        "open_maps": "Abrir en Maps",
        "label_time": "Fecha/hora solicitada",
        "label_type": "Tipo",
        "label_party_size": "Personas",
        "label_summary": "Resumen",
        "label_urgency": "Urgencia",
        "label_call_id": "ID de llamada",
        "open_cta": "Abrir en mi panel",
        "preheader": "Una nueva llamada atendida por tu recepcionista.",
        "review_subject": "Llamada por revisar",
        "review_body": "No hemos podido leer esta llamada automáticamente. La transcripción está guardada: ábrela en tu panel (Llamadas) para revisarla.",
        "urgency": {"low": "baja", "normal": "normal", "high": "alta"},
        "booking_type": {"appointment": "cita", "callback": "llamada de vuelta"},
    },
    "fr": {
        "html_lang": "fr",
        "subject_prefix": "Nouvelle demande",
        "weekdays": ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"],
        "months": ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"],
        "datetime_fmt": "{weekday} {day} {month} à {time}",
        "heading": "Nouvelle demande",
        "label_client": "Client",
        "label_phone": "Téléphone",
        "label_address": "Adresse",
        "open_maps": "Ouvrir dans Maps",
        "label_time": "Date/heure demandée",
        "label_type": "Type",
        "label_party_size": "Personnes",
        "label_summary": "Résumé",
        "label_urgency": "Urgence",
        "label_call_id": "ID d'appel",
        "open_cta": "Ouvrir dans mon tableau de bord",
        "preheader": "Un nouvel appel pris par votre réceptionniste.",
        "review_subject": "Appel à vérifier",
        "review_body": "Nous n’avons pas pu analyser cet appel automatiquement. La transcription est enregistrée : ouvrez-la dans votre tableau de bord (Appels) pour la relire.",
        "urgency": {"low": "basse", "normal": "normale", "high": "élevée"},
        "booking_type": {"appointment": "rendez-vous", "callback": "rappel"},
    },
    "en": {
        "html_lang": "en",
        "subject_prefix": "New request",
        "weekdays": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        "months": ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
        "datetime_fmt": "{weekday} {day} {month} at {time}",
        "heading": "New request",
        "label_client": "Client",
        "label_phone": "Phone",
        "label_address": "Address",
        "open_maps": "Open in Maps",
        "label_time": "Requested date/time",
        "label_type": "Type",
        "label_party_size": "Party size",
        "label_summary": "Summary",
        "label_urgency": "Urgency",
        "label_call_id": "Call ID",
        "open_cta": "Open in my dashboard",
        "preheader": "A new call answered by your receptionist.",
        "review_subject": "Call needs review",
        "review_body": "We couldn't read this call automatically. The transcript is saved: open it in your dashboard (Calls) to review it.",
        "urgency": {"low": "low", "normal": "normal", "high": "high"},
        "booking_type": {"appointment": "appointment", "callback": "callback"},
    },
}


def _esc(value) -> str:
    """Escape a value for safe interpolation into an HTML email body.
    Everything in `extracted` originates from an AI's reading of a phone
    call — a caller could attempt to inject HTML/fake links into the
    transcript. Never trust it unescaped in an email a client will open.
    None gives "" (a row with an empty value is left out of the email, see _layout)."""
    return html.escape(str(value)) if value is not None else ""


def maps_url(address: str) -> str:
    """Google Maps search for an address (the same link the dashboard uses)."""
    return "https://www.google.com/maps/search/?api=1&query=" + urllib.parse.quote(address, safe="")


def _address_html(s: dict, address: str | None) -> str:
    """The address as the caller said it, with a small 'Open in Maps' link under it
    (the link text is the label, no URL is printed); empty when none was given."""
    if not address:
        return ""
    return (
        f'{_esc(address)}<br><a href="{html.escape(maps_url(address), quote=True)}" '
        f'style="font-size:13px;font-weight:600;color:#0a8f64;text-decoration:none;">{s["open_maps"]} →</a>'
    )


SITE = "https://www.lmcagents.app"
_FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"


def _row(label: str, value_html: str) -> str:
    return (
        f'<tr><td style="padding-bottom:14px;"><div style="font-size:12.5px;line-height:1.4;color:#66726d;padding-bottom:3px;">{label}</div>'
        f'<div style="font-size:15px;line-height:1.55;color:#0b1210;">{value_html}</div></td></tr>'
    )


def _layout(s: dict, title: str, preheader: str, intro: str, rows: list[tuple[str, str]], call_id: str, urgent: bool = False) -> str:
    """The shared look of every owner email: the same light card, type and #12b981
    button as the Magic Link sign-in email. Values in `rows` are already escaped; a row
    whose value is empty is left out (the owner never sees a placeholder dash).
    The button links to the call in the dashboard; no URL is ever printed."""
    badge = ""
    if urgent:
        badge = (
            '<tr><td style="padding-bottom:14px;"><span style="display:inline-block;background:#fdecea;color:#b3261e;border-radius:999px;'
            f'padding:4px 12px;font-size:12px;font-weight:600;">{_esc(s["urgency"]["high"])}</span></td></tr>'
        )
    body = "".join(_row(label, value) for label, value in rows if value and value.strip())
    link = f"{SITE}/dashboard/calls/{html.escape(str(call_id), quote=True)}"
    return f"""<!DOCTYPE html>
<html lang="{s['html_lang']}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <title>LMC Agents</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f5;font-family:{_FONT};color:#0b1210;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">{preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f5;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;padding:32px;">
        <tr><td style="font-size:15px;font-weight:600;letter-spacing:-0.01em;color:#0b1210;padding-bottom:20px;">LMC Agents</td></tr>
        {badge}
        <tr><td style="font-size:22px;font-weight:600;line-height:1.25;padding-bottom:10px;">{title}</td></tr>
        <tr><td style="font-size:15px;line-height:1.6;color:#33403b;padding-bottom:24px;">{intro}</td></tr>
        {body}
        <tr><td style="padding-top:10px;padding-bottom:28px;"><a href="{link}" style="display:inline-block;background:#12b981;color:#04140d;font-size:15px;font-weight:600;text-decoration:none;padding:13px 24px;border-radius:999px;">{s['open_cta']}</a></td></tr>
        <tr><td style="font-size:12px;line-height:1.6;color:#66726d;border-top:1px solid #e1e8e4;padding-top:14px;">{s['label_call_id']}: {_esc(call_id)}</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


def format_when(s: dict, iso: str | None, tz: ZoneInfo | None) -> str | None:
    """preferred_time_iso as 'jeudi 15 octobre à 16:00' (per-language names from _STRINGS, no locale,
    in the business timezone), or None when there is no ISO value or it does not parse."""
    if not iso:
        return None
    try:
        when = datetime.fromisoformat(iso.strip().replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return None
    if when.tzinfo is None:
        when = when.replace(tzinfo=tz) if tz else when  # a naive time is already the business's local time
    elif tz:
        when = when.astimezone(tz)
    return s["datetime_fmt"].format(
        weekday=s["weekdays"][when.weekday()], day=when.day, month=s["months"][when.month - 1], time=when.strftime("%H:%M"),
    )


def _subject(prefix: str, business_name: str | None, caller_name: str | None = None) -> str:
    """'Nouvelle demande : Clémence (Plomberie)', or 'Nouvelle demande : Plomberie' without a name."""
    biz = (business_name or "").strip()
    who = (caller_name or "").strip()
    if who:
        return f"{prefix} : {who} ({biz})" if biz else f"{prefix} : {who}"
    return f"{prefix} : {biz}" if biz else prefix


def render_owner_email(business: dict, extracted, call_id: str, caller_phone_override: str = None, tz: ZoneInfo | None = None) -> tuple[str, str]:
    """(subject, html) for a captured call or booking request. `tz` is the business timezone
    (call_ingest passes it); without it the business's own timezone, else its country's, is used."""
    s = _STRINGS.get(business.get("language") or "es", _STRINGS["es"])
    biz_name = _esc(business.get("name"))
    tz = tz or resolve_timezone(business.get("timezone"), business.get("country"))
    subject = _subject(s["subject_prefix"], business.get("name"), extracted.caller_name)
    urgency_display = s["urgency"].get(extracted.urgency, extracted.urgency)
    booking_type_display = s["booking_type"].get(extracted.booking_type, extracted.booking_type)
    rows = [
        (s["label_client"], _esc(extracted.caller_name)),
        (s["label_phone"], _esc(caller_phone_override or extracted.caller_phone)),
        (s["label_address"], _address_html(s, getattr(extracted, "address", None))),
        # the formatted date when the ISO value parses, else the caller's own words; never both
        (s["label_time"], _esc(format_when(s, getattr(extracted, "preferred_time_iso", None), tz) or extracted.preferred_time)),
        (s["label_type"], _esc(booking_type_display)),
        (s["label_party_size"], _esc(extracted.party_size)),
        (s["label_summary"], _esc(extracted.summary)),
        # an urgent call already carries the red badge above the heading: no second Urgency row
        (s["label_urgency"], "" if extracted.urgency == "high" else _esc(urgency_display)),
    ]
    html_body = _layout(s, s["heading"], _esc(s["preheader"]), biz_name, rows, call_id, urgent=extracted.urgency == "high")
    return subject, html_body


def render_review_email(business: dict, call_id: str, caller_phone: str | None = None) -> tuple[str, str]:
    """(subject, html) for a call that could not be read at all. Nothing was extracted, so
    this email has no address row, and no phone row when there is no phone."""
    s = _STRINGS.get(business.get("language") or "es", _STRINGS["es"])
    biz_name = _esc(business.get("name"))
    html_body = _layout(
        s, s["review_subject"], _esc(s["review_subject"]), f"{biz_name}<br>{s['review_body']}" if biz_name else s["review_body"],
        [(s["label_phone"], _esc(caller_phone))], call_id,
    )
    return _subject(s["review_subject"], business.get("name")), html_body


def notify_owner(business: dict, extracted, call_id: str, caller_phone_override: str = None, tz: ZoneInfo | None = None) -> None:
    """Email the business owner about a captured call/booking request, in
    the business's own language. Never raises -- a failed email must never
    block the webhook response or prevent the call record from having
    already been saved."""
    to_email = business.get("notification_email")
    if not to_email:
        print(f"[notify_owner] no notification_email for business {business.get('id')}, skipping")
        return

    subject, html_body = render_owner_email(business, extracted, call_id, caller_phone_override, tz)
    try:
        resend.Emails.send({
            "from": "LMC Agents <notificaciones@lmcagents.app>",
            "to": to_email,
            "subject": subject,
            "html": html_body,
        })
    except Exception as e:
        print(f"[notify_owner] send failed for call {call_id}: {e}")


def notify_owner_needs_review(business: dict, call_id: str, caller_phone: str | None = None) -> None:
    """Email the owner that a call was stored but could not be read at all (the
    extraction crashed or timed out), so a human has to open the transcript.
    Same language, look and sender as notify_owner; never raises."""
    to_email = business.get("notification_email")
    if not to_email:
        print(f"[notify_owner] no notification_email for business {business.get('id')}, skipping")
        return

    subject, html_body = render_review_email(business, call_id, caller_phone)
    try:
        resend.Emails.send({
            "from": "LMC Agents <notificaciones@lmcagents.app>",
            "to": to_email,
            "subject": subject,
            "html": html_body,
        })
    except Exception as e:
        print(f"[notify_owner] review email failed for call {call_id}: {e}")
