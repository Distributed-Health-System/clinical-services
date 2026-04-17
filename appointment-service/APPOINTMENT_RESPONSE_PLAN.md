# Appointment Response Plan (Scope + File-by-File Changes)

## Scope

This plan covers response-shaping changes for appointment APIs so frontend receives role-safe telemedicine links and complete payment metadata.

### In Scope

- Ensure `paymentTransactionId` is included in appointment response objects.
- Introduce role-based telemedicine link visibility in API responses:
  - `DOCTOR` -> only `telemedicineLinkDoctor`
  - `PATIENT` -> only `telemedicineLinkPatient`
  - `ADMIN` -> both links
- Apply consistent response shaping across appointment read/write endpoints that return appointment objects.
- Add tests and endpoint documentation updates for the new response contract.

### Out of Scope

- Appointment status workflow redesign.
- Doctor manual accept/reject re-enablement.
- Payment service contract changes.

---

## Current State Summary

- `paymentTransactionId` exists in domain/schema but was not mapped in repository entity mapper.
- Controllers currently return domain entities directly from use cases.
- Use cases return `Appointment` / `Appointment[]` directly.
- No dedicated response DTO/mapper layer currently enforces role-based field visibility.
- Result: both telemedicine links may be exposed to non-admin consumers once present.

---

## Progress Update (Already Done)

### 1. Map paymentTransactionId in repository response mapping

Status: Completed

- File changed:
  - `src/appointment/infrastructure/database/mongo/repositories/mongo-appointment.repository.ts`
- Change made:
  - Added mapping in `_toEntity(...)`:
    - `entity.paymentTransactionId = doc.paymentTransactionId ?? undefined;`

Impact:

- Any endpoint returning appointment entities now includes `paymentTransactionId` when available.

---

## Planned Changes for Role-Based Telemedicine Link Visibility

## Design Decision

Introduce a presentation-layer response mapper and DTOs so use cases remain domain-focused and access control for response fields stays at API boundary.

---

## File-by-File Change Requirements

### 1) Add response DTO for appointments

- New file:
  - `src/appointment/presentation/dtos/appointment-response.dto.ts`

Required contents:

- Define a frontend-facing DTO with explicit fields:
  - `id`
  - `patientId`
  - `doctorId`
  - `slotStart`
  - `status`
  - `reasonForVisit`
  - `paymentStatus`
  - `paymentTransactionId?`
  - `telemedicineLinkDoctor?`
  - `telemedicineLinkPatient?`

Notes:

- Optional telemedicine link fields are conditionally included by mapper based on role.

---

### 2) Add presentation mapper for role-based response shaping

- New file:
  - `src/appointment/presentation/mappers/appointment-response.mapper.ts`

Required contents:

- Pure mapping functions:
  - `toAppointmentResponse(appointment, role)`
  - `toAppointmentResponseList(appointments, role)`
- Role logic:
  - `DOCTOR`: include only doctor link and omit patient link
  - `PATIENT`: include only patient link and omit doctor link
  - `ADMIN`: include both links
- Keep shared fields always present.

---

### 3) Update controller return types to use response mapper

- File to change:
  - `src/appointment/presentation/controllers/appointment.controller.ts`

Required updates:

- For endpoints returning appointment data, map domain entities to response DTO before returning:
  - `POST /appointments`
  - `GET /appointments`
  - `GET /appointments/:id`
  - `PATCH /appointments/:id`
- Keep existing authorization logic and use case calls unchanged.

Reason:

- Centralize response masking at presentation boundary without touching domain/application logic.

---

### 4) (Optional but recommended) Add Swagger schema alignment

- File to change:
  - `src/appointment/presentation/controllers/appointment.controller.ts`

Required updates:

- Update `@ApiResponse` decorators to point to the new response DTO.
- Clarify role-based telemedicine visibility in endpoint descriptions.

---

### 5) Add focused tests for response masking

- Preferred new tests:
  - `test/appointment-response-visibility.e2e-spec.ts`

Alternative location:

- Extend existing `test/app.e2e-spec.ts`

Required assertions:

- `PATIENT` response includes `telemedicineLinkPatient` and excludes `telemedicineLinkDoctor`.
- `DOCTOR` response includes `telemedicineLinkDoctor` and excludes `telemedicineLinkPatient`.
- `ADMIN` response includes both links.
- `paymentTransactionId` appears when stored.

---

### 6) Update endpoint docs for frontend

- File to change:
  - `ENDPOINTS.md`

Required updates:

- Document role-based response visibility for telemedicine links.
- Mention `paymentTransactionId` availability in appointment response payloads.

---

## Rollout Sequence

1. Create response DTO + mapper.
2. Wire mapper in controller for all appointment-returning endpoints.
3. Add/adjust tests for role-based visibility and payment transaction field.
4. Update `ENDPOINTS.md` contract docs.

---

## Acceptance Criteria

- `paymentTransactionId` is present in API responses when persisted.
- Link visibility contract is enforced:
  - doctor sees only doctor link
  - patient sees only patient link
  - admin sees both
- No changes to existing authorization ownership logic.
- Existing endpoint behavior remains backward-compatible except intentional telemedicine field masking.
- Tests pass for all visibility permutations.
