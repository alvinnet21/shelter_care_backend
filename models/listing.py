from typing import List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field
import uuid


class Review(BaseModel):
    """Review model"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: str
    rating: int = Field(ge=1, le=5)
    comment: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Listing(BaseModel):
    """Listing domain model"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    provider_id: str
    provider_name: str
    title: str
    description: str
    address: str
    photos: List[str] = Field(default_factory=list)
    reviews: List[Review] = Field(default_factory=list)
    is_available: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    def update_availability(self, available: bool):
        self.is_available = available

    def add_review(self, review: Review):
        self.reviews.append(review)

    def get_average_rating(self) -> float:
        if not self.reviews:
            return 0.0
        return sum(r.rating for r in self.reviews) / len(self.reviews)
