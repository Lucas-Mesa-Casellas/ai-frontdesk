from fastapi import FastAPI
from app.routers import webhooks

app = FastAPI(title="AI Front Desk Backend")

app.include_router(webhooks.router)


@app.get("/")
def health_check():
    return {"status": "AI Front Desk backend is running"}