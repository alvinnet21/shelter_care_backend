from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from models.booking import Booking, BookingStatus


class BookingRepository:
    """Repository for Booking data access"""

    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.bookings

    async def create_booking(self, booking: Booking) -> Booking:
        """Create a new booking"""
        booking_dict = booking.model_dump()
        booking_dict['created_at'] = booking_dict['created_at'].isoformat()
        booking_dict['booking_date'] = booking_dict['booking_date'].isoformat()
        booking_dict['check_in_date'] = booking_dict['check_in_date'].isoformat()
        booking_dict['check_out_date'] = booking_dict['check_out_date'].isoformat()
        await self.collection.insert_one(booking_dict)
        return booking

    async def get_bookings_by_user(self, user_id: str) -> List[dict]:
        """Get bookings by seeker (newest first)"""
        bookings = await self.collection.find(
            {"seeker_id": user_id},
            {"_id": 0}
        ).sort("created_at", -1).to_list(1000)
        return bookings

    async def get_bookings_by_provider(self, provider_id: str) -> List[dict]:
        """Get bookings for provider's listings"""
        bookings = await self.collection.find(
            {"provider_id": provider_id},
            {"_id": 0}
        ).to_list(1000)
        return bookings

    async def get_all_bookings(self) -> List[dict]:
        """Get all bookings (for volunteers)"""
        bookings = await self.collection.find({}, {"_id": 0}).to_list(1000)
        return bookings

    async def get_booking_by_id(self, booking_id: str) -> Optional[dict]:
        """Get booking by ID"""
        return await self.collection.find_one({"id": booking_id}, {"_id": 0})

    async def update_booking_status(
        self, booking_id: str, status: BookingStatus, rejection_reason: Optional[str] = None
    ) -> bool:
        """Update booking status"""
        update_data = {"status": status}
        if rejection_reason:
            update_data["rejection_reason"] = rejection_reason
        result = await self.collection.update_one(
            {"id": booking_id},
            {"$set": update_data}
        )
        return result.modified_count > 0
