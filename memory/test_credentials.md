# ShelterLink Test Credentials

## Admin (Default Seed)
- **Email:** admin@gmail.com
- **Password:** 123456
- **Role:** ADMIN

## Verificator (Default Seed)
- **Email:** verificator@gmail.com
- **Password:** 123456
- **Role:** VERIFICATOR

## Admin (Legacy)
- **Email:** admin@test.com
- **Password:** password123
- **Role:** ADMIN

## Seeker
- **Email:** seeker2@test.com
- **Password:** password123
- **Role:** SEEKER

## Seeker (with phone)
- **Email:** seeker3@test.com
- **Password:** password123
- **Role:** SEEKER
- **Phone:** +61412345678

## Provider (Verified)
- **Email:** provider@test.com
- **Password:** password123
- **Role:** PROVIDER
- **Verification Status:** APPROVED

## Verificator (Legacy)
- **Email:** verificator@test.com
- **Password:** password123
- **Role:** VERIFICATOR

## Notes
- Default Admin and Verificator are auto-seeded on backend startup if they don't exist
- Provider requires ID Document + Police Check upload during registration
- Provider cannot login until approved by Verificator/Admin
- Admin can soft-delete users and listings
- Deleted users cannot login
