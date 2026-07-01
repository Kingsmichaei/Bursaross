from app.api.deps import get_current_user_context
from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.db.session import get_db
from app.models import Admin, Teacher, Student, Transaction

router = APIRouter()

# What React will send us
class StudentCreate(BaseModel):
    full_name: str
    reg_number: str
    student_class: str
    outstanding_balance: float


class DeleteResponse(BaseModel):
    status: str
    message: str

@router.post("/add", status_code=status.HTTP_201_CREATED)
def add_student(
    student: StudentCreate, 
    db: Session = Depends(get_db), 
    context: dict = Depends(get_current_user_context)
):
    user_id = context.get("id")
    role = context.get("role")
    
    # 1. Fetch the correct user and their school_id
    if role == "admin":
        user = db.query(Admin).filter(Admin.id == user_id).first()
    elif role == "teacher":
        user = db.query(Teacher).filter(Teacher.id == user_id).first()
        
        # SECURITY CHECK: Teachers can only add students to their own class
        if student.student_class != user.assigned_class:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail=f"As a teacher, you can only add students to {user.assigned_class}"
            )
    else:
        raise HTTPException(status_code=401, detail="Unauthorized role")

    if not user:
        raise HTTPException(status_code=404, detail="Account not found")

    # 2. Check if the Registration Number is already taken
    existing_student = db.query(Student).filter(Student.reg_number == student.reg_number).first()
    if existing_student:
        raise HTTPException(status_code=400, detail="A student with this Reg Number already exists.")

    # 3. Save the new student to the database!
    new_student = Student(
        school_id=user.school_id,
        full_name=student.full_name,
        reg_number=student.reg_number,
        student_class=student.student_class,
        outstanding_balance=student.outstanding_balance
    )
    db.add(new_student)
    db.commit()
    db.refresh(new_student)

    return {"status": "success", "message": "Student added successfully!"}


@router.delete("/{student_id}", response_model=DeleteResponse)
def delete_student(
    student_id: str,
    db: Session = Depends(get_db),
    context: dict = Depends(get_current_user_context)
):
    user_id = context.get("id")
    role = context.get("role")

    if role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can delete student records")

    admin = db.query(Admin).filter(Admin.id == user_id).first()
    if not admin:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admin account not found")

    student = db.query(Student).filter(Student.id == student_id, Student.school_id == admin.school_id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    db.query(Transaction).filter(Transaction.student_id == student.id).delete(synchronize_session=False)
    db.delete(student)
    db.commit()

    return {"status": "success", "message": f"Student {student.full_name} deleted successfully"}