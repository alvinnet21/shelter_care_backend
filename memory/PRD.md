# ShelterLink PRD

## Original Problem Statement
Major update to ShelterLink with admin management, dashboard redesign, profile system, address splitting, phone numbers, and public profile pages.

## Architecture
- **Backend:** FastAPI (Python) with MongoDB (Motor async driver)
- **Frontend:** React 19 with Tailwind CSS, Radix UI, React Router
- **Email:** Gmail SMTP with App Password
- **Auth:** JWT with bcrypt, soft-delete support

## What's Been Implemented

### Phase 1 (2026-04-12)
1. Provider Login Verification (403 if unverified)
2. Forgot Password (Gmail SMTP)
3. English UI throughout
4. Cancel Booking (SEEKER, PENDING only)
5. Police Check Upload for Provider registration
6. Calendar Blocking (react-day-picker with disabled dates)

### Phase 2 (2026-04-12) - Current
1. **Admin Dashboard** - Stats: Total Users/Bookings/Listings. Tabs: Overview, User Management (soft delete), Listing Management (takedown). Verificator Panel link.
2. **Soft Delete** - Users get `deleted_at` field. Deleted users can't login. Deleting Provider also soft-deletes their listings.
3. **Seeker Dashboard** - No stats cards. Quick actions: Browse Shelters, My Bookings.
4. **Provider Dashboard** - Quick actions: My Listings, Requests (pending bookings), Bookings (history).
5. **Provider Bookings** - Split into Requests tab (PENDING) and History tab (ACCEPTED/REJECTED/CANCELLED). Shows seeker phone number.
6. **Address Split** - Listing address separated into Address, Suburb, Postcode (3 fields).
7. **User Profile** - Photo upload from computer (base64), Name, DOB, Description, Phone (+61 prefix for Provider/Seeker).
8. **Phone Number Rules** - Provider phone: only visible to themselves. Seeker phone: visible in provider booking requests.
9. **Listing Detail** - "Who owns this space" section with provider photo + name (clickable to profile page).
10. **Public Profile Page** - `/profile/:id` route. Shows Image, Name, DOB, Description. Seeker: shows phone. Provider: shows listings + last 3 reviews (no phone).

## Prioritized Backlog
### P1
- Push notification system (real-time)
- Search/filter for listings
- Map integration for shelter locations

### P2
- Real-time chat between seeker and provider
- Email notifications for booking status changes
- Admin analytics dashboard with charts
