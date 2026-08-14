def find_business(supabase, call_data: dict):
    """Look up the business a call belongs to.

    Primary: Retell's agent_id — stable and present even in browser-widget
    test calls, before any real phone number exists.
    Fallback: the DID that was called — only meaningful once a Twilio
    number is live and imported into Retell.
    """
    columns = "id, name, notification_email, language, opening_hours"

    agent_id = call_data.get("agent_id")
    if agent_id:
        biz = supabase.table("businesses").select(
            columns
        ).eq("retell_agent_id", agent_id).limit(1).execute()
        if biz.data:
            return biz.data[0]

    to_number = call_data.get("to_number") or call_data.get("retell_llm_phone_number")
    if to_number:
        biz = supabase.table("businesses").select(
            columns
        ).eq("phone_number", to_number).limit(1).execute()
        if biz.data:
            return biz.data[0]

    return None
