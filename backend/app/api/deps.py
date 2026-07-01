from typing import Type
from fastapi import Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
import jwt

# Replace these imports with your actual file paths if they differ slightly
from app.db.session import SessionLocal
from app.core.config import settings
from app.models import Admin, Teacher

# 1. Database Dependency
def get_db():
    """Yields a database session and safely closes it after the request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 2. Core Token and User Retrieval Logic
def _verify_token(token: str):
    """Base function to securely decode the JWT token."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Token has expired. Please log in again."
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Could not validate credentials."
        )

def get_token_from_header(authorization: str = Header(None)):
    """Extracts the Bearer token from the standard Authorization header."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or missing Authorization header")
    return authorization.split(" ")[1]

def _get_current_user(
    db: Session, payload: dict, model: Type[Admin] | Type[Teacher], role_name: str
) -> Admin | Teacher:
    """Generic user retriever based on role and database model."""
    if payload.get("role") != role_name:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail=f"Unauthorized: {role_name.capitalize()}s only"
        )
    
    user = db.query(model).filter(model.id == payload.get("id")).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"{role_name.capitalize()} account not found"
        )
    return user

# ---------------------------------------------------------
# SECURE, ROLE-SPECIFIC DEPENDENCIES
# ---------------------------------------------------------

def get_current_user_context(token: str = Depends(get_token_from_header)):
    """Returns the raw decoded payload so routes can handle both Admins and Teachers dynamically."""
    return _verify_token(token)

def get_current_admin(token: str = Depends(get_token_from_header), db: Session = Depends(get_db)) -> Admin:
    """Dependency to get the current admin user from the token in the header."""
    payload = _verify_token(token)
    return _get_current_user(db, payload, Admin, "admin")

def get_current_teacher(token: str = Depends(get_token_from_header), db: Session = Depends(get_db)) -> Teacher:
    """Dependency to get the current teacher user from the token in the header."""
    payload = _verify_token(token)
    return _get_current_user(db, payload, Teacher, "teacher")
