from abc import ABC
from typing import Optional, List
from datetime import datetime, timezone
from pydantic import BaseModel, EmailStr, Field
import uuid


class User(BaseModel, ABC):
    """Base User class following OOP principles"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    full_name: str
    password: str
    role: str
    profile_photo: Optional[str] = None
    date_of_birth: Optional[str] = None
    description: Optional[str] = None
    deleted_at: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        from_attributes = True


class ShelterSeeker(User):
    """Shelter Seeker extends User"""
    question_answer: Optional[str] = None
    booking_history: List[str] = Field(default_factory=list)
    phone_number: Optional[str] = None
    role: str = "SEEKER"


class Provider(User):
    """Provider extends User"""
    listings: List[str] = Field(default_factory=list)
    incoming_bookings: List[str] = Field(default_factory=list)
    id_document: Optional[str] = None
    police_check: Optional[str] = None
    phone_number: Optional[str] = None
    is_verified: bool = False
    verification_status: str = "PENDING"
    verification_reason: Optional[str] = None
    verified_at: Optional[datetime] = None
    verified_by: Optional[str] = None
    role: str = "PROVIDER"


class Verificator(User):
    """Verificator extends User"""
    verified_providers: List[str] = Field(default_factory=list)
    role: str = "VERIFICATOR"


class Admin(User):
    """Admin extends User"""
    role: str = "ADMIN"
