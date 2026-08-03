from fastapi import FastAPI
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from starlette.middleware.gzip import GZipMiddleware

from app.limiter import limiter
from app.routers import webhooks

app = FastAPI(title="AI Front Desk Backend")

# Rate limiting - confirmed absent before this change (Master Paper v9 §7).
# 100/minute per IP is a generous default for real traffic (the webhook is
# only ever called by Retell's own servers) but stops request-flooding.
# Applies automatically to every endpoint, including ones added later.
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# Gzip compression - also confirmed absent. Built into Starlette, no new
# dependency. Only compresses responses over 500 bytes (not worth it below
# that - the compression overhead would exceed the savings).
app.add_middleware(GZipMiddleware, minimum_size=500)

app.include_router(webhooks.router)


@app.get("/")
def health_check():
    return {"status": "AI Front Desk backend is running"}
