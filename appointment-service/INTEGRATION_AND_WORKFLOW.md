# Appointment Service Integration & Workflow

This document explains the internal schemas, integration points, and frontend implementation guidelines for the **appointment-service**.

## 1. Domain Model & Schema

Every appointment occupies a fixed-duration time slot (30 minutes).

**Core Fields:**
- `id`: MongoDB ObjectId.
- `patientId`: Auth token user ID of the patient.
- `doctorId`: Auth token user ID of the doctor (provided by patient).
- `slotStart`: UTC Date/time at which the slot begins. Must align to `:00` or `:30`.
- `status`: Lifecycle status (`PENDING`, `CONFIRMED`, `REJECTED`, `CANCELLED`, `COMPLETED`).
- `reasonForVisit`: Stated reason by patient.
- `telemedicineLink`: URL for video session (populated only when `CONFIRMED`).
- `paymentStatus`: Tracked via Payment Service (`PENDING`, `CONFIRMED`, `FAILED`).

**Conflict System:**
- A composite unique index on DB level prevents overlapping bookings for `(doctorId, slotStart)` and `(patientId, slotStart)`.
- The appointment service handles existing booking conflicts natively.
- **Availability checking** is delegated to the `doctor-service`.

## 2. Integration Points

### A. Doctor Service (Availability)
The appointment service acts as the orchestrator and proxies availability calls to the Doctor Service.
- **`DoctorClient.getFreeSlots(doctorId, from, to)`**: Called by `GET /appointments/available-slots/:doctorId`. Fetches the doctor's available UTC slots.
- **`DoctorClient.validateSlot(doctorId, slotStart)`**: Automatically called right before a `POST /appointments` or a slot `PATCH`. It validates that the proposed time falls within the doctor's weekly rules and date overrides. Throws an error to the user if the slot is invalid according to the doctor's schedule.

### B. Telemedicine Service
When a doctor approves an appointment (`PATCH /appointments/:id/status` with `CONFIRMED`), the appointment service instantly calls the Telemedicine service client to generate a video link and attaches it to the `telemedicineLink` field of the appointment.

### C. Payment Service
Appointments have a `paymentStatus`. Currently initialized to `PENDING`. Further integration with Payment Service ensures that status updates when transactions succeed.

## 3. Frontend Implementation Guidelines

When building the patient frontend to book an appointment:

### Step 1: Browse Available Slots
1. Fetch the doctor's auth ID.
2. Call `GET /appointments/available-slots/{doctorId}?from=...&to=...` on the API Gateway.
3. The response gives you exactly the UTC times the doctor is free and works around their breaks/leaves. Show these slots to the user in their local timezone.

### Step 2: Book the Appointment
1. Call `POST /appointments` with the chosen `slotStart` (must match one of the free slots), `doctorId`, and `reasonForVisit`.
2. **Handle Errors gracefully:**
   - **409 Conflict:** "This slot was just booked by someone else."
   - **400 Bad Request:** "Doctor is no longer available at this time." (The `reason` string will have details from the doctor service).

### Step 3: Patient Dashboard
1. Call `GET /appointments` or `GET /appointments?filter=UPCOMING` to list patient's bookings.
2. If `status === 'CONFIRMED'`, show the `telemedicineLink` with a "Join Video Call" button (possibly disabled until 10 mins before `slotStart`).

### Step 4: Doctor Dashboard
1. Call `GET /appointments` as a Doctor.
2. Filter for `PENDING` appointments to review incoming requests.
3. Show the `reasonForVisit` and `slotStart`.
4. Provide standard "Approve" and "Reject" buttons calling `PATCH /appointments/{id}/status` with `CONFIRMED` or `REJECTED`.

## 4. Pending Architecture Alignments (To-Do)

Based on recent merges across other microservices, the `appointment-service` is missing a few standard implementations and optimizations that should be addressed in the future:

### A. Authentication Guard Standardization
- **Current State:** The appointment service uses a bespoke `AuthGuard` in `presentation/guards/auth.guard.ts`.
- **Target State:** Other services (`patient-service`, `doctor-service`) have migrated away from `clerk-auth.guard.ts` to a standardized `GatewayAuthGuard` and dedicated `RolesGuard` (`gateway-auth.guard.ts` and `roles.guard.ts`) using the `@Roles()` decorator. The appointment service needs to refactor its guards to match this pattern.

### B. Prescription System Integration
- **Current State:** The appointment service does not interact with the prescription system.
- **Future Implication:** If appointments need to present or link generated prescriptions, the appointment service might need a proxy implementation (similar to what `patient-service` implemented for prescriptions) or the gateway needs to stitch them together based on the appointment's patientId.

### C. Standard DTO and Error Mapping
- As other services streamline their DTOs (e.g. `patient-service` dropped `CreatePatientDto` since patient records are identity-driven), the appointment service should continually audit its `POST /appointments` payload to ensure it relies only on gateway user attributes (like `x-user-id`) instead of trusting payload identities.
