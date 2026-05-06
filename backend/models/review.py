from typing import Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field
import uuid


class BookingReview(BaseModel):
    """Review tied to a specific booking (seeker reviews listing)"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    booking_id: str
    listing_id: str
    seeker_id: str
    seeker_name: str
    rating: int = Field(ge=1, le=5)
    comment: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    def update(self, rating: int, comment: str):
        self.rating = rating
        self.comment = comment
        self.updated_at = datetime.now(timezone.utc)


class ProviderReview(BaseModel):
    """Review from provider to seeker on a booking"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    booking_id: str
    listing_id: str
    seeker_id: str
    provider_id: str
    provider_name: str
    rating: int = Field(ge=1, le=5)
    comment: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
