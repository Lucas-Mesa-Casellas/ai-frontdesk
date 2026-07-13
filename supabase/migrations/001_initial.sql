-- AI Front Desk - Initial Database Schema
-- V1 goal:
-- Store businesses, calls, and bookings/callbacks created by the AI receptionist.

create extension if not exists "pgcrypto";

-- 1. Businesses
-- One business = one client using the AI Front Desk.
create table if not exists businesses (
    id uuid primary key default gen_random_uuid(),

    name text not null,
    business_type text not null default 'demo',

    phone_number text,
    notification_email text,

    opening_hours jsonb not null default '{}'::jsonb,
    services jsonb not null default '[]'::jsonb,
    faqs jsonb not null default '[]'::jsonb,
    booking_rules jsonb not null default '{}'::jsonb,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 2. Calls
-- One row = one phone call or test conversation handled by the AI.
create table if not exists calls (
    id uuid primary key default gen_random_uuid(),

    business_id uuid not null references businesses(id) on delete cascade,

    source text not null default 'demo_text',
    -- example values: demo_text, retell_call, twilio_call

    caller_name text,
    caller_phone text,

    transcript text,
    intent text,
    summary text,

    urgency text not null default 'normal',
    -- example values: low, normal, high, emergency

    status text not null default 'new',
    -- example values: new, handled, callback_booked, reservation_booked, human_handoff, failed

    next_action text,
    preferred_time text,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 3. Bookings
-- One row = callback, reservation, or appointment created from a call.
create table if not exists bookings (
    id uuid primary key default gen_random_uuid(),

    business_id uuid not null references businesses(id) on delete cascade,
    call_id uuid references calls(id) on delete set null,

    booking_type text not null,
    -- example values: callback, reservation, appointment

    customer_name text,
    customer_phone text,

    start_time timestamptz,
    end_time timestamptz,

    party_size integer,
    notes text,

    calendar_event_id text,

    status text not null default 'pending',
    -- example values: pending, confirmed, cancelled, completed

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 4. Demo Business
-- This gives us one fake business to test with immediately.
insert into businesses (
    name,
    business_type,
    phone_number,
    notification_email,
    opening_hours,
    services,
    faqs,
    booking_rules
)
values (
    'Maison Lumière Restaurant',
    'restaurant',
    '+33000000000',
    'demo@example.com',
    '{
        "monday": "closed",
        "tuesday": "12:00-14:30, 19:00-22:30",
        "wednesday": "12:00-14:30, 19:00-22:30",
        "thursday": "12:00-14:30, 19:00-22:30",
        "friday": "12:00-14:30, 19:00-23:00",
        "saturday": "12:00-14:30, 19:00-23:00",
        "sunday": "12:00-14:30, 19:00-22:30"
    }'::jsonb,
    '[
        "French Mediterranean restaurant",
        "Lunch reservations",
        "Dinner reservations",
        "Group bookings",
        "Window table requests"
    ]'::jsonb,
    '[
        {
            "question": "Do you accept reservations?",
            "answer": "Yes, reservations are accepted for lunch and dinner."
        },
        {
            "question": "Are you open on Monday?",
            "answer": "No, the restaurant is closed on Monday."
        },
        {
            "question": "Can I request a table near the window?",
            "answer": "Yes, special requests can be noted but are not guaranteed."
        }
    ]'::jsonb,
    '{
        "default_duration_minutes": 90,
        "allow_group_bookings": true,
        "max_party_size": 12,
        "requires_phone_number": true
    }'::jsonb
);