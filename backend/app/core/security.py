import hmac
import hashlib
import base64
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

from passlib.context import CryptContext
from datetime import datetime, timedelta
import jwt

# JWT configuration


ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 1 day

# This sets up the standard bcrypt hashing algorithm
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    
    # This creates the physical JWT string
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def verify_nomba_signature(payload: dict, received_signature: str, timestamp: str) -> bool:
    """
    Verifies the Nomba webhook by concatenating specific JSON fields, 
    hashing them with HMAC-SHA256, and comparing the Base64 output.
    """
    if not settings.NOMBA_WEBHOOK_SECRET or not received_signature:
        return False

    # 1. Safely extract all nested objects
    data = payload.get("data", {})
    merchant = data.get("merchant", {})
    transaction = data.get("transaction", {})

    # 2. Extract exact fields required for the hash
    event_type = payload.get("event_type", "")
    request_id = payload.get("requestId", "")
    user_id = merchant.get("userId", "")
    wallet_id = merchant.get("walletId", "")
    transaction_id = transaction.get("transactionId", "")
    transaction_type = transaction.get("type", "")
    transaction_time = transaction.get("time", "")
    transaction_response_code = transaction.get("responseCode", "")

    # Handle null edge case explicitly requested by Nomba docs
    if transaction_response_code == "null" or transaction_response_code is None:
        transaction_response_code = ""

    # Fallback just in case Nomba drops the timestamp header
    if not timestamp:
        timestamp = transaction_time

    # 3. Construct the exact string matching Nomba's Java/Go architecture
    hashing_payload = f"{event_type}:{request_id}:{user_id}:{wallet_id}:{transaction_id}:{transaction_type}:{transaction_time}:{transaction_response_code}:{timestamp}"

    # 4. Compute HMAC-SHA256 and Base64 encode it
    digest = hmac.new(
        key=settings.NOMBA_WEBHOOK_SECRET.encode('utf-8'),
        msg=hashing_payload.encode('utf-8'),
        digestmod=hashlib.sha256
    ).digest()
    
    computed_signature = base64.b64encode(digest).decode('utf-8')

    # 5. Safely compare the signatures to prevent timing attacks
    return hmac.compare_digest(computed_signature, received_signature)