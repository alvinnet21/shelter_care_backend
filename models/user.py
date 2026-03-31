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
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        from_attributes = True


class ShelterSeeker(User):
    """Shelter Seeker extends User"""
    question_answer: Optional[str] = None
    booking_history: List[str] = Field(default_factory=list)
    role: str = "SEEKER"


class Provider(User):
    """Provider extends User"""
    listings: List[str] = Field(default_factory=list)
    incoming_bookings: List[str] = Field(default_factory=list)
    role: str = "PROVIDER"


class Volunteer(User):
    """Volunteer extends User"""
    assigned_tasks: List[str] = Field(default_factory=list)
    role: str = "VOLUNTEER"
