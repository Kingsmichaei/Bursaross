from pydantic import BaseModel, EmailStr
from typing import Optional

# 1. What the React frontend sends us
class StaffCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    school_id: str
    assigned_class: Optional[str] = None

# 2. What we send back (Notice there is no 'password' field!)
class StaffResponse(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    school_id: str
    assigned_class: Optional[str] = None

    class Config:
        from_attributes = True # Tells Pydantic to read SQLAlchemy database models