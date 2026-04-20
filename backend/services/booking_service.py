from typing import List, Optional
from datetime import datetime
from models.booking import Booking, BookingStatus
from repositories.booking_repository import BookingRepository
from repositories.listing_repository import ListingRepository
from repositories.user_repository import UserRepository
from services.notification_service import NotificationService
from services.email_service import EmailService
from models.notification import NotificationType


class BookingService:
    """Booking service following Clean Architecture"""

    def __init__(
        self,
        booking_repository: BookingRepository,
        listing_repository: ListingRepository,
        user_repository: UserRepository,
        notification_service: NotificationService
    ):
        self.booking_repository = booking_repository
        self.listing_repository = listing_repository
        self.user_repository = user_repository
        self.notification_service = notification_service
        self.email_service = EmailService()

    async def create_booking(
        self, seeker_id: str, listing_id: str, check_in_date: datetime, check_out_date: datetime
    ) -> Optional[Booking]:
        """Create a new booking"""
        seeker = await self.user_repository.find_by_id(seeker_id)
        if not seeker or seeker["role"] != "SEEKER":
            return None

        listing = await self.listing_repository.get_listing_by_id(listing_id)
        if not listing or not listing["is_available"]:
            return None

        booking = Booking(
            seeker_id=seeker_id,
            seeker_name=seeker["full_name"],
            provider_id=listing["provider_id"],
            listing_id=listing_id,
            listing_title=listing["title"],
            booking_date=check_in_date,
            check_in_date=check_in_date,
            check_out_date=check_out_date
        )

        created_booking = await self.booking_repository.create_booking(booking)
        await self.user_repository.add_booking_to_seeker(seeker_id, created_booking.id)

        await self.notification_service.send_notification(
            user_id=listing["provider_id"],
            message=f"New booking request from {seeker['full_name']} for {listing['title']}",
            notification_type=NotificationType.BOOKING_CREATED
        )

        # Send email to provider
        provider = await self.user_repository.find_by_id(listing["provider_id"])
        if provider and provider.get("email"):
            fmt = "%B %d, %Y"
            await self.email_service.send_new_booking_request_email(
                to_email=provider["email"],
                provider_name=provider["full_name"],
                seeker_name=seeker["full_name"],
                listing_title=listing["title"],
                check_in=check_in_date.strftime(fmt),
                check_out=check_out_date.strftime(fmt),
            )

        return created_booking

    async def accept_booking(self, booking_id: str, provider_id: str) -> bool:
        """Accept a booking"""
        booking = await self.booking_repository.get_booking_by_id(booking_id)
        if not booking or booking["provider_id"] != provider_id:
            return False

        success = await self.booking_repository.update_booking_status(
            booking_id, BookingStatus.ACCEPTED
        )

        if success:
            await self.notification_service.send_notification(
                user_id=booking["seeker_id"],
                message=f"Your booking for {booking['listing_title']} has been accepted!",
                notification_type=NotificationType.BOOKING_ACCEPTED
            )

            # Send email to seeker
            seeker = await self.user_repository.find_by_id(booking["seeker_id"])
            provider = await self.user_repository.find_by_id(provider_id)
            if seeker and seeker.get("email"):
                fmt = "%B %d, %Y"
                ci = datetime.fromisoformat(booking["check_in_date"]) if isinstance(booking["check_in_date"], str) else booking["check_in_date"]
                co = datetime.fromisoformat(booking["check_out_date"]) if isinstance(booking["check_out_date"], str) else booking["check_out_date"]
                await self.email_service.send_booking_accepted_email(
                    to_email=seeker["email"],
                    seeker_name=seeker["full_name"],
                    listing_title=booking["listing_title"],
                    provider_name=provider["full_name"] if provider else "Provider",
                    check_in=ci.strftime(fmt),
                    check_out=co.strftime(fmt),
                )

        return success

    async def reject_booking(self, booking_id: str, provider_id: str, reason: str) -> bool:
        """Reject a booking"""
        booking = await self.booking_repository.get_booking_by_id(booking_id)
        if not booking or booking["provider_id"] != provider_id:
            return False

        success = await self.booking_repository.update_booking_status(
            booking_id, BookingStatus.REJECTED, reason
        )

        if success:
            await self.notification_service.send_notification(
                user_id=booking["seeker_id"],
                message=f"Your booking for {booking['listing_title']} was declined. Reason: {reason}",
                notification_type=NotificationType.BOOKING_REJECTED
            )

            # Send email to seeker with rejection reason
            seeker = await self.user_repository.find_by_id(booking["seeker_id"])
            provider = await self.user_repository.find_by_id(provider_id)
            if seeker and seeker.get("email"):
                fmt = "%B %d, %Y"
                ci = datetime.fromisoformat(booking["check_in_date"]) if isinstance(booking["check_in_date"], str) else booking["check_in_date"]
                co = datetime.fromisoformat(booking["check_out_date"]) if isinstance(booking["check_out_date"], str) else booking["check_out_date"]
                await self.email_service.send_booking_rejected_email(
                    to_email=seeker["email"],
                    seeker_name=seeker["full_name"],
                    listing_title=booking["listing_title"],
                    provider_name=provider["full_name"] if provider else "Provider",
                    check_in=ci.strftime(fmt),
                    check_out=co.strftime(fmt),
                    reason=reason,
                )

        return success

    async def get_user_bookings(self, user_id: str) -> List[dict]:
        """Get bookings for a seeker"""
        return await self.booking_repository.get_bookings_by_user(user_id)

    async def get_provider_bookings(self, provider_id: str) -> List[dict]:
        """Get bookings for a provider"""
        return await self.booking_repository.get_bookings_by_provider(provider_id)

    async def get_all_bookings(self) -> List[dict]:
        """Get all bookings (for volunteers)"""
        return await self.booking_repository.get_all_bookings()
