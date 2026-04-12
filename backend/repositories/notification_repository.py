from typing import List
from motor.motor_asyncio import AsyncIOMotorDatabase
from models.notification import Notification


class NotificationRepository:
    """Repository for Notification data access"""

    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.notifications

    async def create_notification(self, notification: Notification) -> Notification:
        """Create a new notification"""
        notif_dict = notification.model_dump()
        notif_dict['created_at'] = notif_dict['created_at'].isoformat()
        await self.collection.insert_one(notif_dict)
        return notification

    async def get_notifications_by_user(self, user_id: str) -> List[dict]:
        """Get notifications for a user"""
        notifications = await self.collection.find(
            {"user_id": user_id},
            {"_id": 0}
        ).sort("created_at", -1).to_list(1000)
        return notifications

    async def mark_as_read(self, notification_id: str) -> bool:
        """Mark notification as read"""
        result = await self.collection.update_one(
            {"id": notification_id},
            {"$set": {"is_read": True}}
        )
        return result.modified_count > 0

    async def mark_all_as_read(self, user_id: str) -> bool:
        """Mark all user notifications as read"""
        result = await self.collection.update_many(
            {"user_id": user_id, "is_read": False},
            {"$set": {"is_read": True}}
        )
        return result.modified_count > 0
