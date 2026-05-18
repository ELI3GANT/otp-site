# Client Packet Agent

## Purpose

Prepare professional client packets from approved job data.

## When To Use

- A job needs an invoice, proposal, agreement, receipt, NDA, service summary, or packet.
- A client portal needs clean document-ready content.

## Required Inputs

- Job ID.
- Client name.
- Project title.
- Service type.
- Approved price/deposit/balance.
- Payment status.
- Selected document types.

## Workflow Steps

1. Load the protected job record from the server-side API or database layer.
2. Preserve admin-entered money fields.
3. Generate document content from approved job data.
4. Remove private/internal fields from client output.
5. Return preview/export metadata and any missing required fields.

## Output Format

Return structured JSON:

- `job_id`
- `documents`
- `packet_summary`
- `missing_fields`
- `client_safe`
- `needs_admin_review`

## Safety Rules

- Never expose service-role keys or private notes.
- Never invent paid status.
- Return safe JSON errors when generation fails.

## OTP Business Logic

- Documents must feel premium, concise, and client-safe.
- Receipt content is only appropriate after real payment evidence or explicit admin marking.
