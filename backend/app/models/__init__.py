import uuid
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Numeric, ForeignKey, DateTime, Enum, Boolean
from sqlalchemy.orm import declarative_base, relationship
import enum

# Ensure you are importing your declarative Base at the top of your file!
Base = declarative_base()


def generate_uuid():
    return str(uuid.uuid4())


class School(Base):
    __tablename__ = 'schools'

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, index=True, nullable=False) # e.g., 'grace-academy'
    website_url = Column(String(500), nullable=True)
    logo_url = Column(String(500), nullable=True)
    primary_color = Column(String(20), default="#2563EB")
    secondary_color = Column(String(20), default="#1E40AF")
    accent_color = Column(String(20), default="#FFFFFF")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    # Relationships
    admins = relationship("Admin", back_populates="school", cascade="all, delete-orphan")
    teachers = relationship("Teacher", back_populates="school", cascade="all, delete-orphan")
    students = relationship("Student", back_populates="school", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="school")

class Admin(Base):
    __tablename__ = "admins"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    school_id = Column(String, ForeignKey("schools.id"), nullable=False)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    school = relationship("School", back_populates="admins")

class Teacher(Base):
    __tablename__ = "teachers"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    school_id = Column(String, ForeignKey("schools.id"), nullable=False)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    assigned_class = Column(String, nullable=False) # Critical for RBAC (e.g., "JSS 1")
    is_first_login = Column(Boolean, default=True)  # Forces them to change the default password
    created_at = Column(DateTime, default=datetime.utcnow)    
    school = relationship("School", back_populates="teachers")

class Student(Base):
    __tablename__ = 'students'

    id = Column(String(36), primary_key=True, default=generate_uuid)
    school_id = Column(String(36), ForeignKey('schools.id'), nullable=False)
    reg_number = Column(String(100), nullable=False, index=True) # e.g., 'GRA/2026/001'
    full_name = Column(String(255), nullable=False)
    student_class = Column(String(50), nullable=True)
    
    # Financials
    outstanding_balance = Column(Numeric(10, 2), default=0.00) 
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    school = relationship("School", back_populates="students")
    transactions = relationship("Transaction", back_populates="student")


class Transaction(Base):
    __tablename__ = 'transactions'

    id = Column(String(36), primary_key=True, default=generate_uuid)
    reference = Column(String(100), unique=True, index=True, nullable=False) 
    school_id = Column(String(36), ForeignKey('schools.id'), nullable=False)
    student_id = Column(String(36), ForeignKey('students.id'), nullable=False)
    
    # Fee Breakdown
    base_fee = Column(Numeric(10, 2), nullable=False)      
    gateway_fee = Column(Numeric(10, 2), nullable=False)   
    platform_fee = Column(Numeric(10, 2), nullable=False)  
    total_billed = Column(Numeric(10, 2), nullable=False)  
    
    status = Column(String(50), default="PENDING") 
    nomba_txn_id = Column(String(255), nullable=True) 
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    school = relationship("School", back_populates="transactions")
    student = relationship("Student", back_populates="transactions")