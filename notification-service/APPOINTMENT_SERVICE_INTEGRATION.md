# Appointment-Service Integration for Notification-Service

This document explains what `appointment-service` must do so **email and SMS** confirmations are sent from `notification-service` when an appointment becomes `CONFIRMED`.

## Responsibility Split

- `appointment-service` is the source of truth for appointment status.
- `notification-service` handles delivery (Resend email, Twilio SMS).

When an appointment becomes `CONFIRMED`, `appointment-service` must call notification-service.

## Endpoint to Call

- Method: `POST`
- Path: `/notifications/appointment-confirmed`
- Local URL example: `http://localhost:3007/notifications/appointment-confirmed`

## Auth Header

Set the shared internal key in request headers:

- `X-Service-Api-Key: <SERVICE_API_KEY>`

The value must match `SERVICE_API_KEY` configured in notification-service `.env`.

## Required Trigger Condition

Call this endpoint only when appointment status transitions to `CONFIRMED`.

Recommended check in appointment-service:

- previous status is not `CONFIRMED`
- new status is `CONFIRMED`

This avoids duplicate notifications on repeated updates.

## Request Body Contract

```json
{
  "appointmentId": "apt_123",
  "patientEmail": "patient@example.com",
  "doctorEmail": "doctor@example.com",
  "patientName": "John",
  "doctorName": "Aisha",
  "startsAt": "2026-04-18T10:00:00.000Z",
  "specialization": "Cardiology",
  "meetingUrl": "https://meet.example.com/room/apt_123",
  "patientPhone": "+15551110001",
  "doctorPhone": "+15552220002"
}
```

### Field Rules

| Field | Required | Notes |
|--------|-----------|--------|
| `appointmentId` | yes | Stable id from appointment-service |
| `patientEmail` | yes | Used for Resend |
| `startsAt` | yes | ISO 8601 datetime |
| `doctorEmail` | no | If set, doctor receives email too |
| `patientName`, `doctorName` | no | Used in templates |
| `specialization` | no | |
| `meetingUrl` | no | Must be a valid URL if present |
| `patientPhone` | no | **E.164** (e.g. `+15551234567`). If set and Twilio is configured in notification-service, patient gets SMS |
| `doctorPhone` | no | Same as above for doctor |

**Phone format:** use E.164 only (`+` then country code, no spaces). Example: `+14155552671`.

If `doctorEmail` is omitted, only the patient receives email. Same idea for phones: omit `doctorPhone` if unknown.

## Environment in Notification-Service (your teammate / ops)

Email (required for this endpoint to work):

- `RESEND_API_KEY`
- `EMAIL_FROM`

SMS (optional until all three are set):

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER` — your Twilio sending number in E.164 (e.g. `+15551234567`)

If Twilio env is incomplete, **email still sends**; the API response will include `sms.skipped: "twilio_not_configured"`.

If Twilio is configured but **no** `patientPhone` / `doctorPhone` are sent, SMS is skipped with `sms.skipped: "no_recipient_phone_numbers"`.

**Twilio trial:** you can usually only SMS **verified** destination numbers until the account is upgraded.

## Example cURL

```bash
curl -X POST "http://localhost:3007/notifications/appointment-confirmed" \
  -H "Content-Type: application/json" \
  -H "X-Service-Api-Key: your-shared-service-key" \
  -d '{
    "appointmentId":"apt_123",
    "patientEmail":"patient@example.com",
    "doctorEmail":"doctor@example.com",
    "patientName":"John",
    "doctorName":"Aisha",
    "startsAt":"2026-04-18T10:00:00.000Z",
    "specialization":"Cardiology",
    "meetingUrl":"https://meet.example.com/room/apt_123",
    "patientPhone":"+15551110001",
    "doctorPhone":"+15552220002"
  }'
```

## Expected Success Response

```json
{
  "ok": true,
  "email": {
    "sent": [
      {
        "channel": "email",
        "to": "patient@example.com",
        "id": "re_xxx",
        "role": "patient"
      },
      {
        "channel": "email",
        "to": "doctor@example.com",
        "id": "re_yyy",
        "role": "doctor"
      }
    ]
  },
  "sms": {
    "sent": [
      {
        "channel": "sms",
        "to": "+15551110001",
        "sid": "SMxxxxxxxx",
        "role": "patient"
      },
      {
        "channel": "sms",
        "to": "+15552220002",
        "sid": "SMyyyyyyyy",
        "role": "doctor"
      }
    ]
  }
}
```

When SMS is skipped (no Twilio or no numbers), `sms` may look like:

```json
{
  "sms": {
    "sent": [],
    "skipped": "twilio_not_configured"
  }
}
```

or

```json
{
  "sms": {
    "sent": [],
    "skipped": "no_recipient_phone_numbers"
  }
}
```

## Environment Needed in Appointment-Service

- `NOTIFICATION_SERVICE_URL=http://localhost:3007`
- `SERVICE_API_KEY=<same-shared-key-as-notification-service>`

## Minimal Flow in Appointment-Service

1. Persist appointment status as `CONFIRMED` (only once, or idempotent with dedup).
2. Resolve patient/doctor **email** and optional **E.164 phones** from your domain (patient profile, doctor profile, or embedded on the appointment).
3. `POST` JSON to `NOTIFICATION_SERVICE_URL/notifications/appointment-confirmed` with `X-Service-Api-Key`.
4. Log non-2xx responses; optionally retry with backoff so a transient Resend/Twilio failure does not lose the notification forever.
