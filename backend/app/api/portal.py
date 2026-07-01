from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.core.config import settings
from app.db.session import get_db
from app.models import School, Student
from app.services.school_branding import FALLBACK_COLORS

router = APIRouter()

class StudentVerifyRequest(BaseModel):
    reg_number: str

@router.get("/{school_slug}")
def get_school_portal(school_slug: str, db: Session = Depends(get_db)):
    """Fetches the school details to white-label the checkout page"""
    school = db.query(School).filter(School.slug == school_slug).first()
    if not school:
        raise HTTPException(status_code=404, detail="Payment portal not found")

    logo_url = school.logo_url or f"https://ui-avatars.com/api/?name={school.name.replace(' ', '+')}&background=2563EB&color=FFFFFF"
        
    return {
        "school_id": school.id,
        "school_name": school.name,
        "website_url": school.website_url,
        "logo_url": logo_url,
        "primary_color": school.primary_color or FALLBACK_COLORS["primary_color"],
        "secondary_color": school.secondary_color or FALLBACK_COLORS["secondary_color"],
        "accent_color": school.accent_color or FALLBACK_COLORS["accent_color"],
        "branding": {
            "primary_color": school.primary_color or FALLBACK_COLORS["primary_color"],
            "secondary_color": school.secondary_color or FALLBACK_COLORS["secondary_color"],
            "accent_color": school.accent_color or FALLBACK_COLORS["accent_color"],
            "logo_url": logo_url,
        }
    }

@router.post("/{school_slug}/verify")
def verify_student_debt(school_slug: str, request: StudentVerifyRequest, db: Session = Depends(get_db)):
    """Allows a parent to securely look up their child's specific fee balance"""
    school = db.query(School).filter(School.slug == school_slug).first()
    if not school:
        raise HTTPException(status_code=404, detail="Payment portal not found")

    student = db.query(Student).filter(
        Student.school_id == school.id, 
        Student.reg_number == request.reg_number
    ).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student Registration Number not found in our records.")

    if student.outstanding_balance <= 0:
        return {"status": "cleared", "message": "No outstanding fees for this student!"}

    # Calculate the Customer-Borne Fee (e.g., 1.5% Nomba Gateway Fee + Flat Platform Fee)
    base_fee = float(student.outstanding_balance) # The exact amount the school receives
    platform_fee = float(settings.PLATFORM_FEE) # Your 500 Naira profit
    gateway_fee = float(settings.GATEWAY_FEE) # Nomba deducts this dynamically, so we can default to 0.0 here
    total_charged = base_fee + platform_fee + gateway_fee # The final amount the parent's card is charged

    return {
        "status": "pending",
        "student_id": student.id,
        "student_name": student.full_name,
        "student_class": student.student_class,
        "breakdown": {
            "base_fee": base_fee,
            "gateway_fee": gateway_fee,
            "platform_fee": platform_fee,
            "total_charged": total_charged
        }
    }


    