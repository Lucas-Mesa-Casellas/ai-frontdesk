import os
import html
import resend

resend.api_key = os.environ["RESEND_API_KEY"]

# All business-facing strings, keyed by language. Add a language here before
# using it as a businesses.language value -- notify_owner falls back to "es"
# for any language not defined below.
_STRINGS = {
    "es": {
        "html_lang": "es",
        "subject_prefix": "Nueva solicitud",
        "no_name": "Sin nombre",
        "heading": "Nueva solicitud",
        "label_client": "Cliente",
        "label_phone": "Teléfono",
        "label_time": "Fecha/hora solicitada",
        "label_type": "Tipo",
        "label_party_size": "Personas",
        "label_summary": "Resumen",
        "label_urgency": "Urgencia",
        "label_call_id": "ID de llamada",
        "urgency": {"low": "baja", "normal": "normal", "high": "alta"},
        "booking_type": {"appointment": "cita", "callback": "llamada de vuelta"},
    },
    "fr": {
        "html_lang": "fr",
        "subject_prefix": "Nouvelle demande",
        "no_name": "Sans nom",
        "heading": "Nouvelle demande",
        "label_client": "Client",
        "label_phone": "Téléphone",
        "label_time": "Date/heure demandée",
        "label_type": "Type",
        "label_party_size": "Personnes",
        "label_summary": "Résumé",
        "label_urgency": "Urgence",
        "label_call_id": "ID d'appel",
        "urgency": {"low": "basse", "normal": "normale", "high": "élevée"},
        "booking_type": {"appointment": "rendez-vous", "callback": "rappel"},
    },
    "en": {
        "html_lang": "en",
        "subject_prefix": "New request",
        "no_name": "No name given",
        "heading": "New request",
        "label_client": "Client",
        "label_phone": "Phone",
        "label_time": "Requested date/time",
        "label_type": "Type",
        "label_party_size": "Party size",
        "label_summary": "Summary",
        "label_urgency": "Urgency",
        "label_call_id": "Call ID",
        "urgency": {"low": "low", "normal": "normal", "high": "high"},
        "booking_type": {"appointment": "appointment", "callback": "callback"},
    },
}


def _esc(value) -> str:
    """Escape a value for safe interpolation into an HTML email body.
    Everything in `extracted` originates from an AI's reading of a phone
    call — a caller could attempt to inject HTML/fake links into the
    transcript. Never trust it unescaped in an email a client will open."""
    return html.escape(str(value)) if value is not None else "—"


def notify_owner(business: dict, extracted, call_id: str, caller_phone_override: str = None) -> None:
    """Email the business owner about a captured call/booking request, in
    the business's own language. Never raises -- a failed email must never
    block the webhook response or prevent the call record from having
    already been saved."""
    to_email = business.get("notification_email")
    if not to_email:
        print(f"[notify_owner] no notification_email for business {business.get('id')}, skipping")
        return

    lang = business.get("language") or "es"
    s = _STRINGS.get(lang, _STRINGS["es"])

    biz_name = _esc(business.get("name"))
    caller_name = extracted.caller_name or s["no_name"]
    subject = f"{s['subject_prefix']} — {business.get('name')} — {caller_name}"

    urgency_display = s["urgency"].get(extracted.urgency, extracted.urgency)
    booking_type_display = s["booking_type"].get(extracted.booking_type, extracted.booking_type)

    html_body = f"""
    <html lang="{s['html_lang']}">
    <body>
    <h2>{s['heading']} — {biz_name}</h2>
    <p><strong>{s['label_client']}:</strong> {_esc(extracted.caller_name)}</p>
    <p><strong>{s['label_phone']}:</strong> {_esc(extracted.caller_phone)}</p>
    <p><strong>{s['label_time']}:</strong> {_esc(extracted.preferred_time)}</p>
    <p><strong>{s['label_type']}:</strong> {_esc(booking_type_display)}</p>
    <p><strong>{s['label_party_size']}:</strong> {_esc(extracted.party_size)}</p>
    <p><strong>{s['label_summary']}:</strong> {_esc(extracted.summary)}</p>
    <p><strong>{s['label_urgency']}:</strong> {_esc(urgency_display)}</p>
    <hr>
    <p style="color:#888;font-size:12px;">{s['label_call_id']}: {_esc(call_id)}</p>
    </body>
    </html>
    """

    try:
        resend.Emails.send({
            "from": "LMC Agents <notificaciones@lmcagents.app>",
            "to": to_email,
            "subject": subject,
            "html": html_body,
        })
    except Exception as e:
        print(f"[notify_owner] send failed for call {call_id}: {e}")
