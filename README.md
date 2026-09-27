# EVE Diagnostic Booking API

Backend service for diagnostic test bookings with simulated payments.

**Stack:** Node.js, Express, MongoDB (Mongoose), JWT Auth

> Built with Node/Express/MongoDB instead of the preferred Python/PostgreSQL stack — this is what I have production experience with, so I could focus on API design and edge cases rather than learning a new framework mid-assignment.

## Run Locally

```bash
git clone <repo-url>
cd eve-diagnostic-booking
npm install
```

Create `.env` (see `.env.example`):
```
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/eve_diagnostic
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=1h
```

```bash
npm run dev
```

Runs at `http://localhost:5000`. MongoDB must be running locally (or use an Atlas URI).

## Schema

| Model | Key Fields |
|---|---|
| User | email (unique), password (hashed) |
| DiagnosticCentre | name, location |
| DiagnosticTest | centre (ref), name, price |
| Booking | user, test, centre (refs), appointmentDateTime, amount, status |
| Payment | booking (ref), amount, status, providerPaymentId (unique) |
| WebhookEvent | eventId (unique), payload, processed |

`amount` is copied onto the Booking at creation time, so a later price change at the centre doesn't affect an existing booking. `providerPaymentId` and `WebhookEvent.eventId` are unique-indexed — that's what enforces idempotency at the DB level.

## Endpoints

| Method | Route | Auth | Body |
|---|---|---|---|
| POST | `/auth/signup` | – | email, password, fullName |
| POST | `/auth/login` | – | email, password → `{ token }` |
| GET | `/centres` | – | – |
| POST | `/centres` | ✓ | name, location |
| POST | `/centres/:id/tests` | ✓ | name, price |
| POST | `/bookings` | ✓ | test_id, centre_id, appointment_datetime |
| GET | `/bookings`, `/bookings/:id` | ✓ | – |
| PATCH | `/bookings/:id/cancel` | ✓ | – |
| POST | `/payments` | ✓ | booking_id → simulates SUCCESS/FAILED |
| POST | `/payments/webhook` | – | event_id, provider_payment_id, booking_id, status |

Example:
```
POST /bookings
Authorization: Bearer <token>

{ "test_id": "...", "centre_id": "...", "appointment_datetime": "2026-10-05T10:00:00Z" }
```

## Webhook Idempotency

Two layers:
1. **Event-level:** `event_id` is inserted into `WebhookEvent` first, guarded by a unique index. A repeat `event_id` hits a duplicate-key error and returns `200` with no further action.
2. **State-level:** if the booking is already `CONFIRMED`/`FAILED`, the webhook is acknowledged but not reapplied.

This stops duplicate payments/bookings even if the provider retries the same event.

## Edge Cases Handled

- Invalid ObjectIds → `400`, not a crash
- Booking a test not offered at the given centre → rejected
- Past appointment dates → rejected
- Viewing/cancelling another user's booking → `403`
- Paying for an already-confirmed/cancelled booking → rejected
- Duplicate webhook events → ignored safely
- Duplicate signup email → rejected
- Missing/invalid JWT → `401`

## Assumptions

- Any authenticated user can create centres/tests (no separate admin role yet)
- Payment outcome is randomly simulated (~70% success), no real gateway
- Webhook isn't signature-verified since there's no real provider

## With More Time

- Jest/Supertest tests (started with `mongodb-memory-server`, dropped it — binary download was unreliable on my network; would fix via Docker-based test DB instead)
- Admin role for centre/test management
- Rate limiting on `/auth/login` and `/payments/webhook`
- Retry/backoff for webhook processing
- Docker + docker-compose, Swagger docs, pagination
