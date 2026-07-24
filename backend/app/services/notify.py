import os
import resend

resend.api_key = os.environ["RESEND_API_KEY"]


def notify_owner(business: dict, extracted, call_id: str) -> None:
    """Email the business owner about a captured call/booking request.
    Never raises — a failed email must never block the webhook response
    or prevent the call record from having already been saved."""
    to_email = business.get("notification_email")
    if not to_email:
        print(f"[notify_owner] no notification_email for business {business.get('id')}, skipping")
        return

    subject = f"Nueva solicitud — {business.get('name')} — {extracted.caller_name or 'Sin nombre'}"

    html = f"""
    <html lang="es">
    <body>
    <h2>Nueva solicitud — {business.get('name')}</h2>
    <p><strong>Cliente:</strong> {extracted.caller_name or '—'}</p>
    <p><strong>Teléfono:</strong> {extracted.caller_phone or '—'}</p>
    <p><strong>Fecha/hora solicitada:</strong> {extracted.preferred_time or '—'}</p>
    <p><strong>Tipo:</strong> {extracted.booking_type or '—'}</p>
    <p><strong>Personas:</strong> {extracted.party_size or '—'}</p>
    <p><strong>Resumen:</strong> {extracted.summary or '—'}</p>
    <p><strong>Urgencia:</strong> {extracted.urgency or '—'}</p>
    <hr>
    <p style="color:#888;font-size:12px;">ID de llamada: {call_id}</p>
    </body>
    </html>
    """

    try:
        resend.Emails.send({
            "from": "LMC Agents <notificaciones@lmcagents.app>",
            "to": to_email,
            "subject": subject,
            "html": html,
        })
    except Exception as e:
        print(f"[notify_owner] send failed for call {call_id}: {e}")
