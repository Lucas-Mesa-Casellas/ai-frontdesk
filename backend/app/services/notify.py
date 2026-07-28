import os
import html
import resend

resend.api_key = os.environ["RESEND_API_KEY"]


def _esc(value) -> str:
    """Escape a value for safe interpolation into an HTML email body.
    Everything in `extracted` originates from an AI's reading of a phone
    call — a caller could attempt to inject HTML/fake links into the
    transcript. Never trust it unescaped in an email a client will open."""
    return html.escape(str(value)) if value is not None else "—"


def notify_owner(business: dict, extracted, call_id: str) -> None:
    """Email the business owner about a captured call/booking request.
    Never raises — a failed email must never block the webhook response
    or prevent the call record from having already been saved."""
    to_email = business.get("notification_email")
    if not to_email:
        print(f"[notify_owner] no notification_email for business {business.get('id')}, skipping")
        return

    biz_name = _esc(business.get("name"))
    subject = f"Nueva solicitud — {business.get('name')} — {extracted.caller_name or 'Sin nombre'}"

    html_body = f"""
    <html lang="es">
    <body>
    <h2>Nueva solicitud — {biz_name}</h2>
    <p><strong>Cliente:</strong> {_esc(extracted.caller_name)}</p>
    <p><strong>Teléfono:</strong> {_esc(extracted.caller_phone)}</p>
    <p><strong>Fecha/hora solicitada:</strong> {_esc(extracted.preferred_time)}</p>
    <p><strong>Tipo:</strong> {_esc(extracted.booking_type)}</p>
    <p><strong>Personas:</strong> {_esc(extracted.party_size)}</p>
    <p><strong>Resumen:</strong> {_esc(extracted.summary)}</p>
    <p><strong>Urgencia:</strong> {_esc(extracted.urgency)}</p>
    <hr>
    <p style="color:#888;font-size:12px;">ID de llamada: {_esc(call_id)}</p>
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
