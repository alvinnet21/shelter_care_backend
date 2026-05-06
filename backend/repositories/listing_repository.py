from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from models.listing import Listing, Review
from datetime import datetime


class ListingRepository:
    """Repository for Listing data access"""

    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.listings

    async def create_listing(self, listing: Listing) -> Listing:
        """Create a new listing"""
        listing_dict = listing.model_dump()
        listing_dict['created_at'] = listing_dict['created_at'].isoformat()
        listing_dict['reviews'] = []
        await self.collection.insert_one(listing_dict)
        return listing

    async def get_all_listings(self, available_only: bool = False) -> List[dict]:
        """Get all listings (excluding soft-deleted)"""
        query = {"deleted_at": None}
        if available_only:
            query["is_available"] = True
        listings = await self.collection.find(query, {"_id": 0}).to_list(1000)
        return listings

    async def get_listing_by_id(self, listing_id: str) -> Optional[dict]:
        """Get listing by ID"""
        return await self.collection.find_one({"id": listing_id}, {"_id": 0})

    async def update_listing(self, listing_id: str, update_data: dict) -> bool:
        """Update listing"""
        result = await self.collection.update_one(
            {"id": listing_id},
            {"$set": update_data}
        )
        return result.modified_count > 0

    async def add_review(self, listing_id: str, review: Review) -> bool:
        """Add review to listing"""
        review_dict = review.model_dump()
        review_dict['created_at'] = review_dict['created_at'].isoformat()
        result = await self.collection.update_one(
            {"id": listing_id},
            {"$push": {"reviews": review_dict}}
        )
        return result.modified_count > 0

    async def get_listings_by_provider(self, provider_id: str) -> List[dict]:
        """Get all listings by provider (excluding soft-deleted)"""
        listings = await self.collection.find(
            {"provider_id": provider_id, "deleted_at": None},
            {"_id": 0}
        ).to_list(1000)
        return listings

    async def get_all_listings_admin(self) -> List[dict]:
        """Get ALL listings for admin (including soft-deleted)"""
        listings = await self.collection.find({}, {"_id": 0}).to_list(10000)
        return listings
