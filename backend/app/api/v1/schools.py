import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import School, Admin
from app.core.security import get_password_hash
from app.schemas.school import SchoolRegisterRequest, SchoolBrandingResponse, SchoolRegisterResponse
from app.services.school_branding import SchoolBrandingService, FALLBACK_COLORS

router = APIRouter()
logger = logging.getLogger(__name__)
branding_service = SchoolBrandingService()

def serialize_branding(school: School) -> dict:
    return {
        "id": school.id,
        "name": school.name,
        "slug": school.slug,
        "website_url": school.website_url,
        "logo_url": school.logo_url,
        "primary_color": school.primary_color or FALLBACK_COLORS["primary_color"],
        "secondary_color": school.secondary_color or FALLBACK_COLORS["secondary_color"],
        "accent_color": school.accent_color or FALLBACK_COLORS["accent_color"],
    }


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_school(request: SchoolRegisterRequest, db: Session = Depends(get_db)):
    try:
        # 2. Safety Check: Ensure the URL slug isn't already taken
        existing_school = db.query(School).filter(School.slug == request.school_slug).first()
        if existing_school:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="That Payment Portal URL is already taken. Please try another."
            )

        # 3. Safety Check: Ensure the admin email isn't already registered
        existing_admin = db.query(Admin).filter(Admin.email == request.admin_email).first()
        if existing_admin:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An administrator with this email already exists."
            )

        try:
            branding = await branding_service.build_branding(request.website_url, request.school_name)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

        # 4. Create the School with the extracted branding.
        new_school = School(
            name=request.school_name,
            slug=request.school_slug,
            website_url=branding["website_url"],
            logo_url=branding.get("logo_url"),
            primary_color=branding.get("primary_color", FALLBACK_COLORS["primary_color"]),
            secondary_color=branding.get("secondary_color", FALLBACK_COLORS["secondary_color"]),
            accent_color=branding.get("accent_color", FALLBACK_COLORS["accent_color"]),
        )
        db.add(new_school)
        db.flush()
        db.refresh(new_school)

        # 5. Create the Admin and link them to the new School
        hashed_pw = get_password_hash(request.admin_password)

        new_admin = Admin(
            school_id=new_school.id,
            full_name=request.admin_full_name,
            email=request.admin_email,
            hashed_password=hashed_pw,
        )

        db.add(new_admin)
        db.commit()
        db.refresh(new_admin)

        return {
            "status": "success",
            "message": "School and Administrator account created successfully!",
            "school_id": new_school.id,
            "admin_id": new_admin.id,
            "branding": serialize_branding(new_school),
            "warning": branding.get("warning"),
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        logger.exception("School registration failed")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="School registration failed") from exc


@router.get("/{school_slug}/branding", response_model=SchoolBrandingResponse)
def get_school_branding(school_slug: str, db: Session = Depends(get_db)):
    school = db.query(School).filter(School.slug == school_slug).first()
    if not school:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="School not found")

    return serialize_branding(school)