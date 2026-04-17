# Appointment Service — HTTP Endpoints (Exact URIs)

Replace host/port if your `.env` differs. Defaults used below:

| Call style                        | Base URL                          | Full path rule         |
| --------------------------------- | --------------------------------- | ---------------------- |
| **Direct to appointment-service** | `http://localhost:3004`           | `{BASE_DIRECT}{path}`  |
| **Through API gateway**           | `http://localhost:3001/api/appointments` | `{BASE_GATEWAY}{path}` |
| **Kubernetes Internal DNS**       | `http://appointment-service:3004` | `{BASE_K8S}{path}`     |

Paths are identical for all; only the host (and gateway port/structure) changes. Gateway forwards anything under `/api/appointments` to appointment-service natively.

**Auth headers (gateway users):**

- `x-user-id` — subject from identity provider
- `x-user-role` — one of `PATIENT`, `DOCTOR`, `ADMIN`

**Placeholders in examples:**

- `{id}` — Appointment MongoDB `_id` (24-char hex ObjectId)
- `{doctorId}` — Doctor's auth user ID (used for fetching slots)

---

## Appointments

Routes in this controller validate header presence (`x-user-id`, `x-user-role`) and then enforce role/ownership rules in use cases.

### Appointment response visibility rules

For endpoints that return appointment objects (`POST /appointments`, `GET /appointments`, `GET /appointments/{id}`, `PATCH /appointments/{id}`):

- Shared fields are returned: `id`, `patientId`, `doctorId`, `slotStart`, `status`, `reasonForVisit`, `paymentStatus`, and `paymentTransactionId` (when available).
- **DOCTOR** callers receive only `telemedicineLinkDoctor`.
- **PATIENT** callers receive only `telemedicineLinkPatient`.
- **ADMIN** callers receive both telemedicine links.

### Book a new appointment (Patient Only)

- **Direct:** `POST http://localhost:3004/appointments`
- **Gateway:** `POST http://localhost:3001/api/appointments`

**Auth:** `x-user-role` must be **`PATIENT`**.

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

**Auth:** No role-specific check in this controller method; typically consumed via gateway-authenticated calls.

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

### Accept or reject appointment (Currently inactive)

- **Direct:** `PATCH http://localhost:3004/appointments/{id}/status`
- **Gateway:** `PATCH http://localhost:3001/api/appointments/{id}/status`

**Auth:** `x-user-role` would need to be **`DOCTOR`** and assigned to the appointment.

**Current status:** This route is currently commented out and not reachable. Manual doctor status updates are disabled in code; appointment confirmation is handled by payment webhook flow.

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

**Auth:** `x-user-role` must be **`PATIENT`**. Must own the appointment.

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
- If `slotStart` is changed, slot availability validation is re-run via Doctor Service. Status is then determined by payment confirmation state (can remain `PENDING` or become `CONFIRMED`).

### Payment webhook (Internal system route)

- **Direct:** `POST http://localhost:3004/appointments/webhook/payment`
- **Gateway:** `POST http://localhost:3001/api/appointments/webhook/payment`

**Auth:** Internal system-to-system call (Payment Service -> Appointment Service). This controller method does not currently enforce header-based auth, so restrict access via gateway/network policy.

**Body:**

```json
{
  "appointmentId": "67f77a6c1e2f4e6e2a1b9a01",
  "status": "CONFIRMED",
  "transactionId": "txn_12345abcde"
}
```

**Notes:**

- `status` supports `CONFIRMED` or `FAILED`.
- If `status=CONFIRMED`: payment status is updated to `CONFIRMED`, appointment status moves to `CONFIRMED`, and telemedicine links are generated.
- If `status=FAILED`: payment status is updated to `FAILED`; appointment status remains `PENDING`.
