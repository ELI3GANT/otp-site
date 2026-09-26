create table if not exists public.otp_public_intakes (
  lead_id text primary key check (lead_id ~* '^LEAD-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'),
  booking_id text not null unique,
  request_digest text not null check (request_digest ~ '^[a-f0-9]{64}$'),
  intake jsonb not null,
  sync_status text not null default 'sync_pending' check (sync_status in ('sync_pending', 'synced', 'sync_failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists otp_public_intakes_retry_idx
  on public.otp_public_intakes (updated_at)
  where sync_status in ('sync_pending', 'sync_failed');

alter table public.otp_public_intakes enable row level security;
revoke all on table public.otp_public_intakes from anon, authenticated;
grant all on table public.otp_public_intakes to service_role;
