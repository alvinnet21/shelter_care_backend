from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from models.review import BookingReview


class ReviewRepository:
    """Repository for Review data access"""

    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.reviews

    async def create_review(self, review: BookingReview) -> BookingReview:
        """Create a new review"""
        review_dict = review.model_dump()
        review_dict['created_at'] = review_dict['created_at'].isoformat()
        review_dict['updated_at'] = review_dict['updated_at'].isoformat()
        await self.collection.insert_one(review_dict)
        return review

    async def get_review_by_booking(self, booking_id: str) -> Optional[dict]:
        """Get review for a specific booking"""
        return await self.collection.find_one({"booking_id": booking_id}, {"_id": 0})

    async def get_reviews_by_listing(self, listing_id: str) -> List[dict]:
        """Get all reviews for a listing"""
        reviews = await self.collection.find(
            {"listing_id": listing_id},
            {"_id": 0}
        ).sort("created_at", -1).to_list(1000)
        return reviews

    async def update_review(self, booking_id: str, rating: int, comment: str) -> bool:
        """Update an existing review"""
        from datetime import datetime, timezone
        result = await self.collection.update_one(
            {"booking_id": booking_id},
            {
                "$set": {
                    "rating": rating,
                    "comment": comment,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        return result.modified_count > 0

    async def delete_review(self, review_id: str) -> bool:
        """Delete a review"""
        result = await self.collection.delete_one({"id": review_id})
        return result.deleted_count > 0
