from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, timezone
import os
import logging
from pathlib import Path

from repositories.user_repository import UserRepository
from repositories.listing_repository import ListingRepository
from repositories.booking_repository import BookingRepository
from repositories.notification_repository import NotificationRepository
from repositories.review_repository import ReviewRepository
from services.auth_service import AuthService
from services.listing_service import ListingService
from services.booking_service import BookingService
from services.notification_service import NotificationService
from models.booking import BookingStatus
from models.review import BookingReview
from models.notification import NotificationType

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

user_repo = UserRepository(db)
listing_repo = ListingRepository(db)
booking_repo = BookingRepository(db)
notification_repo = NotificationRepository(db)
review_repo = ReviewRepository(db)

auth_service = AuthService(user_repo)
notification_service = NotificationService(notification_repo)
listing_service = ListingService(listing_repo, user_repo)
booking_service = BookingService(booking_repo, listing_repo, user_repo, notification_service)


class RegisterRequest(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    role: str
    question_answer: Optional[str] = None
    id_document: Optional[str] = None
    police_check: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class CreateListingRequest(BaseModel):
    title: str
    description: str
    address: str
    photos: List[str]


class CreateBookingRequest(BaseModel):
    listing_id: str
    check_in_date: str
    check_out_date: str


class RejectBookingRequest(BaseModel):
    reason: str


class ReviewRequest(BaseModel):
    rating: int
    comment: str


class UpdatePasswordRequest(BaseModel):
    old_password: str
    new_password: str


class BlockDatesRequest(BaseModel):
    dates: List[str]  # List of dates in ISO format


class UnblockDatesRequest(BaseModel):
    dates: List[str]  # List of dates to unblock


async def get_current_user(authorization: Optional[str] = Header(None)):
    """Dependency to get current user from JWT token"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization.split(" ")[1]
    payload = auth_service.verify_token(token)
    
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await user_repo.find_by_id(payload["user_id"])
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user


@api_router.post("/auth/register")
async def register(req: RegisterRequest):
    """Register a new user"""
    user = await auth_service.register(
        email=req.email,
        full_name=req.full_name,
        password=req.password,
        role=req.role,
        question_answer=req.question_answer,
        id_document=req.id_document,
        police_check=req.police_check
    )
    
    if not user:
        raise HTTPException(status_code=400, detail="Email already registered or invalid role")
    
    return {"message": "User registered successfully", "user_id": user.id, "needs_verification": req.role == "PROVIDER"}


@api_router.post("/auth/login")
async def login(req: LoginRequest):
    """Login user"""
    result = await auth_service.login(req.email, req.password)
    
    if not result:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Check if it's an error response (provider not verified)
    if "error" in result:
        raise HTTPException(status_code=403, detail=result["message"])
    
    return result


@api_router.post("/auth/forgot-password")
async def forgot_password(req: ForgotPasswordRequest):
    """Send forgot password email with random password"""
    result = await auth_service.forgot_password(req.email)
    
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result["message"])
    
    return {"message": result["message"]}


@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user profile"""
    return {
        "id": current_user["id"],
        "email": current_user["email"],
        "full_name": current_user["full_name"],
        "role": current_user["role"],
        "profile_photo": current_user.get("profile_photo"),
        "listings": current_user.get("listings", []),
        "booking_history": current_user.get("booking_history", []),
        "question_answer": current_user.get("question_answer")
    }


@api_router.get("/admin/stats")
async def get_admin_stats(current_user: dict = Depends(get_current_user)):
    """Get admin dashboard statistics"""
    if current_user["role"] != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    total_users = await user_repo.collection.count_documents({})
    total_seekers = await user_repo.collection.count_documents({"role": "SEEKER"})
    total_providers = await user_repo.collection.count_documents({"role": "PROVIDER"})
    pending_verification = await user_repo.collection.count_documents({
        "role": "PROVIDER",
        "verification_status": "PENDING"
    })
    verified_providers = await user_repo.collection.count_documents({
        "role": "PROVIDER",
        "is_verified": True
    })
    total_bookings = await booking_repo.collection.count_documents({})
    
    return {
        "total_users": total_users,
        "total_seekers": total_seekers,
        "total_providers": total_providers,
        "pending_verification": pending_verification,
        "verified_providers": verified_providers,
        "total_bookings": total_bookings
    }


@api_router.get("/admin/users")
async def get_all_users(current_user: dict = Depends(get_current_user)):
    """Get all users (Admin only)"""
    if current_user["role"] != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    users = await user_repo.collection.find({}, {"_id": 0, "password": 0}).to_list(10000)
    return {"users": users}


@api_router.get("/verificator/stats")
async def get_verificator_stats(current_user: dict = Depends(get_current_user)):
    """Get verificator dashboard statistics"""
    if current_user["role"] != "VERIFICATOR":
        raise HTTPException(status_code=403, detail="Verificator access required")
    
    total_providers = await user_repo.collection.count_documents({"role": "PROVIDER"})
    pending_verification = await user_repo.collection.count_documents({
        "role": "PROVIDER",
        "verification_status": "PENDING"
    })
    verified_providers = await user_repo.collection.count_documents({
        "role": "PROVIDER",
        "is_verified": True
    })
    
    return {
        "total_providers": total_providers,
        "pending_verification": pending_verification,
        "verified_providers": verified_providers
    }


@api_router.get("/verificator/providers")
async def get_providers_for_verification(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get providers list for verification"""
    if current_user["role"] != "VERIFICATOR":
        raise HTTPException(status_code=403, detail="Verificator access required")
    
    query = {"role": "PROVIDER"}
    if status:
        query["verification_status"] = status
    
    providers = await user_repo.collection.find(
        query,
        {"_id": 0, "password": 0}
    ).to_list(10000)
    
    return {"providers": providers}


@api_router.put("/verificator/providers/{provider_id}/verify")
async def verify_provider(
    provider_id: str,
    action: str,
    reason: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Approve or reject provider verification"""
    if current_user["role"] != "VERIFICATOR":
        raise HTTPException(status_code=403, detail="Verificator access required")
    
    provider = await user_repo.find_by_id(provider_id)
    if not provider or provider["role"] != "PROVIDER":
        raise HTTPException(status_code=404, detail="Provider not found")
    
    if action == "APPROVE":
        update_data = {
            "is_verified": True,
            "verification_status": "APPROVED",
            "verified_at": datetime.now(timezone.utc).isoformat(),
            "verified_by": current_user["id"]
        }
    elif action == "REJECT":
        if not reason:
            raise HTTPException(status_code=400, detail="Rejection reason required")
        update_data = {
            "is_verified": False,
            "verification_status": "REJECTED",
            "verification_reason": reason,
            "verified_at": datetime.now(timezone.utc).isoformat(),
            "verified_by": current_user["id"]
        }
    else:
        raise HTTPException(status_code=400, detail="Invalid action")
    
    success = await user_repo.update_user(provider_id, update_data)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to update verification status")
    
    # Send notification to provider
    if action == "APPROVE":
        message = "Congratulations! Your provider account has been verified. You can now create listings."
    else:
        message = f"Your provider verification was rejected. Reason: {reason}"
    
    await notification_service.send_notification(
        user_id=provider_id,
        message=message,
        notification_type=NotificationType.GENERAL
    )
    
    return {"message": f"Provider {action.lower()}ed successfully"}


@api_router.put("/auth/profile")
async def update_profile(
    full_name: Optional[str] = None,
    profile_photo: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Update user profile"""
    update_data = {}
    if full_name:
        update_data["full_name"] = full_name
    if profile_photo is not None:
        update_data["profile_photo"] = profile_photo
    
    if update_data:
        success = await user_repo.update_user(current_user["id"], update_data)
        if not success:
            raise HTTPException(status_code=400, detail="Failed to update profile")
    
    return {"message": "Profile updated successfully"}


@api_router.put("/auth/password")
async def update_password(
    req: UpdatePasswordRequest,
    current_user: dict = Depends(get_current_user)
):
    """Update user password"""
    if not auth_service.verify_password(req.old_password, current_user["password"]):
        raise HTTPException(status_code=400, detail="Invalid old password")
    
    new_hashed = auth_service.hash_password(req.new_password)
    success = await user_repo.update_user(current_user["id"], {"password": new_hashed})
    
    if not success:
        raise HTTPException(status_code=400, detail="Failed to update password")
    
    return {"message": "Password updated successfully"}


@api_router.post("/listings")
async def create_listing(
    req: CreateListingRequest,
    current_user: dict = Depends(get_current_user)
):
    """Create a new listing (Provider only)"""
    if current_user["role"] != "PROVIDER":
        raise HTTPException(status_code=403, detail="Only providers can create listings")
    
    listing = await listing_service.create_listing(
        provider_id=current_user["id"],
        title=req.title,
        description=req.description,
        address=req.address,
        photos=req.photos
    )
    
    if not listing:
        raise HTTPException(status_code=400, detail="Failed to create listing")
    
    return {"message": "Listing created successfully", "listing": listing.model_dump()}


@api_router.get("/listings")
async def get_listings(available_only: bool = True):
    """Get all listings"""
    listings = await listing_service.get_all_listings(available_only)
    return {"listings": listings}


@api_router.get("/listings/recommended")
async def get_recommended_listings():
    """Get recommended listings sorted by average rating and review count"""
    # Get all available listings
    listings = await listing_repo.collection.find(
        {"is_available": True},
        {"_id": 0}
    ).to_list(1000)
    
    # Get reviews for each listing from the reviews collection
    for listing in listings:
        reviews = await review_repo.collection.find(
            {"listing_id": listing["id"]},
            {"_id": 0}
        ).to_list(1000)
        listing["reviews"] = reviews
        
        # Calculate average rating and booking count
        if reviews:
            listing["average_rating"] = round(sum(r["rating"] for r in reviews) / len(reviews), 1)
            listing["review_count"] = len(reviews)
        else:
            listing["average_rating"] = 0
            listing["review_count"] = 0
        
        # Get total accepted bookings
        total_bookings = await booking_repo.collection.count_documents({
            "listing_id": listing["id"],
            "status": "ACCEPTED"
        })
        listing["total_bookings"] = total_bookings
        
        # Calculate recommendation score
        review_score = min(listing["review_count"], 10) / 10 * 5
        booking_score = min(total_bookings, 20) / 20 * 5
        listing["recommendation_score"] = round(
            (listing["average_rating"] * 0.6) + (review_score * 0.2) + (booking_score * 0.2), 2
        )
    
    # Sort by recommendation score (desc)
    recommended = sorted(
        listings,
        key=lambda x: x["recommendation_score"],
        reverse=True
    )
    
    return {"listings": recommended}


@api_router.get("/listings/provider/me")
async def get_my_listings(current_user: dict = Depends(get_current_user)):
    """Get provider's own listings"""
    if current_user["role"] != "PROVIDER":
        raise HTTPException(status_code=403, detail="Only providers can access this")
    
    listings = await listing_service.get_provider_listings(current_user["id"])
    return {"listings": listings}


@api_router.get("/listings/{listing_id}")
async def get_listing(listing_id: str):
    """Get listing details with reviews"""
    listing = await listing_service.get_listing_detail(listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    return listing


@api_router.put("/listings/{listing_id}/block-dates")
async def block_dates(
    listing_id: str,
    start_date: str,
    end_date: str,
    current_user: dict = Depends(get_current_user)
):
    """Block specific dates for a listing (Provider manual block)"""
    if current_user["role"] != "PROVIDER":
        raise HTTPException(status_code=403, detail="Only providers can block dates")
    
    listing = await listing_repo.get_listing_by_id(listing_id)
    if not listing or listing["provider_id"] != current_user["id"]:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    # Create a "blocked" booking
    from models.booking import Booking
    blocked_booking = Booking(
        seeker_id="SYSTEM_BLOCK",
        seeker_name="Unavailable (Provider Block)",
        provider_id=current_user["id"],
        listing_id=listing_id,
        listing_title=listing["title"],
        booking_date=datetime.fromisoformat(start_date),
        check_in_date=datetime.fromisoformat(start_date),
        check_out_date=datetime.fromisoformat(end_date),
        status="ACCEPTED"
    )
    
    await booking_repo.create_booking(blocked_booking)
    
    return {"message": "Dates blocked successfully"}


@api_router.put("/listings/{listing_id}")
async def update_listing(
    listing_id: str,
    title: Optional[str] = None,
    description: Optional[str] = None,
    address: Optional[str] = None,
    photos: Optional[List[str]] = None,
    is_available: Optional[bool] = None,
    current_user: dict = Depends(get_current_user)
):
    """Update a listing (Provider only)"""
    if current_user["role"] != "PROVIDER":
        raise HTTPException(status_code=403, detail="Only providers can update listings")
    
    listing = await listing_repo.get_listing_by_id(listing_id)
    if not listing or listing["provider_id"] != current_user["id"]:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    update_data = {}
    if title is not None:
        update_data["title"] = title
    if description is not None:
        update_data["description"] = description
    if address is not None:
        update_data["address"] = address
    if photos is not None:
        update_data["photos"] = photos
    if is_available is not None:
        update_data["is_available"] = is_available
    
    if update_data:
        success = await listing_repo.update_listing(listing_id, update_data)
        if not success:
            raise HTTPException(status_code=400, detail="Failed to update listing")
    
    return {"message": "Listing updated successfully"}


@api_router.get("/listings/{listing_id}/availability")
async def check_availability(listing_id: str):
    """Check blocked dates for a listing (from bookings + manual blocks)"""
    # Get blocked dates from ACCEPTED bookings and PENDING bookings
    bookings = await booking_repo.collection.find({
        "listing_id": listing_id,
        "status": {"$in": ["PENDING", "ACCEPTED"]}
    }).to_list(1000)
    
    blocked_dates = []
    for booking in bookings:
        blocked_dates.append({
            "check_in": booking.get("check_in_date", booking.get("booking_date")),
            "check_out": booking.get("check_out_date", booking.get("booking_date")),
            "status": booking["status"],
            "type": "system_block" if booking.get("seeker_id") == "SYSTEM_BLOCK" else "booking"
        })
    
    # Get manual blocked dates from listing
    listing = await listing_repo.get_listing_by_id(listing_id)
    if listing and listing.get("manual_blocked_dates"):
        for date in listing["manual_blocked_dates"]:
            blocked_dates.append({
                "check_in": date,
                "check_out": date,
                "status": "BLOCKED",
                "type": "manual"
            })
    
    return {"blocked_dates": blocked_dates}


@api_router.post("/listings/{listing_id}/block-dates")
async def block_listing_dates(
    listing_id: str,
    req: BlockDatesRequest,
    current_user: dict = Depends(get_current_user)
):
    """Manually block dates for a listing (Provider only)"""
    if current_user["role"] != "PROVIDER":
        raise HTTPException(status_code=403, detail="Only providers can block dates")
    
    listing = await listing_repo.get_listing_by_id(listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    if listing["provider_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="You can only block dates for your own listings")
    
    # Get existing manual blocked dates
    existing_blocked = listing.get("manual_blocked_dates", [])
    
    # Add new dates (avoid duplicates)
    new_blocked = list(set(existing_blocked + req.dates))
    
    # Update listing
    await listing_repo.collection.update_one(
        {"id": listing_id},
        {"$set": {"manual_blocked_dates": new_blocked}}
    )
    
    return {"message": "Dates blocked successfully", "blocked_dates": new_blocked}


@api_router.post("/listings/{listing_id}/unblock-dates")
async def unblock_listing_dates(
    listing_id: str,
    req: UnblockDatesRequest,
    current_user: dict = Depends(get_current_user)
):
    """Unblock manually blocked dates for a listing (Provider only)"""
    if current_user["role"] != "PROVIDER":
        raise HTTPException(status_code=403, detail="Only providers can unblock dates")
    
    listing = await listing_repo.get_listing_by_id(listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    if listing["provider_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="You can only unblock dates for your own listings")
    
    # Get existing manual blocked dates
    existing_blocked = listing.get("manual_blocked_dates", [])
    
    # Remove specified dates
    new_blocked = [d for d in existing_blocked if d not in req.dates]
    
    # Update listing
    await listing_repo.collection.update_one(
        {"id": listing_id},
        {"$set": {"manual_blocked_dates": new_blocked}}
    )
    
    return {"message": "Dates unblocked successfully", "blocked_dates": new_blocked}


@api_router.post("/bookings/{booking_id}/review")
async def create_or_update_review(
    booking_id: str,
    req: ReviewRequest,
    current_user: dict = Depends(get_current_user)
):
    """Create or update review for a booking"""
    booking = await booking_repo.get_booking_by_id(booking_id)
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if booking["seeker_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="You can only review your own bookings")
    
    if booking["status"] != "ACCEPTED":
        raise HTTPException(status_code=400, detail="You can only review accepted bookings")
    
    # Check if review already exists
    existing_review = await review_repo.get_review_by_booking(booking_id)
    
    if existing_review:
        # Update existing review
        success = await review_repo.update_review(booking_id, req.rating, req.comment)
        if not success:
            raise HTTPException(status_code=400, detail="Failed to update review")
        
        await booking_repo.collection.update_one(
            {"id": booking_id},
            {"$set": {"has_review": True}}
        )
        
        return {"message": "Review updated successfully", "is_new": False}
    else:
        # Create new review
        review = BookingReview(
            booking_id=booking_id,
            listing_id=booking["listing_id"],
            seeker_id=current_user["id"],
            seeker_name=current_user["full_name"],
            rating=req.rating,
            comment=req.comment
        )
        
        await review_repo.create_review(review)
        
        # Mark booking as reviewed
        await booking_repo.collection.update_one(
            {"id": booking_id},
            {"$set": {"has_review": True}}
        )
        
        return {"message": "Review created successfully", "is_new": True}


@api_router.get("/bookings/{booking_id}/review")
async def get_booking_review(
    booking_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get review for a specific booking"""
    booking = await booking_repo.get_booking_by_id(booking_id)
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if booking["seeker_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    review = await review_repo.get_review_by_booking(booking_id)
    
    if not review:
        return {"has_review": False, "review": None}
    
    return {"has_review": True, "review": review}


@api_router.post("/bookings")
async def create_booking(
    req: CreateBookingRequest,
    current_user: dict = Depends(get_current_user)
):
    """Create a new booking (Seeker only)"""
    if current_user["role"] != "SEEKER":
        raise HTTPException(status_code=403, detail="Only seekers can create bookings")
    
    try:
        check_in = datetime.fromisoformat(req.check_in_date)
        check_out = datetime.fromisoformat(req.check_out_date)
        
        if check_out <= check_in:
            raise HTTPException(status_code=400, detail="Check-out must be after check-in")
        
        existing_bookings = await booking_repo.collection.find({
            "listing_id": req.listing_id,
            "status": {"$in": ["PENDING", "ACCEPTED"]},
        }).to_list(1000)
        
        for existing in existing_bookings:
            existing_in = datetime.fromisoformat(existing["check_in_date"])
            existing_out = datetime.fromisoformat(existing["check_out_date"])
            
            if not (check_out <= existing_in or check_in >= existing_out):
                raise HTTPException(
                    status_code=400, 
                    detail="Selected dates are not available"
                )
        
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")
    
    booking = await booking_service.create_booking(
        seeker_id=current_user["id"],
        listing_id=req.listing_id,
        check_in_date=check_in,
        check_out_date=check_out
    )
    
    if not booking:
        raise HTTPException(status_code=400, detail="Failed to create booking")
    
    return {"message": "Booking created successfully", "booking": booking.model_dump()}


@api_router.get("/bookings/me")
async def get_my_bookings(current_user: dict = Depends(get_current_user)):
    """Get user's bookings"""
    if current_user["role"] == "SEEKER":
        bookings = await booking_service.get_user_bookings(current_user["id"])
    elif current_user["role"] == "PROVIDER":
        bookings = await booking_service.get_provider_bookings(current_user["id"])
    elif current_user["role"] == "ADMIN":
        # Admin can see all bookings
        bookings = await booking_repo.collection.find(
            {},
            {"_id": 0}
        ).to_list(10000)
    else:
        raise HTTPException(status_code=403, detail="Invalid role")
    
    return {"bookings": bookings}


@api_router.put("/bookings/{booking_id}/accept")
async def accept_booking(
    booking_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Accept a booking (Provider only)"""
    if current_user["role"] != "PROVIDER":
        raise HTTPException(status_code=403, detail="Only providers can accept bookings")
    
    success = await booking_service.accept_booking(booking_id, current_user["id"])
    
    if not success:
        raise HTTPException(status_code=400, detail="Failed to accept booking")
    
    return {"message": "Booking accepted successfully"}


@api_router.put("/bookings/{booking_id}/reject")
async def reject_booking(
    booking_id: str,
    req: RejectBookingRequest,
    current_user: dict = Depends(get_current_user)
):
    """Reject a booking (Provider only)"""
    if current_user["role"] != "PROVIDER":
        raise HTTPException(status_code=403, detail="Only providers can reject bookings")
    
    success = await booking_service.reject_booking(
        booking_id, current_user["id"], req.reason
    )
    
    if not success:
        raise HTTPException(status_code=400, detail="Failed to reject booking")
    
    return {"message": "Booking rejected successfully"}


@api_router.put("/bookings/{booking_id}/cancel")
async def cancel_booking(
    booking_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Cancel a pending booking (Seeker only)"""
    if current_user["role"] != "SEEKER":
        raise HTTPException(status_code=403, detail="Only seekers can cancel bookings")
    
    booking = await booking_repo.get_booking_by_id(booking_id)
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if booking["seeker_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="You can only cancel your own bookings")
    
    if booking["status"] != "PENDING":
        raise HTTPException(status_code=400, detail="Only pending bookings can be cancelled")
    
    success = await booking_repo.update_booking_status(
        booking_id, BookingStatus.CANCELLED, "Cancelled by seeker"
    )
    
    if not success:
        raise HTTPException(status_code=400, detail="Failed to cancel booking")
    
    # Notify provider about cancellation
    await notification_service.send_notification(
        user_id=booking["provider_id"],
        message=f"Booking for {booking['listing_title']} has been cancelled by the seeker.",
        notification_type=NotificationType.BOOKING_CANCELLED
    )
    
    return {"message": "Booking cancelled successfully"}


@api_router.get("/notifications")
async def get_notifications(current_user: dict = Depends(get_current_user)):
    """Get user notifications"""
    notifications = await notification_service.get_user_notifications(current_user["id"])
    return {"notifications": notifications}


@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Mark notification as read"""
    success = await notification_service.mark_notification_read(notification_id)
    
    if not success:
        raise HTTPException(status_code=400, detail="Failed to mark as read")
    
    return {"message": "Notification marked as read"}


@api_router.put("/notifications/read-all")
async def mark_all_read(current_user: dict = Depends(get_current_user)):
    """Mark all notifications as read"""
    await notification_service.mark_all_read(current_user["id"])
    return {"message": "All notifications marked as read"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
