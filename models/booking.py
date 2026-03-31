from typing import Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field
import uuid
from enum import Enum


class BookingStatus(str, Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"


class Booking(BaseModel):
    """Booking domain model"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    seeker_id: str
    seeker_name: str
    provider_id: str
    listing_id: str
    listing_title: str
    booking_date: datetime
    check_in_date: datetime
    check_out_date: datetime
    status: BookingStatus = BookingStatus.PENDING
    rejection_reason: Optional[str] = None
    has_review: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    def accept(self):
        self.status = BookingStatus.ACCEPTED

    def reject(self, reason: str):
        self.status = BookingStatus.REJECTED
        self.rejection_reason = reason
    
    def cancel(self):
        self.status = BookingStatus.REJECTED
        self.rejection_reason = "Cancelled by user"
