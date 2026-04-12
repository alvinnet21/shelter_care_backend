from typing import Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from models.user import User, ShelterSeeker, Provider, Verificator, Admin


class UserRepository:
    """Repository for User data access"""

    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.users

    async def create_user(self, user: User) -> User:
        """Create a new user"""
        user_dict = user.model_dump()
        user_dict['created_at'] = user_dict['created_at'].isoformat()
        await self.collection.insert_one(user_dict)
        return user

    async def find_by_email(self, email: str) -> Optional[dict]:
        """Find user by email"""
        return await self.collection.find_one({"email": email}, {"_id": 0})

    async def find_by_id(self, user_id: str) -> Optional[dict]:
        """Find user by ID"""
        return await self.collection.find_one({"id": user_id}, {"_id": 0})

    async def update_user(self, user_id: str, update_data: dict) -> bool:
        """Update user data"""
        result = await self.collection.update_one(
            {"id": user_id},
            {"$set": update_data}
        )
        return result.modified_count > 0

    async def add_listing_to_provider(self, provider_id: str, listing_id: str) -> bool:
        """Add listing to provider's listings array"""
        result = await self.collection.update_one(
            {"id": provider_id},
            {"$push": {"listings": listing_id}}
        )
        return result.modified_count > 0

    async def add_booking_to_seeker(self, seeker_id: str, booking_id: str) -> bool:
        """Add booking to seeker's history"""
        result = await self.collection.update_one(
            {"id": seeker_id},
            {"$push": {"booking_history": booking_id}}
        )
        return result.modified_count > 0
