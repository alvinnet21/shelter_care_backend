# ShelterLink PRD

## Original Problem Statement
Update Backend dan Frontend di Project ShelterLink:
- Remove Overview menu, go directly to User Management
- Add Accept/Reject for Provider Role with Pending status, view police check and ID
- Add search by Name in User Management
- Add Search By Title in Listing Management
- Fix back navigation from User detail → Admin Panel (User Management)
- Fix back navigation from Listing detail → Admin Panel (Listing Management)
- Hide DOB and description for ADMIN and VERIFICATOR roles in Settings
- Move Back button to right of ShelterLink text in header
- Remove filter in listings (show available only)
- Replace Profile Page with Pop-up Window (Image, Name, DOB, Description, Seeker=phone, Provider=listings+reviews no phone, empty='-')

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

### Phase 2 (2026-04-12)
1. Admin Dashboard with tabs, stats, user/listing management
2. Soft Delete for users and listings
3. Seeker/Provider Dashboard redesigns
4. Address Split (Address, Suburb, Postcode)
5. User Profile with photo, DOB, Description, Phone
6. Public Profile Page with role-based content

### Phase 3 (2026-04-16) - Current
1. **Admin Dashboard Redesign** - Removed Overview tab, defaults to User Management
2. **Provider Accept/Reject in Admin** - Admin can approve/reject PENDING providers directly, view ID doc and police check
3. **User Management Search** - Search by Name in admin user list
4. **Listing Management Search** - Search by Title in admin listing list
5. **Navigation Fixes** - Listing detail back → Admin Panel (Listing Management tab) via location state
6. **Settings Conditional Fields** - DOB and description hidden for ADMIN/VERIFICATOR roles
7. **Navbar Back Button Moved** - Back button placed right of ShelterLink text instead of right side nav
8. **Listings Filter Removed** - Show available only filter and checkbox removed
9. **Profile Page → Modal** - Replaced `/profile/:id` route with popup modal (ProfileModalContext + ProfileModal component). Shows Image, Name, DOB, Description. Seeker: phone. Provider: listings + last review (no phone). Missing data shows '-'

## Prioritized Backlog
### P1
- Push notification system (real-time)
- Map integration for shelter locations

### P2
- Real-time chat between seeker and provider
- Email notifications for booking status changes
- Admin analytics dashboard with charts
