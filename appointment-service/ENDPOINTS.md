# Appointment Service — HTTP Endpoints (Exact URIs)

Replace host/port if your `.env` differs. Defaults used below:

| Call style | Base URL | Full path rule |
|------------|----------|----------------|
| **Direct to appointment-service** | `http://localhost:3004` | `{BASE_DIRECT}{path}` |
| **Through API gateway** | `http://localhost:3001/api/appointments` | `{BASE_GATEWAY}{path}` |
| **Kubernetes Internal DNS** | `http://appointment-service:3004` | `{BASE_K8S}{path}` |

Paths are identical for all; only the host (and gateway port/structure) changes. Gateway forwards anything under `/api/appointments` to appointment-service natively.

**Auth headers (gateway users):**

- `x-user-id` — subject from identity provider  
- `x-user-role` — one of `patient`, `doctor`, `admin` (as your gateway sets them)

**Placeholders in examples:**

- `{id}` — Appointment MongoDB `_id` (24-char hex ObjectId)
- `{doctorId}` — Doctor's auth user ID (used for fetching slots)

---

## Appointments

All routes use `AuthGuard` which extracts `x-user-id` and `x-user-role` from the request and enforces role-based access.

### Book a new appointment (Patient Only)

- **Direct:** `POST http://localhost:3004/appointments`
- **Gateway:** `POST http://localhost:3001/api/appointments`

**Auth:** `x-user-role` must be **`patient`**.

**Body:**
```json
{
  "doctorId": "doctor_auth_id",
  "slotStart": "2026-04-20T09:00:00.000Z",
  "reasonForVisit": "Headache and fever"
}
```

**Notes:**
- `slotStart` must be an ISO 8601 UTC string aligned to :00 or :30 minute boundaries (30-minute slots).
- Service internally calls Doctor Service `validate-slot` to verify doctor availability.
- Fails with 409 if there's a conflict (doctor is booked or patient has another booking at that time).

### List appointments

- **Direct:** `GET http://localhost:3004/appointments`
- **Gateway:** `GET http://localhost:3001/api/appointments`

**Auth:** All roles (Behavior depends on role).

**Query Parameters:**
- `filter` (optional): `PAST`, `CURRENT`, or `UPCOMING`

**Behavior:**
- **PATIENT:** Sees only their own bookings.
- **DOCTOR:** Sees appointments assigned to them.
- **ADMIN:** Can view all appointments.

### Get available slots for a doctor

- **Direct:** `GET http://localhost:3004/appointments/available-slots/{doctorId}?from={fromIso}&to={toIso}`
- **Gateway:** `GET http://localhost:3001/api/appointments/available-slots/{doctorId}?from={fromIso}&to={toIso}`

**Auth:** Any authenticated user.

**Description:**
Proxies to the Doctor Service's `free-slots` integration endpoint. Maintains distribution transparency so the frontend does not need to call the Doctor Service directly.

**Response:**
```json
{
  "slots": ["2026-04-20T09:00:00.000Z", "2026-04-20T09:30:00.000Z"]
}
```

### Get a specific appointment

- **Direct:** `GET http://localhost:3004/appointments/{id}`
- **Gateway:** `GET http://localhost:3001/api/appointments/{id}`

**Auth:** All roles (must own the appointment or be admin).

### Accept or reject appointment (Doctor Only)

- **Direct:** `PATCH http://localhost:3004/appointments/{id}/status`
- **Gateway:** `PATCH http://localhost:3001/api/appointments/{id}/status`

**Auth:** `x-user-role` must be **`doctor`**. Must be the assigned doctor.

**Body:**
```json
{
  "status": "CONFIRMED" // or "REJECTED"
}
```

**Notes:**
- If status is `CONFIRMED`, the service will automatically generate a telemedicine video link using the Telemedicine Service.

### Modify or cancel appointment (Patient Only)

- **Direct:** `PATCH http://localhost:3004/appointments/{id}`
- **Gateway:** `PATCH http://localhost:3001/api/appointments/{id}`

**Auth:** `x-user-role` must be **`patient`**. Must own the appointment.

**Body (Partial update allowed):**
```json
{
  "slotStart": "2026-04-21T10:00:00.000Z",
  "reasonForVisit": "Updated reason",
  "status": "CANCELLED" // To explicitly cancel
}
```

**Notes:**
- Only `PENDING` and `CONFIRMED` appointments can be modified/cancelled.
- If `slotStart` is changed, the appointment status resets to `PENDING` and requires doctor re-confirmation. It will also trigger availability validation via Doctor Service again.
