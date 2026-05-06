# Test Credentials

## Seeded by backend startup
| Role | Email | Password |
| --- | --- | --- |
| ADMIN | admin@gmail.com | 123456 |
| VERIFICATOR | verificator@gmail.com | 123456 |

## Test users created during development / testing
| Role | Email | Password | Notes |
| --- | --- | --- | --- |
| SEEKER | seeker_test@gmail.com | 123456 | Manual test of chatbot widget |

## How to test PROVIDER flow
1. Register a new PROVIDER via `POST /api/auth/register` (role=PROVIDER) — registration succeeds but login is blocked until verified.
2. Login as VERIFICATOR (`verificator@gmail.com / 123456`) and call `PUT /api/verificator/providers/{id}/verify?action=APPROVE` to approve.
3. Login as the new provider to access PROVIDER chatbot.

## Notes
- Chatbot endpoints (`/api/chatbot/*`) require Bearer token from login response.
- ADMIN & VERIFICATOR receive 403 when calling chatbot endpoints (by design).
