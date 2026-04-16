# patient-service — HTTP endpoints (exact URIs)

Defaults:

- Direct service: `http://localhost:3002`
- Via gateway: `http://localhost:3001` (same path)

Auth headers expected on protected routes:

- `x-user-id`
- `x-user-role` (`patient` | `doctor` | `admin`)

## Patient profile

- `POST /patients` (role: `patient`) — register own patient profile.
- `GET /patients/me` (role: `patient`) — fetch own profile.
- `PATCH /patients/me` (role: `patient`) — update own profile.
- `GET /patients/:id` (roles: patient self, doctor, admin) — fetch by id.
- `GET /patients` (role: `admin`) — list all active patients.
- `PATCH /patients/:id` (roles: patient self, doctor, admin) — update by id.
- `DELETE /patients/:id` (role: `admin`) — soft-delete patient.

## Reports (patient uploaded)

- `GET /patients/:id/reports` (roles: patient self, doctor, admin) — list/filter reports.
- `POST /patients/:id/reports` (role: `patient`, self only) — add report reference.
- `DELETE /patients/:id/reports/:reportId` (roles: patient self, admin) — remove report.

Query options for list:

- `category=lab|scan|discharge|other`
- `limit`, `offset`
- `sort` (example: `uploadedAt:desc`)

## Prescriptions (read-only for patient)

- `GET /patients/:id/prescriptions` (roles: patient self, doctor, admin) — read prescriptions.

Notes:

- Source of truth is `doctor-service`.
- patient-service proxies to doctor integration endpoint:
  `GET /doctors/integration/patients/:patientId/prescriptions`
- Optional query: `includeHistory=true`.

## Required env vars

- `MONGODB_URI`
- `DOCTOR_SERVICE_URL` (for prescription proxy)
- `SERVICE_API_KEY` (optional; used for service-to-service auth with doctor-service)
