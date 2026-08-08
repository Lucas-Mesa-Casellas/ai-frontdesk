# AI Frontdesk

AI-powered phone receptionist for service businesses — answers missed calls in Spanish, English, and French, captures booking requests, and notifies the business owner in real time.

Private project — all rights reserved, not for redistribution.

## Stack

- **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS v4, TypeScript
- **Backend:** FastAPI (Python), deployed on Railway
- **Database:** Supabase (PostgreSQL)
- **Voice AI:** Retell + ElevenLabs
- **Telephony:** Twilio

## Getting started

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Both require environment variables that are not committed to this repo — contact the maintainer for values.

## Project structure

- `frontend/` — client dashboard and marketing site
- `backend/` — webhook handler, call extraction, notification service
- `supabase/migrations/` — database schema and scheduled jobs
