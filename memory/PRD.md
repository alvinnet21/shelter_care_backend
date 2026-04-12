# ShelterLink PRD

## Original Problem Statement
Modify ShelterLink backend + frontend with the following features:
1. Provider cannot login if not verified by Verificator (show notification)
2. Forgot password feature - sends random password to email
3. All UI/messages in English
4. Cancel booking for Shelter Seeker if status is PENDING
5. Provider registration requires Police Check upload (JPEG/PNG)
6. Auto-block calendar when shelter is accepted/booked or blocked by provider

## Architecture
- **Backend:** FastAPI (Python) with MongoDB (Motor async driver)
- **Frontend:** React 19 with Tailwind CSS, Radix UI, React Router
- **Email:** Gmail SMTP with App Password
- **Auth:** JWT-based authentication with bcrypt password hashing
- **Structure:** Clean Architecture (models, repositories, services, server)

## User Personas
- **Shelter Seeker:** Browse listings, book shelters, cancel pending bookings, leave reviews
- **Shelter Provider:** Create/manage listings, accept/reject bookings, block dates
- **Verificator:** Approve/reject provider verification (view ID + Police Check)
- **Admin:** View system statistics and all users

## Core Requirements (Static)
- Multi-role authentication system (SEEKER, PROVIDER, VERIFICATOR, ADMIN)
- Listing management with photos
- Booking workflow (create, accept, reject, cancel)
- Review system
- Notification system
- Provider verification workflow

## What's Been Implemented (2026-04-12)
1. **Provider Login Verification:** Provider cannot login if `is_verified=false`. Returns 403 with specific error message (pending/rejected).
2. **Forgot Password:** `POST /api/auth/forgot-password` generates random password, sends via Gmail SMTP, stores hashed version.
3. **English UI:** All Indonesian text converted to English across all frontend pages (VerificatorDashboard, MyListingsPage, etc.)
4. **Cancel Booking:** `PUT /api/bookings/{id}/cancel` for SEEKER role, only PENDING status. Added CANCELLED booking status. Cancel button on BookingsPage.
5. **Police Check Upload:** Added `police_check` field to Provider model and registration. Verificator can view both ID and Police Check in modal viewer.
6. **Calendar Blocking:** Existing bookings (ACCEPTED + PENDING) block calendar dates. ListingDetailPage shows blocked dates with color-coded badges (Booked/Pending/Provider Block).

## Testing Status
- Backend: 100% pass (8/8 API tests)
- Frontend: 95% pass (all features working)

## Prioritized Backlog
### P0 (Done)
- All 6 requested features implemented and tested

### P1 (Next)
- Email template customization
- Password strength validation enhancement
- Auto-reject conflicting bookings when one is accepted

### P2 (Future)
- Push notification system
- Real-time chat between seeker and provider
- Map-based shelter search
- Admin dashboard with full user management
