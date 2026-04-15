# doctor-service — HTTP endpoints (exact URIs)

Replace host/port if your `.env` differs. Defaults used below:

| Call style | Base URL | Full path rule |
|------------|----------|----------------|
| **Direct to doctor-service** | `http://localhost:3003` | `{BASE_DIRECT}{path}` |
| **Through API gateway** | `http://localhost:3001` | `{BASE_GATEWAY}{path}` |

Paths are identical for both; only the host (and gateway port) changes. Gateway forwards anything under `/doctors` to doctor-service.

**Auth headers (gateway users):**

- `x-user-id` — subject from identity provider  
- `x-user-role` — one of `patient`, `doctor`, `admin` (as your gateway sets them)

**Integration / service calls:** `X-Service-Api-Key` matching `SERVICE_API_KEY` (when set) **or** `x-user-id` + `x-user-role`.

**Placeholders in examples:**

- `{id}` — doctor MongoDB `_id` (24-char hex ObjectId)
- `{prescriptionId}` — prescription MongoDB `_id`
- `{patientId}` — patient MongoDB `_id`
- `{doctorUserId}` — doctor’s auth user id (same value as `doctorId` in appointment-service)
- `{date}` — `YYYY-MM-DD`

---

## Doctor profiles

All routes use `GatewayAuthGuard` + `RolesGuard`. Admin-only routes need `x-user-role: admin`.

### List approved doctors

- **Direct:** `GET http://localhost:3003/doctors`
- **Gateway:** `GET http://localhost:3001/doctors`

Returns doctors with `isApproved: true`.

**Filter by specialization** (case-insensitive substring match on the `specialization` field):

- **Direct:** `GET http://localhost:3003/doctors?specialization=Cardiology`
- **Gateway:** `GET http://localhost:3001/doctors?specialization=cardio`

Omit `specialization` to return all approved doctors.

### Get one doctor by id

- **Direct:** `GET http://localhost:3003/doctors/{id}`
- **Gateway:** `GET http://localhost:3001/doctors/{id}`

Example: `GET http://localhost:3003/doctors/507f1f77bcf86cd799439011`

Unapproved profiles return 404 unless caller is that doctor or admin.

### Register doctor profile

- **Direct:** `POST http://localhost:3003/doctors`
- **Gateway:** `POST http://localhost:3001/doctors`

`userId` comes from `x-user-id`. Response **201 Created**.

### Update doctor profile

- **Direct:** `PATCH http://localhost:3003/doctors/{id}`
- **Gateway:** `PATCH http://localhost:3001/doctors/{id}`

### Approve registration (admin)

- **Direct:** `PATCH http://localhost:3003/doctors/{id}/approve`
- **Gateway:** `PATCH http://localhost:3001/doctors/{id}/approve`

### Reject registration (admin)

- **Direct:** `PATCH http://localhost:3003/doctors/{id}/reject`
- **Gateway:** `PATCH http://localhost:3001/doctors/{id}/reject`

Response **204 No Content**.

### Delete doctor (admin)

- **Direct:** `DELETE http://localhost:3003/doctors/{id}`
- **Gateway:** `DELETE http://localhost:3001/doctors/{id}`

Response **204 No Content**.

---

## Patient-uploaded reports (doctor proxy)

**Auth:** `x-user-role` must be **`doctor`**. Caller must be an **approved** doctor profile.

Proxies to **patient-service** `GET /patients/:id/reports`. Configure **`PATIENT_SERVICE_URL`** in doctor-service `.env` (e.g. `http://localhost:3002`).

### List reports for a patient

- **Direct:** `GET http://localhost:3003/doctors/me/patients/{patientId}/reports`
- **Gateway:** `GET http://localhost:3001/doctors/me/patients/{patientId}/reports`

Optional query (same as patient-service):

- `category` — `lab` | `scan` | `discharge` | `other`
- `limit`, `offset` — integers
- `sort` — e.g. `uploadedAt:desc`

Example:

`GET http://localhost:3003/doctors/me/patients/507f1f77bcf86cd799439011/reports?category=lab&limit=20`

Response body is the JSON array returned by patient-service (report refs).

---

## Prescriptions

**Auth:** `x-user-role` must be **`doctor`** on every route below.

### Issue prescription

- **Direct:** `POST http://localhost:3003/doctors/me/prescriptions`
- **Gateway:** `POST http://localhost:3001/doctors/me/prescriptions`

Requires **approved** doctor profile. Response **201 Created**.

### List my prescriptions

- **Direct:** `GET http://localhost:3003/doctors/me/prescriptions`
- **Gateway:** `GET http://localhost:3001/doctors/me/prescriptions`

Optional query (exact):

- `GET http://localhost:3003/doctors/me/prescriptions?patientId={patientId}`
- `GET http://localhost:3003/doctors/me/prescriptions?includeHistory=true`
- `GET http://localhost:3003/doctors/me/prescriptions?patientId={patientId}&includeHistory=1`

### List prescriptions for one patient

- **Direct:** `GET http://localhost:3003/doctors/me/prescriptions/for-patient/{patientId}`
- **Gateway:** `GET http://localhost:3001/doctors/me/prescriptions/for-patient/{patientId}`

Optional: `?includeHistory=true`

### Get one prescription

- **Direct:** `GET http://localhost:3003/doctors/me/prescriptions/{prescriptionId}`
- **Gateway:** `GET http://localhost:3001/doctors/me/prescriptions/{prescriptionId}`

### Amend prescription

- **Direct:** `PATCH http://localhost:3003/doctors/me/prescriptions/{prescriptionId}/amend`
- **Gateway:** `PATCH http://localhost:3001/doctors/me/prescriptions/{prescriptionId}/amend`

### Revoke prescription

- **Direct:** `PATCH http://localhost:3003/doctors/me/prescriptions/{prescriptionId}/revoke`
- **Gateway:** `PATCH http://localhost:3001/doctors/me/prescriptions/{prescriptionId}/revoke`

---

## My availability

**Auth:** `x-user-role` must be **`doctor`**.

### Get my schedule

- **Direct:** `GET http://localhost:3003/doctors/me/availability`
- **Gateway:** `GET http://localhost:3001/doctors/me/availability`

### Create or replace full schedule

- **Direct:** `PUT http://localhost:3003/doctors/me/availability`
- **Gateway:** `PUT http://localhost:3001/doctors/me/availability`

### Partial update schedule

- **Direct:** `PATCH http://localhost:3003/doctors/me/availability`
- **Gateway:** `PATCH http://localhost:3001/doctors/me/availability`

### Add or replace one date override

- **Direct:** `POST http://localhost:3003/doctors/me/availability/overrides`
- **Gateway:** `POST http://localhost:3001/doctors/me/availability/overrides`

### Remove override for a date

- **Direct:** `DELETE http://localhost:3003/doctors/me/availability/overrides/{date}`
- **Gateway:** `DELETE http://localhost:3001/doctors/me/availability/overrides/{date}`

Example: `DELETE http://localhost:3003/doctors/me/availability/overrides/2026-05-01`

---

## Availability integration (appointment-service / backends)

**Auth:** `X-Service-Api-Key` (if configured) or `x-user-id` + `x-user-role`.

### List free slot starts (UTC ISO instants)

- **Direct:** `GET http://localhost:3003/doctors/integration/availability/{doctorUserId}/free-slots?from={fromIso}&to={toIso}`
- **Gateway:** `GET http://localhost:3001/doctors/integration/availability/{doctorUserId}/free-slots?from={fromIso}&to={toIso}`

Example:

`GET http://localhost:3003/doctors/integration/availability/a1b2c3-keycloak-sub/free-slots?from=2026-04-01T00:00:00.000Z&to=2026-04-07T23:59:59.999Z`

### Validate a proposed slot

- **Direct:** `POST http://localhost:3003/doctors/integration/availability/validate-slot`
- **Gateway:** `POST http://localhost:3001/doctors/integration/availability/validate-slot`

JSON body: `{ "doctorUserId": "<same as appointment doctorId>", "slotStart": "2026-04-20T10:30:00.000Z" }`

---

## Quick reference (direct service, port 3003)

| Method | Exact URI template |
|--------|----------------------|
| GET | `http://localhost:3003/doctors` |
| GET | `http://localhost:3003/doctors?specialization={substring}` |
| GET | `http://localhost:3003/doctors/{id}` |
| GET | `http://localhost:3003/doctors/me/patients/{patientId}/reports` |
| POST | `http://localhost:3003/doctors` |
| PATCH | `http://localhost:3003/doctors/{id}` |
| PATCH | `http://localhost:3003/doctors/{id}/approve` |
| PATCH | `http://localhost:3003/doctors/{id}/reject` |
| DELETE | `http://localhost:3003/doctors/{id}` |
| POST | `http://localhost:3003/doctors/me/prescriptions` |
| GET | `http://localhost:3003/doctors/me/prescriptions` |
| GET | `http://localhost:3003/doctors/me/prescriptions/for-patient/{patientId}` |
| GET | `http://localhost:3003/doctors/me/prescriptions/{prescriptionId}` |
| PATCH | `http://localhost:3003/doctors/me/prescriptions/{prescriptionId}/amend` |
| PATCH | `http://localhost:3003/doctors/me/prescriptions/{prescriptionId}/revoke` |
| GET | `http://localhost:3003/doctors/me/availability` |
| PUT | `http://localhost:3003/doctors/me/availability` |
| PATCH | `http://localhost:3003/doctors/me/availability` |
| POST | `http://localhost:3003/doctors/me/availability/overrides` |
| DELETE | `http://localhost:3003/doctors/me/availability/overrides/{date}` |
| GET | `http://localhost:3003/doctors/integration/availability/{doctorUserId}/free-slots?from=...&to=...` |
| POST | `http://localhost:3003/doctors/integration/availability/validate-slot` |

For gateway calls, use `http://localhost:3001` instead of `http://localhost:3003` with the **same path and query string**.
