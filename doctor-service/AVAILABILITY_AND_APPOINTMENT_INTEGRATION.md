# Doctor availability and appointment-service integration

This document explains how doctors configure availability in **doctor-service**, and how **appointment-service** (or any backend) should use the integration HTTP API when booking or validating slots.

## Concepts

- **Weekly template:** Recurring windows per weekday (`dayOfWeek` 0–6, Sunday–Saturday, same as JavaScript `Date#getDay()`), with one or more local time ranges (`HH:mm` 24h) in the doctor’s **IANA timezone** (for example `America/New_York`, `Asia/Kolkata`).
- **Breaks:** Optional blocks inside a weekday (lunch, etc.) that remove availability for that local time.
- **Date overrides:** Per calendar date (`YYYY-MM-DD` interpreted in the doctor’s timezone):
  - `isOff: true` — doctor is unavailable the whole day.
  - `isOff: false` + `windows` — custom hours for that day only (replaces the weekly template for that date).
- **Slot length:** `slotDurationMinutes` is `30` or `60`. It must be a **multiple of** `APPOINTMENT_SLOT_STEP_MINUTES` (default **30**), which must stay aligned with **appointment-service** (`SLOT_DURATION_MINUTES = 30` and UTC `:00` / `:30` grid).
- **UTC grid:** Free-slot generation only returns starts on the **UTC** half-hour grid (epoch-aligned), matching appointment-service’s rule that `slotStart` uses UTC minutes `0` or `30`.

Doctors do **not** re-enter availability every week: the template repeats until changed. They only add **overrides** for leaves or special days.

---

## Environment variables (doctor-service)

| Variable | Purpose |
|----------|---------|
| `MONGODB_URI` | Mongo connection (required). |
| `PORT` | HTTP port (default `3003`). |
| `SERVICE_API_KEY` | Optional. If set, integration routes accept `X-Service-Api-Key: <value>` for service-to-service calls without end-user gateway headers. |
| `APPOINTMENT_SLOT_STEP_MINUTES` | Optional, default `30`. Must match appointment slot step. |

---

## Doctor-facing endpoints (role `doctor`)

All routes expect gateway headers **`x-user-id`** and **`x-user-role`** (same as the rest of doctor-service). The role must be **`doctor`** for these handlers.

Base path: `/doctors/me/availability`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/doctors/me/availability` | Returns `{ schedule: null }` or the full schedule document. |
| `PUT` | `/doctors/me/availability` | Create or **replace** the entire schedule. |
| `PATCH` | `/doctors/me/availability` | Partial update (requires an existing schedule). |
| `POST` | `/doctors/me/availability/overrides` | Add or replace a single date override (body: `DateOverrideDto`). |
| `DELETE` | `/doctors/me/availability/overrides/:date` | Remove override for `date` (`YYYY-MM-DD`). |

### Example: initial weekly template (`PUT`)

```http
PUT /doctors/me/availability
Content-Type: application/json
x-user-id: <doctor-user-id>
x-user-role: doctor

{
  "timezone": "Asia/Kolkata",
  "slotDurationMinutes": 30,
  "weeklyRules": [
    { "dayOfWeek": 1, "windows": [{ "start": "09:00", "end": "13:00" }, { "start": "15:00", "end": "18:00" }] },
    { "dayOfWeek": 2, "windows": [{ "start": "09:00", "end": "13:00" }, { "start": "15:00", "end": "18:00" }] }
  ],
  "breakRules": [
    { "dayOfWeek": 1, "start": "11:00", "end": "11:30" }
  ],
  "dateOverrides": [],
  "effectiveFrom": "2026-04-01",
  "effectiveTo": "2026-12-31",
  "isActive": true
}
```

### Example: one-day leave (`POST` override)

```http
POST /doctors/me/availability/overrides
Content-Type: application/json
x-user-id: <doctor-user-id>
x-user-role: doctor

{ "date": "2026-05-01", "isOff": true }
```

---

## Integration endpoints (for appointment-service)

Base path: **`/doctors/integration/availability`** (under the gateway’s `/doctors` proxy, same host as other doctor routes).

Authentication: **`ServiceOrGatewayAuthGuard`**

- If `SERVICE_API_KEY` is set in doctor-service, requests may send **`X-Service-Api-Key: <SERVICE_API_KEY>`** (no user headers required).
- Otherwise, send **`x-user-id`** and **`x-user-role`** (for example the patient’s gateway headers when validating during booking).

### 1. List free slot starts

```http
GET /doctors/integration/availability/:doctorUserId/free-slots?from=<ISO8601>&to=<ISO8601>
```

- **`:doctorUserId`** must be the same identifier as **`CreateAppointmentDto.doctorId`** in appointment-service (the doctor’s auth / gateway user id).
- Response: `{ "slots": [ "<ISO8601>", ... ] }` — each value is a UTC instant on the `:00`/`:30` grid, inside availability, breaks, and overrides applied.
- If the doctor has no schedule, **`slots` is `[]`**.

### 2. Validate a single proposed booking instant

```http
POST /doctors/integration/availability/validate-slot
Content-Type: application/json

{
  "doctorUserId": "<same as appointment doctorId>",
  "slotStart": "2026-04-20T10:30:00.000Z"
}
```

Response examples:

- `{ "valid": true }`
- `{ "valid": false, "reason": "..." }`

Reasons include: no schedule, inactive schedule, not on UTC half-hour grid, outside windows/overrides/breaks.

### Recommended flow in appointment-service

1. Before **`bookAppointment`** (or when showing the booking UI), optionally call **`free-slots`** to populate the picker.
2. Immediately before persisting a new appointment, call **`validate-slot`** with the same `doctorUserId` and `slotStart` you will store.
3. If `valid` is false, return **400** with the doctor-service `reason` (or map it to your domain errors).
4. Keep enforcing your existing **conflict** checks (`hasSlotConflictForDoctor` / patient); doctor-service does **not** know about other bookings.

---

## Prescriptions (doctor role)

Base path: **`/doctors/me/prescriptions`** (`x-user-role: doctor`). Issuing requires an **approved** doctor profile.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/doctors/me/prescriptions` | Issue prescription (`CreatePrescriptionDto`). |
| `GET` | `/doctors/me/prescriptions` | List prescriptions for the logged-in doctor (`?patientId=&includeHistory=true`). |
| `GET` | `/doctors/me/prescriptions/for-patient/:patientId` | List for one patient. |
| `GET` | `/doctors/me/prescriptions/:prescriptionId` | Detail. |
| `PATCH` | `/doctors/me/prescriptions/:prescriptionId/amend` | New **ACTIVE** version; previous row marked **AMENDED**. |
| `PATCH` | `/doctors/me/prescriptions/:prescriptionId/revoke` | Body optional `{ "reason": "..." }`. |

Statuses: **`ACTIVE`**, **`AMENDED`**, **`REVOKED`**. Default list omits non-`ACTIVE` unless `includeHistory=true`.

---

## Role header consistency

These routes expect `x-user-role` to be exactly **`doctor`** for doctor-only handlers. If your API gateway emits a different string (for example `DOCTOR`), align the gateway or extend `RolesGuard` to accept both.
