-- OTP Site content trust boundary.
-- Source-only migration: review and apply to an isolated staging branch before production.

begin;

alter table public.site_content
    add column if not exists access_scope text;

-- Existing mixed-sensitivity rows fail closed. Only the four current live-editor
-- DOM blocks are intentionally public.
update public.site_content
set access_scope = 'private'
where access_scope is null
   or access_scope not in ('public', 'private');

update public.site_content
set access_scope = 'public'
where key = any(array[
    'hero-subtitle',
    'studio-text-1',
    'studio-text-2',
    'services-desc'
]);

alter table public.site_content
    alter column access_scope set default 'private',
    alter column access_scope set not null;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conrelid = 'public.site_content'::regclass
          and conname = 'site_content_access_scope_check'
    ) then
        alter table public.site_content
            add constraint site_content_access_scope_check
            check (access_scope in ('public', 'private'));
    end if;
end
$$;

create index if not exists site_content_public_key_idx
    on public.site_content (key)
    where access_scope = 'public';

alter table public.site_content enable row level security;

drop policy if exists "Allow All" on public.site_content;
drop policy if exists "Public Select" on public.site_content;
drop policy if exists "Public Read Content" on public.site_content;
drop policy if exists "Admin Full Access" on public.site_content;
drop policy if exists "Public Read Classified Site Content" on public.site_content;
drop policy if exists "Service Role Site Content Access" on public.site_content;

revoke all on table public.site_content from anon, authenticated;
grant select on table public.site_content to anon, authenticated;
grant all on table public.site_content to service_role;

create policy "Public Read Classified Site Content"
on public.site_content
for select
to anon, authenticated
using (
    access_scope = 'public'
    and key = any(array[
        'hero-subtitle',
        'studio-text-1',
        'studio-text-2',
        'services-desc'
    ])
);

create policy "Service Role Site Content Access"
on public.site_content
for all
to service_role
using (true)
with check (true);

comment on column public.site_content.access_scope is
    'Default-private OTP content classification. Public is limited by RLS and the server allowlist.';

commit;
