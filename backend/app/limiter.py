from slowapi import Limiter
from slowapi.util import get_remote_address

# Single shared instance. main.py attaches the global default (protects
# every endpoint, including any added later without remembering to
# rate-limit it). Individual routers can import this to set a tighter,
# explicit limit on a specific endpoint (see webhooks.py).
limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])
