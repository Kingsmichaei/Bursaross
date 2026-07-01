from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models import Teacher
from app.schemas.user import StaffCreate, StaffResponse
from app.core.security import get_password_hash

router = APIRouter()

@router.post("/staff", response_model=StaffResponse, status_code=status.HTTP_201_CREATED)
def create_staff(staff_in: StaffCreate, db: Session = Depends(get_db)):
    # 1. Check if the email is already taken
    existing_user = db.query(Teacher).filter(Teacher.email == staff_in.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="A user with this email already exists")
    
    # 2. Hash the raw password
    hashed_password = get_password_hash(staff_in.password)
    
    # 3. Build the database object (Never store staff_in.password!)
    db_user = Teacher(
        email=staff_in.email,
        hashed_password=hashed_password,
        full_name=staff_in.full_name,
        school_id=staff_in.school_id,
        assigned_class=staff_in.assigned_class
    )
    
    # 4. Save to SQLite
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # FastAPI will automatically use the StaffResponse schema to strip the password out before sending
    return db_user