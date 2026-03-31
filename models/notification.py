from datetime import datetime, timezone
from pydantic import BaseModel, Field
import uuid
from enum import Enum


class NotificationType(str, Enum):
    BOOKING_CREATED = "BOOKING_CREATED"
    BOOKING_ACCEPTED = "BOOKING_ACCEPTED"
    BOOKING_REJECTED = "BOOKING_REJECTED"
    LISTING_CREATED = "LISTING_CREATED"
    GENERAL = "GENERAL"


class Notification(BaseModel):
    """Notification domain model"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    message: str
    type: NotificationType
    is_read: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    def mark_as_read(self):
        self.is_read = True
