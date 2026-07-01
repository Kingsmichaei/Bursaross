from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import Literal
import jwt

from app.db.session import get_db
from app.core.config import settings
from app.models import Admin, Teacher
from app.core.security import verify_password, get_password_hash
from app.services.password_recovery import create_password_reset_token, decode_password_reset_token, send_password_reset_email

router = APIRouter()

class LoginRequest(BaseModel):
    email: str
    password: str
    role: str

def create_access_token(data: dict, expires_delta: timedelta):
    to_encode = data.copy()
    expire = datetime.utcnow() + expires_delta
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")


@router.post("/login")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    # Dynamically query the correct table based on their role tab
    if request.role == "admin":
        user = db.query(Admin).filter(Admin.email == request.email).first()
    elif request.role == "teacher":
        user = db.query(Teacher).filter(Teacher.email == request.email).first()
    else:
        raise HTTPException(status_code=400, detail="Invalid role specified")

    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    # Generate the JWT token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "role": request.role, "id": user.id}, 
        expires_delta=access_token_expires
    )

    return {"access_token": access_token, "token_type": "bearer"}



# 1. The Request Schema
class PasswordChangeRequest(BaseModel):
    old_password: str
    new_password: str


class PasswordResetRequest(BaseModel):
    email: str
    role: Literal["admin", "teacher"]


class PasswordResetConfirmRequest(BaseModel):
    token: str
    new_password: str

# 2. The Endpoint
@router.post("/change-password")
def change_password(
    request: PasswordChangeRequest, 
    authorization: str = Header(...), 
    db: Session = Depends(get_db)
):
    # Extract the token directly from the header
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid token format")
        
    token = authorization.split(" ")[1]
    
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        user_id = payload.get("id")
        role = payload.get("role")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

    # Fetch the correct user type
    if role == "teacher":
        user = db.query(Teacher).filter(Teacher.id == user_id).first()
    elif role == "admin":
        user = db.query(Admin).filter(Admin.id == user_id).first()
    else:
        raise HTTPException(status_code=400, detail="Invalid role specified")

    if not user:
        raise HTTPException(status_code=404, detail="Account not found")

    # Verify the old (temporary) password
    if not verify_password(request.old_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect current password")

    # Hash and save the new password
    user.hashed_password = get_password_hash(request.new_password)

    # CRITICAL: Release the UI lock for teachers
    if role == "teacher":
        user.is_first_login = False

    db.commit()

    return {"status": "success", "message": "Security credentials updated"}


@router.post("/request-password-reset")
def request_password_reset(request: PasswordResetRequest, db: Session = Depends(get_db)):
    if request.role == "admin":
        user = db.query(Admin).filter(Admin.email == request.email).first()
    elif request.role == "teacher":
        user = db.query(Teacher).filter(Teacher.email == request.email).first()
    else:
        raise HTTPException(status_code=400, detail="Invalid role specified")

    if user:
        token = create_password_reset_token(user.id, user.email, request.role)
        reset_link = f"{settings.FRONTEND_URL}/reset-password?token={token}&role={request.role}"
        send_password_reset_email(
            recipient_email=user.email,
            recipient_name=user.full_name,
            role=request.role,
            reset_link=reset_link,
            school_name=user.school.name if getattr(user, "school", None) else "BursarOS",
        )

    return {"status": "success", "message": "If an account exists for that email, a password reset link has been sent."}


@router.post("/reset-password")
def reset_password(request: PasswordResetConfirmRequest, db: Session = Depends(get_db)):
    try:
        payload = decode_password_reset_token(request.token)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if payload.get("purpose") != "password_reset":
        raise HTTPException(status_code=400, detail="Invalid password reset token")

    role = payload.get("role")
    user_id = payload.get("sub")
    email = payload.get("email")

    if role == "admin":
        user = db.query(Admin).filter(Admin.id == user_id, Admin.email == email).first()
    elif role == "teacher":
        user = db.query(Teacher).filter(Teacher.id == user_id, Teacher.email == email).first()
    else:
        raise HTTPException(status_code=400, detail="Invalid role specified")

    if not user:
        raise HTTPException(status_code=404, detail="Account not found")

    user.hashed_password = get_password_hash(request.new_password)
    if role == "teacher":
        user.is_first_login = False

    db.commit()

    return {"status": "success", "message": "Password updated successfully. You can now sign in."}