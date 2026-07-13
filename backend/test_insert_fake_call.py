from app.db.supabase_client import get_supabase_admin


def main() -> None:
    supabase = get_supabase_admin()

    # 1. Get the demo business
    business_response = (
        supabase
        .table("businesses")
        .select("id,name,business_type")
        .eq("name", "Maison Lumiere Restaurant")
        .execute()
    )

    if not business_response.data:
        business_response = (
            supabase
            .table("businesses")
            .select("id,name,business_type")
            .limit(1)
            .execute()
        )

    business = business_response.data[0]
    business_id = business["id"]

    print(f"Using business: {business['name']} ({business['business_type']})")
    print(f"Business ID: {business_id}")

    # 2. Insert one fake call
    fake_call = {
        "business_id": business_id,
        "source": "demo_text",
        "caller_name": "Lucas Test",
        "caller_phone": "+33600000000",
        "transcript": (
            "Bonjour, je voudrais reserver une table pour 8 personnes "
            "demain a 20h, si possible pres de la fenetre."
        ),
        "intent": "book_reservation",
        "summary": (
            "Caller wants to reserve a table for 8 people tomorrow at 20:00, "
            "preferably near the window."
        ),
        "urgency": "normal",
        "status": "reservation_requested",
        "next_action": "Create reservation in calendar",
        "preferred_time": "Tomorrow at 20:00",
    }

    insert_response = (
        supabase
        .table("calls")
        .insert(fake_call)
        .execute()
    )

    inserted_call = insert_response.data[0]

    print("\nFake call inserted successfully.")
    print(f"Call ID: {inserted_call['id']}")
    print(f"Caller: {inserted_call['caller_name']}")
    print(f"Intent: {inserted_call['intent']}")
    print(f"Status: {inserted_call['status']}")

    # 3. Read latest calls back
    calls_response = (
        supabase
        .table("calls")
        .select("id,caller_name,intent,status,created_at")
        .eq("business_id", business_id)
        .order("created_at", desc=True)
        .limit(5)
        .execute()
    )

    print("\nLatest calls found:")

    for call in calls_response.data:
        print(
            f"- {call['caller_name']} | "
            f"{call['intent']} | "
            f"{call['status']} | "
            f"{call['created_at']}"
        )


if __name__ == "__main__":
    main()
