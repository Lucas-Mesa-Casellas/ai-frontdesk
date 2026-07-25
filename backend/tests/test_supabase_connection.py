from app.db.supabase_client import get_supabase_admin


def main() -> None:
    supabase = get_supabase_admin()

    response = (
        supabase
        .table("businesses")
        .select("id,name,business_type,notification_email")
        .limit(5)
        .execute()
    )

    print("Connected to Supabase successfully.")
    print("Businesses found:")

    for business in response.data:
        print(f"- {business['name']} ({business['business_type']})")


if __name__ == "__main__":
    main()
