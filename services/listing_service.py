from typing import List, Optional
from models.listing import Listing, Review
from repositories.listing_repository import ListingRepository
from repositories.user_repository import UserRepository


class ListingService:
    """Listing service following Clean Architecture"""

    def __init__(self, listing_repository: ListingRepository, user_repository: UserRepository):
        self.listing_repository = listing_repository
        self.user_repository = user_repository

    async def create_listing(
        self, provider_id: str, title: str, description: str, address: str, photos: List[str],
        suburb: str = "", postcode: str = ""
    ) -> Optional[Listing]:
        """Create a new listing"""
        provider = await self.user_repository.find_by_id(provider_id)
        if not provider or provider["role"] != "PROVIDER":
            return None

        listing = Listing(
            provider_id=provider_id,
            provider_name=provider["full_name"],
            title=title,
            description=description,
            address=address,
            suburb=suburb,
            postcode=postcode,
            photos=photos
        )

        created_listing = await self.listing_repository.create_listing(listing)
        await self.user_repository.add_listing_to_provider(provider_id, created_listing.id)
        return created_listing

    async def get_all_listings(self, available_only: bool = False) -> List[dict]:
        """Get all listings (excluding soft-deleted)"""
        return await self.listing_repository.get_all_listings(available_only)

    async def get_listing_detail(self, listing_id: str) -> Optional[dict]:
        """Get listing details"""
        return await self.listing_repository.get_listing_by_id(listing_id)

    async def add_review(
        self, listing_id: str, user_id: str, rating: int, comment: str
    ) -> bool:
        """Add review to listing"""
        user = await self.user_repository.find_by_id(user_id)
        if not user:
            return False

        review = Review(
            user_id=user_id,
            user_name=user["full_name"],
            rating=rating,
            comment=comment
        )

        return await self.listing_repository.add_review(listing_id, review)

    async def update_availability(self, listing_id: str, is_available: bool) -> bool:
        """Update listing availability"""
        return await self.listing_repository.update_listing(
            listing_id, {"is_available": is_available}
        )

    async def get_provider_listings(self, provider_id: str) -> List[dict]:
        """Get all listings for a provider (excluding soft-deleted)"""
        return await self.listing_repository.get_listings_by_provider(provider_id)
