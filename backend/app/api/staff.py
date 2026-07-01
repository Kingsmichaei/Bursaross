import secrets

from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
import jwt
from app.api.deps import get_current_admin, get_db
from app.core.config import settings
from app.core.security import get_password_hash
from app.models import Admin, Teacher
from app.services.password_recovery import create_password_reset_token, send_password_reset_email

router = APIRouter()

# What React will send us
class TeacherCreate(BaseModel):
    full_name: str
    email: EmailStr
    assigned_class: str


class ActionResponse(BaseModel):
    status: str
    message: str

@router.post("/add-teacher", status_code=status.HTTP_201_CREATED)
def add_teacher(
    teacher: TeacherCreate, 
    current_admin: Admin = Depends(get_current_admin), 
    db: Session = Depends(get_db)
):
    # 1. Prevent duplicate teacher emails globally
    existing_teacher = db.query(Teacher).filter(Teacher.email == teacher.email).first()
    if existing_teacher:
        raise HTTPException(status_code=400, detail="A teacher with this email is already registered.")

    # 2. Generate a secure, temporary default password
    # We use a mix of a standard string and the first 4 chars of the school ID
    temp_password = f"BursarOS-{str(current_admin.school_id)[:4].upper()}"
    hashed_pw = get_password_hash(temp_password)

    # 3. Save the Teacher strictly to this Admin's School
    new_teacher = Teacher(
        school_id=current_admin.school_id,
        full_name=teacher.full_name,
        email=teacher.email,
        assigned_class=teacher.assigned_class,
        hashed_password=hashed_pw,
        is_first_login=True # This will trigger the forced password change later!
    )
    
    db.add(new_teacher)
    db.commit()

    return {
        "status": "success",
        "message": f"Teacher {teacher.full_name} successfully provisioned.",
        "temporary_password": temp_password,
        "assigned_class": teacher.assigned_class
    }


@router.delete("/teachers/{teacher_id}", response_model=ActionResponse)
def delete_teacher(
    teacher_id: str,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    teacher = db.query(Teacher).filter(
        Teacher.id == teacher_id,
        Teacher.school_id == current_admin.school_id
    ).first()
    if not teacher:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher not found")

    db.delete(teacher)
    db.commit()

    return {"status": "success", "message": f"Teacher {teacher.full_name} deleted successfully"}


@router.post("/teachers/{teacher_id}/reset-password", response_model=ActionResponse)
def reset_teacher_password(
    teacher_id: str,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    teacher = db.query(Teacher).filter(
        Teacher.id == teacher_id,
        Teacher.school_id == current_admin.school_id
    ).first()
    if not teacher:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher not found")

    temp_password = f"BursarOS-{secrets.token_hex(4).upper()}"
    teacher.hashed_password = get_password_hash(temp_password)
    teacher.is_first_login = True
    db.commit()

    reset_token = create_password_reset_token(teacher.id, teacher.email, "teacher")
    reset_link = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}&role=teacher"
    send_password_reset_email(
        recipient_email=teacher.email,
        recipient_name=teacher.full_name,
        role="teacher",
        reset_link=reset_link,
        school_name=current_admin.school.name if current_admin.school else "BursarOS",
    )

    return {
        "status": "success",
        "message": f"Password reset email sent to {teacher.full_name}.",
    }