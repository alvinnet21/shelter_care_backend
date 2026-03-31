from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
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


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


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
        question_answer=req.question_answer
    )
    
    if not user:
        raise HTTPException(status_code=400, detail="Email already registered or invalid role")
    
    return {"message": "User registered successfully", "user_id": user.id}


@api_router.post("/auth/login")
async def login(req: LoginRequest):
    """Login user"""
    result = await auth_service.login(req.email, req.password)
    
    if not result:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    return result


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


@api_router.get("/listings/{listing_id}")
async def get_listing(listing_id: str):
    """Get listing details with reviews"""
    listing = await listing_service.get_listing_detail(listing_id)
    
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    # Get reviews for this listing
    reviews = await review_repo.get_reviews_by_listing(listing_id)
    listing["reviews"] = reviews
    
    return listing


@api_router.get("/listings/provider/me")
async def get_my_listings(current_user: dict = Depends(get_current_user)):
    """Get provider's own listings"""
    if current_user["role"] != "PROVIDER":
        raise HTTPException(status_code=403, detail="Only providers can access this")
    
    listings = await listing_service.get_provider_listings(current_user["id"])
    return {"listings": listings}



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
    """Check blocked dates for a listing"""
    bookings = await booking_repo.collection.find({
        "listing_id": listing_id,
        "status": {"$in": ["PENDING", "ACCEPTED"]}
    }).to_list(1000)
    
    blocked_dates = []
    for booking in bookings:
        blocked_dates.append({
            "check_in": booking.get("check_in_date", booking.get("booking_date")),
            "check_out": booking.get("check_out_date", booking.get("booking_date")),
            "status": booking["status"]
        })
    
    return {"blocked_dates": blocked_dates}


@api_router.post("/bookings/{booking_id}/review")
async def create_or_update_review(
    booking_id: str,
    req: ReviewRequest,
    current_user: dict = Depends(get_current_user)
):
    """Create or update review for a booking"""
    # Get booking details
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
    """Check blocked dates for a listing"""
    bookings = await booking_repo.collection.find({
        "listing_id": listing_id,
        "status": {"$in": ["PENDING", "ACCEPTED"]}
    }).to_list(1000)
    
    blocked_dates = []
    for booking in bookings:
        blocked_dates.append({
            "check_in": booking["check_in_date"],
            "check_out": booking["check_out_date"],
            "status": booking["status"]
        })
    
    return {"blocked_dates": blocked_dates}
async def add_review(
    listing_id: str,
    req: ReviewRequest,
    current_user: dict = Depends(get_current_user)
):
    """Add review to a listing"""
    success = await listing_service.add_review(
        listing_id=listing_id,
        user_id=current_user["id"],
        rating=req.rating,
        comment=req.comment
    )
    
    if not success:
        raise HTTPException(status_code=400, detail="Failed to add review")
    
    return {"message": "Review added successfully"}


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
