from pydantic import BaseModel, EmailStr


class SchoolRegisterRequest(BaseModel):
    school_name: str
    school_slug: str
    website_url: str
    admin_full_name: str
    admin_email: EmailStr
    admin_password: str


class SchoolBrandingResponse(BaseModel):
    id: str
    name: str
    slug: str
    website_url: str | None = None
    logo_url: str | None = None
    primary_color: str
    secondary_color: str
    accent_color: str

    class Config:
        from_attributes = True


class SchoolRegisterResponse(BaseModel):
    status: str
    message: str
    school_id: str
    admin_id: str
    branding: SchoolBrandingResponse
