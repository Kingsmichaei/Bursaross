from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, asc, desc
from pydantic import BaseModel

from app.db.session import get_db
from app.models import Admin, Teacher, Student, Transaction, School
from app.api.deps import get_current_admin, get_current_teacher
from app.services.gemini_ai import GeminiSearchService
from app.services.school_branding import FALLBACK_COLORS

router = APIRouter()
gemini_search = GeminiSearchService()


class StudentSearchRequest(BaseModel):
    query: str


def serialize_student(student: Student) -> dict:
    outstanding_balance = float(student.outstanding_balance or 0)
    return {
        "id": student.id,
        "reg_number": student.reg_number,
        "full_name": student.full_name,
        "student_class": student.student_class,
        "outstanding_balance": outstanding_balance,
        "status": "cleared" if outstanding_balance <= 0 else "owing",
        "created_at": student.created_at.isoformat() if student.created_at else None,
        "updated_at": student.updated_at.isoformat() if student.updated_at else None,
    }


def serialize_teacher(teacher: Teacher) -> dict:
    return {
        "id": teacher.id,
        "full_name": teacher.full_name,
        "email": teacher.email,
        "assigned_class": teacher.assigned_class,
        "is_first_login": bool(teacher.is_first_login),
        "created_at": teacher.created_at.isoformat() if teacher.created_at else None,
    }

def serialize_school_branding(school: School | None) -> dict:
    if not school:
        return {
            "primary_color": FALLBACK_COLORS["primary_color"],
            "secondary_color": FALLBACK_COLORS["secondary_color"],
            "accent_color": FALLBACK_COLORS["accent_color"],
            "logo_url": None,
        }

    logo_url = school.logo_url or f"https://ui-avatars.com/api/?name={school.name.replace(' ', '+')}&background=2563EB&color=FFFFFF"
    return {
        "id": school.id,
        "name": school.name,
        "slug": school.slug,
        "website_url": school.website_url,
        "logo_url": logo_url,
        "primary_color": school.primary_color or FALLBACK_COLORS["primary_color"],
        "secondary_color": school.secondary_color or FALLBACK_COLORS["secondary_color"],
        "accent_color": school.accent_color or FALLBACK_COLORS["accent_color"],
    }


def apply_student_filters(query, filters: dict, raw_query: str):
    name_contains = (filters.get("name_contains") or "").strip()
    reg_number_contains = (filters.get("reg_number_contains") or "").strip()
    student_class_contains = (filters.get("student_class_contains") or "").strip()
    balance_status = (filters.get("balance_status") or "all").strip().lower()

    if name_contains:
        query = query.filter(Student.full_name.ilike(f"%{name_contains}%"))
    if reg_number_contains:
        query = query.filter(Student.reg_number.ilike(f"%{reg_number_contains}%"))
    if student_class_contains:
        query = query.filter(Student.student_class.ilike(f"%{student_class_contains}%"))

    balance_min = filters.get("balance_min")
    balance_max = filters.get("balance_max")
    if balance_min is not None and balance_min != "":
        query = query.filter(Student.outstanding_balance >= float(balance_min))
    if balance_max is not None and balance_max != "":
        query = query.filter(Student.outstanding_balance <= float(balance_max))

    if balance_status == "owing":
        query = query.filter(Student.outstanding_balance > 0)
    elif balance_status == "paid":
        query = query.filter(Student.outstanding_balance <= 0)

    has_structured_filters = any([
        name_contains,
        reg_number_contains,
        student_class_contains,
        balance_min not in (None, ""),
        balance_max not in (None, ""),
        balance_status in {"owing", "paid"},
    ])

    if not has_structured_filters and raw_query.strip():
        pattern = f"%{raw_query.strip()}%"
        query = query.filter(
            or_(
                Student.full_name.ilike(pattern),
                Student.reg_number.ilike(pattern),
                Student.student_class.ilike(pattern),
            )
        )

    sort_by = (filters.get("sort_by") or "created_at").strip().lower()
    sort_direction = (filters.get("sort_direction") or "desc").strip().lower()

    sort_columns = {
        "name": Student.full_name,
        "balance": Student.outstanding_balance,
        "class": Student.student_class,
        "created_at": Student.created_at,
    }
    sort_column = sort_columns.get(sort_by, Student.created_at)
    query = query.order_by(desc(sort_column) if sort_direction == "desc" else asc(sort_column))
    return query

@router.get("/admin")
def get_dashboard_stats(
    current_admin: Admin = Depends(get_current_admin), # Automatically extracts from header
    db: Session = Depends(get_db)
):
    school_id = current_admin.school_id
    school = db.query(School).filter(School.id == school_id).first()

    total_collected = db.query(func.sum(Transaction.total_billed))\
        .filter(Transaction.school_id == school_id, Transaction.status == "SUCCESS")\
        .scalar() or 0.0

    pending_debt = db.query(func.sum(Student.outstanding_balance))\
        .filter(Student.school_id == school_id)\
        .scalar() or 0.0

    students = db.query(Student).filter(Student.school_id == school_id).order_by(Student.created_at.desc()).all()
    teachers = db.query(Teacher).filter(Teacher.school_id == school_id).order_by(Teacher.created_at.desc()).all()

    return {
        "admin_name": current_admin.full_name,
        "school_slug": school.slug if school else "unknown",
        "school_branding": serialize_school_branding(school),
        "stats": {
            "total_collected": total_collected,
            "pending_debt": pending_debt,
            "student_count": len(students),
            "teacher_count": len(teachers)
        }
        ,
        "students": [serialize_student(student) for student in students]
        ,
        "teachers": [serialize_teacher(teacher) for teacher in teachers]
    }


@router.post("/students/search")
async def search_students_with_gemini(
    payload: StudentSearchRequest,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    school_id = current_admin.school_id
    interpreted_filters = await gemini_search.interpret_student_query(payload.query)

    query = db.query(Student).filter(Student.school_id == school_id)
    query = apply_student_filters(query, interpreted_filters, payload.query)
    students = query.all()

    return {
        "query": payload.query,
        "ai_enabled": gemini_search.is_enabled,
        "interpreted_filters": interpreted_filters,
        "count": len(students),
        "students": [serialize_student(student) for student in students],
    }

@router.get("/teacher")
def get_teacher_dashboard(
    current_teacher: Teacher = Depends(get_current_teacher), # Automatically extracts from header
    db: Session = Depends(get_db)
):
    class_students = db.query(Student).filter(
        Student.school_id == current_teacher.school_id,
        Student.student_class == current_teacher.assigned_class
    ).all()

    school = db.query(School).filter(School.id == current_teacher.school_id).first()

    total_class_debt = sum(student.outstanding_balance for student in class_students)

    return {
        "teacher_name": current_teacher.full_name,
        "assigned_class": current_teacher.assigned_class,
        "is_first_login": current_teacher.is_first_login,
        "school_branding": serialize_school_branding(school),
        "stats": {
            "student_count": len(class_students),
            "total_class_debt": total_class_debt
        },
        "students": [
            {
                "reg_number": s.reg_number,
                "full_name": s.full_name,
                "outstanding_balance": float(s.outstanding_balance or 0)
            } for s in class_students
        ]
    }