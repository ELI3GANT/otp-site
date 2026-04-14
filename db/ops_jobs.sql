-- OTP Operations: Quick Intake / Job Sheet
-- Run this in Supabase SQL editor (service role / admin).
-- Creates a single source-of-truth table for internal jobs.

create table if not exists public.ops_jobs (
  job_id text primary key,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  source_type text not null default 'manualIntake',

  client_name text not null,
  business_name text,
  phone text,
  email text,

  service_type text not null,
  package_type text not null check (package_type in ('The Signal','The Engine','The System','Custom')),

  project_title text not null,
  project_description text,
  deliverables text,
  add_ons text,
  start_date date,
  due_date date,
  allow_date_override boolean not null default false,

  total_price_cents integer not null,
  deposit_amount_cents integer not null default 0,
  remaining_balance_cents integer not null,

  payment_method text check (payment_method in ('Apple Pay','Cash App','Zelle','Bank Transfer','Cash','Other')),
  payment_status text not null check (payment_status in ('Unpaid','Deposit Paid','Paid in Full')),

  client_notes text,
  internal_notes text,

  portfolio_permission boolean not null default false,
  agreement_signed boolean not null default false,
  invoice_sent boolean not null default false,

  job_status text not null check (job_status in ('New Lead','Quote Sent','Deposit Paid','Active Client','Awaiting Final Payment','Completed','Archived')),

  created_by text,
  updated_by text
);

create index if not exists ops_jobs_client_name_idx on public.ops_jobs (client_name);
create index if not exists ops_jobs_package_type_idx on public.ops_jobs (package_type);
create index if not exists ops_jobs_payment_status_idx on public.ops_jobs (payment_status);
create index if not exists ops_jobs_job_status_idx on public.ops_jobs (job_status);
create index if not exists ops_jobs_due_date_idx on public.ops_jobs (due_date);
create index if not exists ops_jobs_updated_at_idx on public.ops_jobs (updated_at desc);

-- Optional: basic email lookup
create index if not exists ops_jobs_email_idx on public.ops_jobs (email);

