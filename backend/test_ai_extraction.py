from app.services.ai import extract_call_data

transcripts = [
    ("clean", "Hello, my name is Sophie Martin. I would like to book a table for 4 people this Saturday at 8pm. My phone number is +33612345678."),
    ("partial", "Hi, I want a reservation for next weekend, maybe Saturday evening. There will be 2 of us. My name is Thomas."),
    ("confused", "Yes hello, do you have a table, I mean maybe Friday? Actually I might call back. My wife needs to check."),
]

for label, transcript in transcripts:
    print(f"\n--- {label.upper()} ---")
    extracted, _ = extract_call_data(transcript)
    print(f"name:       {extracted.caller_name}")
    print(f"phone:      {extracted.caller_phone}")
    print(f"intent:     {extracted.intent}")
    print(f"time:       {extracted.preferred_time}")
    print(f"party_size: {extracted.party_size}")
    print(f"complete:   {extracted.extraction_complete}")
    print(f"confidence: {extracted.extraction_confidence}")
    print(f"missing:    {extracted.missing_fields}")
    print(f"summary:    {extracted.summary}")