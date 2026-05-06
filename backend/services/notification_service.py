from typing import List
from models.notification import Notification, NotificationType
from repositories.notification_repository import NotificationRepository


class NotificationService:
    """Notification service following Clean Architecture"""

    def __init__(self, notification_repository: NotificationRepository):
        self.notification_repository = notification_repository

    async def send_notification(
        self, user_id: str, message: str, notification_type: NotificationType
    ) -> Notification:
        """Send a notification to a user"""
        notification = Notification(
            user_id=user_id,
            message=message,
            type=notification_type
        )
        return await self.notification_repository.create_notification(notification)

    async def get_user_notifications(self, user_id: str) -> List[dict]:
        """Get all notifications for a user"""
        return await self.notification_repository.get_notifications_by_user(user_id)

    async def mark_notification_read(self, notification_id: str) -> bool:
        """Mark a notification as read"""
        return await self.notification_repository.mark_as_read(notification_id)

    async def mark_all_read(self, user_id: str) -> bool:
        """Mark all user notifications as read"""
        return await self.notification_repository.mark_all_as_read(user_id)
