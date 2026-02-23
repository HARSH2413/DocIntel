from slowapi import Limiter
from slowapi.util import get_remote_address

# This uses the user's IP address to track how many requests they make.
# If they exceed the limit, it blocks them, but lets other normal users through!
limiter = Limiter(key_func=get_remote_address)