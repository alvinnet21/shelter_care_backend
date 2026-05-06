from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
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
from models.review import BookingReview, ProviderReview
from models.notification import NotificationType

BACKEND_DIR = Path(__file__).resolve().parent
ROOT_DIR = BACKEND_DIR.parent

load_dotenv(BACKEND_DIR / '.env')

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


# --- Request Models ---

class RegisterRequest(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    role: str
    question_answer: Optional[str] = None
    id_document: Optional[str] = None
    police_check: Optional[str] = None
    phone_number: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class CreateListingRequest(BaseModel):
    title: str
    description: str
    address: str
    suburb: str = ""
    postcode: str = ""
    photos: List[str]

class CreateBookingRequest(BaseModel):
    listing_id: str
    check_in_date: str
    check_out_date: str
    notes: Optional[str] = None

class RejectBookingRequest(BaseModel):
    reason: str

class ReviewRequest(BaseModel):
    rating: int
    comment: str

class UpdatePasswordRequest(BaseModel):
    old_password: str
    new_password: str

class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None
    profile_photo: Optional[str] = None
    date_of_birth: Optional[str] = None
    description: Optional[str] = None
    phone_number: Optional[str] = None

class CreateUserRequest(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    role: str
    phone_number: Optional[str] = None

class BlockDatesRequest(BaseModel):
    dates: List[str]

class UnblockDatesRequest(BaseModel):
    dates: List[str]


# --- Auth Dependency ---

async def get_current_user(authorization: Optional[str] = Header(None)):
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


# ==================== AUTH ====================

@api_router.post("/auth/register")
async def register(req: RegisterRequest):
    user = await auth_service.register(
        email=req.email, full_name=req.full_name, password=req.password,
        role=req.role, question_answer=req.question_answer,
        id_document=req.id_document, police_check=req.police_check
    )
    if not user:
        raise HTTPException(status_code=400, detail="Email already registered or invalid role")
    # Save phone number if provided
    if req.phone_number:
        await user_repo.update_user(user.id, {"phone_number": req.phone_number})
    return {"message": "User registered successfully", "user_id": user.id, "needs_verification": req.role == "PROVIDER"}

@api_router.post("/auth/login")
async def login(req: LoginRequest):
    result = await auth_service.login(req.email, req.password)
    if not result:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if "error" in result:
        raise HTTPException(status_code=403, detail=result["message"])
    return result

@api_router.post("/auth/forgot-password")
async def forgot_password(req: ForgotPasswordRequest):
    result = await auth_service.forgot_password(req.email)
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result["message"])
    return {"message": result["message"]}

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user["id"],
        "email": current_user["email"],
        "full_name": current_user["full_name"],
        "role": current_user["role"],
        "profile_photo": current_user.get("profile_photo"),
        "date_of_birth": current_user.get("date_of_birth"),
        "description": current_user.get("description"),
        "phone_number": current_user.get("phone_number"),
        "listings": current_user.get("listings", []),
        "booking_history": current_user.get("booking_history", []),
        "question_answer": current_user.get("question_answer"),
    }

@api_router.put("/auth/profile")
async def update_profile(req: UpdateProfileRequest, current_user: dict = Depends(get_current_user)):
    update_data = {}
    if req.full_name is not None:
        update_data["full_name"] = req.full_name
    if req.profile_photo is not None:
        update_data["profile_photo"] = req.profile_photo
    if req.date_of_birth is not None:
        update_data["date_of_birth"] = req.date_of_birth
    if req.description is not None:
        update_data["description"] = req.description
    if req.phone_number is not None:
        update_data["phone_number"] = req.phone_number
    if update_data:
        await user_repo.collection.update_one(
            {"id": current_user["id"]},
            {"$set": update_data}
        )
    return {"message": "Profile updated successfully"}

@api_router.put("/auth/password")
async def update_password(req: UpdatePasswordRequest, current_user: dict = Depends(get_current_user)):
    if not auth_service.verify_password(req.old_password, current_user["password"]):
        raise HTTPException(status_code=400, detail="Invalid old password")
    new_hashed = auth_service.hash_password(req.new_password)
    success = await user_repo.update_user(current_user["id"], {"password": new_hashed})
    if not success:
        raise HTTPException(status_code=400, detail="Failed to update password")
    return {"message": "Password updated successfully"}


# ==================== PUBLIC PROFILE ====================

@api_router.get("/users/{user_id}/profile")
async def get_public_profile(user_id: str):
    """Get public profile for a user"""
    user = await user_repo.find_by_id(user_id)
    if not user or user.get("deleted_at"):
        raise HTTPException(status_code=404, detail="User not found")

    profile = {
        "id": user["id"],
        "full_name": user["full_name"],
        "role": user["role"],
        "profile_photo": user.get("profile_photo"),
        "date_of_birth": user.get("date_of_birth"),
        "description": user.get("description"),
    }

    if user["role"] == "SEEKER":
        profile["phone_number"] = user.get("phone_number")
        # Fetch provider reviews about this seeker
        provider_reviews = await db.provider_reviews.find(
            {"seeker_id": user_id}, {"_id": 0}
        ).sort("created_at", -1).to_list(100)
        for r in provider_reviews:
            provider = await user_repo.find_by_id(r.get("provider_id", ""))
            r["provider_photo"] = provider.get("profile_photo") if provider else None
            r["provider_name"] = r.get("provider_name") or (provider.get("full_name") if provider else "Unknown")
        profile["provider_reviews"] = provider_reviews[:5]
    elif user["role"] == "PROVIDER":
        # Show listings (not deleted)
        listings = await listing_repo.get_listings_by_provider(user_id)
        profile["listings"] = listings
        # Last 3 reviews for provider's listings
        all_reviews = []
        for lst in listings:
            reviews = await review_repo.get_reviews_by_listing(lst["id"])
            for r in reviews:
                seeker = await user_repo.find_by_id(r["seeker_id"])
                r["seeker_photo"] = seeker.get("profile_photo") if seeker else None
                all_reviews.append(r)
        all_reviews.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        profile["last_reviews"] = all_reviews[:3]
        # No phone number for provider profile

    return profile


# ==================== ADMIN ====================

@api_router.get("/admin/stats")
async def get_admin_stats(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin access required")
    total_users = await user_repo.collection.count_documents({"deleted_at": None})
    total_bookings = await booking_repo.collection.count_documents({})
    total_listings = await listing_repo.collection.count_documents({"deleted_at": None})
    return {"total_users": total_users, "total_bookings": total_bookings, "total_listings": total_listings}

@api_router.get("/admin/users")
async def get_all_users(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin access required")
    users = await user_repo.collection.find({"deleted_at": None}, {"_id": 0, "password": 0}).to_list(10000)
    return {"users": users}

@api_router.put("/admin/users/{user_id}/delete")
async def soft_delete_user(user_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin access required")
    user = await user_repo.find_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user["role"] == "ADMIN":
        raise HTTPException(status_code=400, detail="Cannot delete admin users")
    now = datetime.now(timezone.utc).isoformat()
    await user_repo.update_user(user_id, {"deleted_at": now})
    # If provider, soft-delete their listings too
    if user["role"] == "PROVIDER":
        await listing_repo.collection.update_many(
            {"provider_id": user_id, "deleted_at": None},
            {"$set": {"deleted_at": now}}
        )
    return {"message": "User deleted successfully"}

@api_router.get("/admin/listings")
async def get_all_listings_admin(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin access required")
    listings = await listing_repo.get_all_listings_admin()
    return {"listings": listings}

@api_router.put("/admin/listings/{listing_id}/delete")
async def soft_delete_listing(listing_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin access required")
    listing = await listing_repo.get_listing_by_id(listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    now = datetime.now(timezone.utc).isoformat()
    await listing_repo.update_listing(listing_id, {"deleted_at": now})
    return {"message": "Listing taken down successfully"}

@api_router.post("/admin/users")
async def admin_create_user(req: CreateUserRequest, current_user: dict = Depends(get_current_user)):
    """Admin creates a new user (except ADMIN role)"""
    if current_user["role"] != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin access required")
    if req.role == "ADMIN":
        raise HTTPException(status_code=400, detail="Cannot create admin users")
    if req.role not in ("SEEKER", "PROVIDER", "VERIFICATOR"):
        raise HTTPException(status_code=400, detail="Invalid role")
    user = await auth_service.register(email=req.email, full_name=req.full_name, password=req.password, role=req.role)
    if not user:
        raise HTTPException(status_code=400, detail="Email already registered")
    if req.phone_number:
        await user_repo.update_user(user.id, {"phone_number": req.phone_number})
    return {"message": "User created successfully", "user_id": user.id}

@api_router.put("/admin/users/{user_id}/suspend")
async def suspend_user(user_id: str, current_user: dict = Depends(get_current_user)):
    """Suspend a user (cannot login)"""
    if current_user["role"] != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin access required")
    user = await user_repo.find_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user["role"] == "ADMIN":
        raise HTTPException(status_code=400, detail="Cannot suspend admin users")
    await user_repo.update_user(user_id, {"is_suspended": True})
    return {"message": "User suspended successfully"}

@api_router.put("/admin/users/{user_id}/unsuspend")
async def unsuspend_user(user_id: str, current_user: dict = Depends(get_current_user)):
    """Remove suspension from a user"""
    if current_user["role"] != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin access required")
    user = await user_repo.find_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await user_repo.update_user(user_id, {"is_suspended": False})
    return {"message": "User unsuspended successfully"}

@api_router.get("/admin/bookings")
async def get_all_bookings_admin(current_user: dict = Depends(get_current_user)):
    """Get all bookings for admin with seeker/provider/listing info"""
    if current_user["role"] != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin access required")
    bookings = await booking_repo.collection.find({}, {"_id": 0}).sort("created_at", -1).to_list(10000)
    for b in bookings:
        seeker = await user_repo.find_by_id(b.get("seeker_id", ""))
        provider = await user_repo.find_by_id(b.get("provider_id", ""))
        listing = await listing_repo.get_listing_by_id(b.get("listing_id", ""))
        b["seeker_email"] = seeker.get("email") if seeker else None
        b["seeker_phone"] = seeker.get("phone_number") if seeker else None
        b["provider_name"] = provider.get("full_name") if provider else None
        b["provider_email"] = provider.get("email") if provider else None
        b["listing_photo"] = listing.get("photos", [None])[0] if listing and listing.get("photos") else None
        b["listing_address"] = listing.get("address", "") if listing else ""
        b["listing_suburb"] = listing.get("suburb", "") if listing else ""
        b["listing_postcode"] = listing.get("postcode", "") if listing else ""
    return {"bookings": bookings}


# ==================== VERIFICATOR ====================

@api_router.get("/verificator/stats")
async def get_verificator_stats(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ("VERIFICATOR", "ADMIN"):
        raise HTTPException(status_code=403, detail="Verificator access required")
    total_providers = await user_repo.collection.count_documents({"role": "PROVIDER", "deleted_at": None})
    pending_verification = await user_repo.collection.count_documents({"role": "PROVIDER", "verification_status": "PENDING", "deleted_at": None})
    verified_providers = await user_repo.collection.count_documents({"role": "PROVIDER", "is_verified": True, "deleted_at": None})
    return {"total_providers": total_providers, "pending_verification": pending_verification, "verified_providers": verified_providers}

@api_router.get("/verificator/providers")
async def get_providers_for_verification(status: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ("VERIFICATOR", "ADMIN"):
        raise HTTPException(status_code=403, detail="Verificator access required")
    query = {"role": "PROVIDER", "deleted_at": None}
    if status:
        query["verification_status"] = status
    providers = await user_repo.collection.find(query, {"_id": 0, "password": 0}).to_list(10000)
    return {"providers": providers}

@api_router.put("/verificator/providers/{provider_id}/verify")
async def verify_provider(provider_id: str, action: str, reason: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ("VERIFICATOR", "ADMIN"):
        raise HTTPException(status_code=403, detail="Verificator access required")
    provider = await user_repo.find_by_id(provider_id)
    if not provider or provider["role"] != "PROVIDER":
        raise HTTPException(status_code=404, detail="Provider not found")
    if action == "APPROVE":
        update_data = {"is_verified": True, "verification_status": "APPROVED", "verified_at": datetime.now(timezone.utc).isoformat(), "verified_by": current_user["id"]}
    elif action == "REJECT":
        if not reason:
            raise HTTPException(status_code=400, detail="Rejection reason required")
        update_data = {"is_verified": False, "verification_status": "REJECTED", "verification_reason": reason, "verified_at": datetime.now(timezone.utc).isoformat(), "verified_by": current_user["id"]}
    else:
        raise HTTPException(status_code=400, detail="Invalid action")
    await user_repo.update_user(provider_id, update_data)
    msg = "Congratulations! Your provider account has been verified." if action == "APPROVE" else f"Your verification was rejected. Reason: {reason}"
    await notification_service.send_notification(user_id=provider_id, message=msg, notification_type=NotificationType.GENERAL)
    return {"message": f"Provider {action.lower()}d successfully"}


# ==================== LISTINGS ====================

@api_router.post("/listings")
async def create_listing(req: CreateListingRequest, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "PROVIDER":
        raise HTTPException(status_code=403, detail="Only providers can create listings")
    listing = await listing_service.create_listing(
        provider_id=current_user["id"], title=req.title, description=req.description,
        address=req.address, photos=req.photos, suburb=req.suburb, postcode=req.postcode
    )
    if not listing:
        raise HTTPException(status_code=400, detail="Failed to create listing")
    return {"message": "Listing created successfully", "listing": listing.model_dump()}

@api_router.get("/listings")
async def get_listings(available_only: bool = True):
    listings = await listing_service.get_all_listings(available_only)
    # Attach real review data from reviews collection
    for listing in listings:
        reviews = await review_repo.collection.find({"listing_id": listing["id"]}, {"_id": 0}).to_list(1000)
        listing["reviews"] = reviews
    return {"listings": listings}

@api_router.get("/listings/recommended")
async def get_recommended_listings():
    listings = await listing_repo.collection.find({"is_available": True, "deleted_at": None}, {"_id": 0}).to_list(1000)
    for listing in listings:
        reviews = await review_repo.collection.find({"listing_id": listing["id"]}, {"_id": 0}).to_list(1000)
        listing["reviews"] = reviews
        if reviews:
            listing["average_rating"] = round(sum(r["rating"] for r in reviews) / len(reviews), 1)
            listing["review_count"] = len(reviews)
        else:
            listing["average_rating"] = 0
            listing["review_count"] = 0
        total_bookings = await booking_repo.collection.count_documents({"listing_id": listing["id"], "status": "ACCEPTED"})
        listing["total_bookings"] = total_bookings
        review_score = min(listing["review_count"], 10) / 10 * 5
        booking_score = min(total_bookings, 20) / 20 * 5
        listing["recommendation_score"] = round((listing["average_rating"] * 0.6) + (review_score * 0.2) + (booking_score * 0.2), 2)
    return {"listings": sorted(listings, key=lambda x: x["recommendation_score"], reverse=True)}

@api_router.get("/listings/provider/me")
async def get_my_listings(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "PROVIDER":
        raise HTTPException(status_code=403, detail="Only providers can access this")
    listings = await listing_service.get_provider_listings(current_user["id"])
    # Attach real reviews from reviews collection
    for listing in listings:
        reviews = await review_repo.collection.find({"listing_id": listing["id"]}, {"_id": 0}).to_list(1000)
        listing["reviews"] = reviews
    return {"listings": listings}

@api_router.get("/listings/{listing_id}")
async def get_listing(listing_id: str):
    listing = await listing_service.get_listing_detail(listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    # Attach provider info
    provider = await user_repo.find_by_id(listing["provider_id"])
    if provider:
        listing["provider_photo"] = provider.get("profile_photo")
    # Attach real reviews from reviews collection (last 5, with seeker info)
    reviews = await review_repo.collection.find(
        {"listing_id": listing_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    for r in reviews:
        seeker = await user_repo.find_by_id(r.get("seeker_id", ""))
        r["seeker_photo"] = seeker.get("profile_photo") if seeker else None
        r["seeker_name"] = r.get("seeker_name") or (seeker.get("full_name") if seeker else "Unknown")
    listing["reviews"] = reviews[:5]
    listing["review_count"] = len(reviews)
    return listing

@api_router.put("/listings/{listing_id}/block-dates")
async def block_dates(listing_id: str, start_date: str, end_date: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "PROVIDER":
        raise HTTPException(status_code=403, detail="Only providers can block dates")
    listing = await listing_repo.get_listing_by_id(listing_id)
    if not listing or listing["provider_id"] != current_user["id"]:
        raise HTTPException(status_code=404, detail="Listing not found")
    from models.booking import Booking
    blocked_booking = Booking(seeker_id="SYSTEM_BLOCK", seeker_name="Unavailable (Provider Block)", provider_id=current_user["id"], listing_id=listing_id, listing_title=listing["title"], booking_date=datetime.fromisoformat(start_date), check_in_date=datetime.fromisoformat(start_date), check_out_date=datetime.fromisoformat(end_date), status="ACCEPTED")
    await booking_repo.create_booking(blocked_booking)
    return {"message": "Dates blocked successfully"}

@api_router.put("/listings/{listing_id}")
async def update_listing(listing_id: str, title: Optional[str] = None, description: Optional[str] = None, address: Optional[str] = None, suburb: Optional[str] = None, postcode: Optional[str] = None, photos: Optional[List[str]] = None, is_available: Optional[bool] = None, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "PROVIDER":
        raise HTTPException(status_code=403, detail="Only providers can update listings")
    listing = await listing_repo.get_listing_by_id(listing_id)
    if not listing or listing["provider_id"] != current_user["id"]:
        raise HTTPException(status_code=404, detail="Listing not found")
    update_data = {}
    for key, val in [("title", title), ("description", description), ("address", address), ("suburb", suburb), ("postcode", postcode), ("photos", photos), ("is_available", is_available)]:
        if val is not None:
            update_data[key] = val
    if update_data:
        await listing_repo.update_listing(listing_id, update_data)
    return {"message": "Listing updated successfully"}

@api_router.get("/listings/{listing_id}/availability")
async def check_availability(listing_id: str):
    bookings = await booking_repo.collection.find({"listing_id": listing_id, "status": {"$in": ["PENDING", "ACCEPTED"]}}).to_list(1000)
    blocked_dates = []
    for booking in bookings:
        blocked_dates.append({"check_in": booking.get("check_in_date", booking.get("booking_date")), "check_out": booking.get("check_out_date", booking.get("booking_date")), "status": booking["status"], "type": "system_block" if booking.get("seeker_id") == "SYSTEM_BLOCK" else "booking"})
    listing = await listing_repo.get_listing_by_id(listing_id)
    if listing and listing.get("manual_blocked_dates"):
        for date in listing["manual_blocked_dates"]:
            blocked_dates.append({"check_in": date, "check_out": date, "status": "BLOCKED", "type": "manual"})
    return {"blocked_dates": blocked_dates}

@api_router.post("/listings/{listing_id}/block-dates")
async def block_listing_dates(listing_id: str, req: BlockDatesRequest, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "PROVIDER":
        raise HTTPException(status_code=403, detail="Only providers can block dates")
    listing = await listing_repo.get_listing_by_id(listing_id)
    if not listing or listing["provider_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    existing_blocked = listing.get("manual_blocked_dates", [])
    new_blocked = list(set(existing_blocked + req.dates))
    await listing_repo.collection.update_one({"id": listing_id}, {"$set": {"manual_blocked_dates": new_blocked}})
    return {"message": "Dates blocked successfully", "blocked_dates": new_blocked}

@api_router.post("/listings/{listing_id}/unblock-dates")
async def unblock_listing_dates(listing_id: str, req: UnblockDatesRequest, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "PROVIDER":
        raise HTTPException(status_code=403, detail="Only providers can unblock dates")
    listing = await listing_repo.get_listing_by_id(listing_id)
    if not listing or listing["provider_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    existing_blocked = listing.get("manual_blocked_dates", [])
    new_blocked = [d for d in existing_blocked if d not in req.dates]
    await listing_repo.collection.update_one({"id": listing_id}, {"$set": {"manual_blocked_dates": new_blocked}})
    return {"message": "Dates unblocked successfully", "blocked_dates": new_blocked}


# ==================== BOOKINGS ====================

@api_router.post("/bookings")
async def create_booking(req: CreateBookingRequest, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "SEEKER":
        raise HTTPException(status_code=403, detail="Only seekers can create bookings")
    try:
        check_in = datetime.fromisoformat(req.check_in_date)
        check_out = datetime.fromisoformat(req.check_out_date)
        if check_out <= check_in:
            raise HTTPException(status_code=400, detail="Check-out must be after check-in")
        existing_bookings = await booking_repo.collection.find({"listing_id": req.listing_id, "status": {"$in": ["PENDING", "ACCEPTED"]}}).to_list(1000)
        for existing in existing_bookings:
            existing_in = datetime.fromisoformat(existing["check_in_date"])
            existing_out = datetime.fromisoformat(existing["check_out_date"])
            if not (check_out <= existing_in or check_in >= existing_out):
                raise HTTPException(status_code=400, detail="Selected dates are not available")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")
    booking = await booking_service.create_booking(seeker_id=current_user["id"], listing_id=req.listing_id, check_in_date=check_in, check_out_date=check_out)
    if not booking:
        raise HTTPException(status_code=400, detail="Failed to create booking")
    # Save notes if provided
    if req.notes:
        await booking_repo.collection.update_one({"id": booking.id}, {"$set": {"notes": req.notes}})
    return {"message": "Booking created successfully", "booking": booking.model_dump()}

@api_router.get("/bookings/me")
async def get_my_bookings(status_filter: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Get user's bookings with optional status filter"""
    if current_user["role"] == "SEEKER":
        bookings = await booking_service.get_user_bookings(current_user["id"])
    elif current_user["role"] == "PROVIDER":
        bookings = await booking_service.get_provider_bookings(current_user["id"])
    elif current_user["role"] == "ADMIN":
        bookings = await booking_repo.collection.find({}, {"_id": 0}).to_list(10000)
    else:
        raise HTTPException(status_code=403, detail="Invalid role")

    # Filter by status if provided
    if status_filter:
        statuses = status_filter.split(",")
        bookings = [b for b in bookings if b.get("status") in statuses]

    # Enrich with seeker phone for provider view
    if current_user["role"] == "PROVIDER":
        for b in bookings:
            seeker = await user_repo.find_by_id(b.get("seeker_id", ""))
            b["seeker_phone"] = seeker.get("phone_number") if seeker else None
            b["seeker_photo"] = seeker.get("profile_photo") if seeker else None

    return {"bookings": bookings}

@api_router.post("/bookings/{booking_id}/review")
async def create_or_update_review(booking_id: str, req: ReviewRequest, current_user: dict = Depends(get_current_user)):
    booking = await booking_repo.get_booking_by_id(booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking["seeker_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="You can only review your own bookings")
    if booking["status"] != "ACCEPTED":
        raise HTTPException(status_code=400, detail="You can only review accepted bookings")
    existing_review = await review_repo.get_review_by_booking(booking_id)
    if existing_review:
        await review_repo.update_review(booking_id, req.rating, req.comment)
        await booking_repo.collection.update_one({"id": booking_id}, {"$set": {"has_review": True}})
        return {"message": "Review updated successfully", "is_new": False}
    else:
        review = BookingReview(booking_id=booking_id, listing_id=booking["listing_id"], seeker_id=current_user["id"], seeker_name=current_user["full_name"], rating=req.rating, comment=req.comment)
        await review_repo.create_review(review)
        await booking_repo.collection.update_one({"id": booking_id}, {"$set": {"has_review": True}})
        return {"message": "Review created successfully", "is_new": True}

@api_router.get("/bookings/{booking_id}/review")
async def get_booking_review(booking_id: str, current_user: dict = Depends(get_current_user)):
    booking = await booking_repo.get_booking_by_id(booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking["seeker_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    review = await review_repo.get_review_by_booking(booking_id)
    if not review:
        return {"has_review": False, "review": None}
    return {"has_review": True, "review": review}

@api_router.post("/bookings/{booking_id}/provider-review")
async def create_or_update_provider_review(booking_id: str, req: ReviewRequest, current_user: dict = Depends(get_current_user)):
    """Provider reviews a seeker for a booking"""
    if current_user["role"] != "PROVIDER":
        raise HTTPException(status_code=403, detail="Only providers can review seekers")
    booking = await booking_repo.get_booking_by_id(booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking["provider_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="You can only review bookings for your listings")
    if booking["status"] != "ACCEPTED":
        raise HTTPException(status_code=400, detail="You can only review accepted bookings")
    existing = await db.provider_reviews.find_one({"booking_id": booking_id}, {"_id": 0})
    if existing:
        await db.provider_reviews.update_one({"booking_id": booking_id}, {"$set": {"rating": req.rating, "comment": req.comment, "updated_at": datetime.now(timezone.utc).isoformat()}})
        await booking_repo.collection.update_one({"id": booking_id}, {"$set": {"has_provider_review": True}})
        return {"message": "Review updated successfully", "is_new": False}
    else:
        review = ProviderReview(booking_id=booking_id, listing_id=booking["listing_id"], seeker_id=booking["seeker_id"], provider_id=current_user["id"], provider_name=current_user["full_name"], rating=req.rating, comment=req.comment)
        review_dict = review.model_dump()
        review_dict["created_at"] = review_dict["created_at"].isoformat()
        review_dict["updated_at"] = review_dict["updated_at"].isoformat()
        await db.provider_reviews.insert_one(review_dict)
        await booking_repo.collection.update_one({"id": booking_id}, {"$set": {"has_provider_review": True}})
        return {"message": "Review created successfully", "is_new": True}

@api_router.get("/bookings/{booking_id}/provider-review")
async def get_provider_review(booking_id: str, current_user: dict = Depends(get_current_user)):
    """Get provider's review for a booking"""
    booking = await booking_repo.get_booking_by_id(booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking["provider_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    review = await db.provider_reviews.find_one({"booking_id": booking_id}, {"_id": 0})
    if not review:
        return {"has_review": False, "review": None}
    return {"has_review": True, "review": review}

@api_router.put("/bookings/{booking_id}/accept")
async def accept_booking(booking_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "PROVIDER":
        raise HTTPException(status_code=403, detail="Only providers can accept bookings")
    success = await booking_service.accept_booking(booking_id, current_user["id"])
    if not success:
        raise HTTPException(status_code=400, detail="Failed to accept booking")
    return {"message": "Booking accepted successfully"}

@api_router.put("/bookings/{booking_id}/reject")
async def reject_booking(booking_id: str, req: RejectBookingRequest, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "PROVIDER":
        raise HTTPException(status_code=403, detail="Only providers can reject bookings")
    success = await booking_service.reject_booking(booking_id, current_user["id"], req.reason)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to reject booking")
    return {"message": "Booking rejected successfully"}

@api_router.put("/bookings/{booking_id}/cancel")
async def cancel_booking(booking_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "SEEKER":
        raise HTTPException(status_code=403, detail="Only seekers can cancel bookings")
    booking = await booking_repo.get_booking_by_id(booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking["seeker_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="You can only cancel your own bookings")
    if booking["status"] != "PENDING":
        raise HTTPException(status_code=400, detail="Only pending bookings can be cancelled")
    await booking_repo.update_booking_status(booking_id, BookingStatus.CANCELLED, "Cancelled by seeker")
    await notification_service.send_notification(user_id=booking["provider_id"], message=f"Booking for {booking['listing_title']} has been cancelled by the seeker.", notification_type=NotificationType.BOOKING_CANCELLED)
    return {"message": "Booking cancelled successfully"}


# ==================== NOTIFICATIONS ====================

@api_router.get("/notifications")
async def get_notifications(current_user: dict = Depends(get_current_user)):
    notifications = await notification_service.get_user_notifications(current_user["id"])
    return {"notifications": notifications}

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: dict = Depends(get_current_user)):
    success = await notification_service.mark_notification_read(notification_id)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to mark as read")
    return {"message": "Notification marked as read"}

@api_router.put("/notifications/read-all")
async def mark_all_read(current_user: dict = Depends(get_current_user)):
    await notification_service.mark_all_read(current_user["id"])
    return {"message": "All notifications marked as read"}


# ==================== APP CONFIG ====================

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def seed_default_users():
    """Create default Admin and Verificator users if they don't exist"""
    seed_users = [
        {"email": "admin@gmail.com", "full_name": "Admin", "password": "123456", "role": "ADMIN"},
        {"email": "verificator@gmail.com", "full_name": "Verificator", "password": "123456", "role": "VERIFICATOR"},
    ]
    for u in seed_users:
        existing = await user_repo.find_by_email(u["email"])
        if not existing:
            await auth_service.register(
                email=u["email"], full_name=u["full_name"],
                password=u["password"], role=u["role"]
            )
            logger.info(f"Seeded default user: {u['email']} ({u['role']})")
        else:
            logger.info(f"Default user already exists: {u['email']}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

app.mount("/static", StaticFiles(directory=ROOT_DIR / "static"), name="static")

@app.get("/")
async def serve_frontend():
    return FileResponse(ROOT_DIR / "index.html")

@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    requested = ROOT_DIR / full_path
    if requested.exists() and requested.is_file():
        return FileResponse(requested)
    return FileResponse(ROOT_DIR / "index.html")
