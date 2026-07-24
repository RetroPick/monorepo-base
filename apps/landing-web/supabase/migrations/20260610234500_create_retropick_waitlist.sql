create extension if not exists pgcrypto;

create table if not exists public.retropick_waitlist (
  id uuid primary key default gen_random_uuid(),

  email text not null,
  email_normalized text generated always as (lower(trim(email))) stored,

  name text,
  telegram text,
  x_handle text,
  wallet_address text,

  role text,
  user_type text,
  interest text,
  primary_use_case text,
  source text default 'website',

  referral_code text,
  referred_by text,

  status text not null default 'pending',

  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,

  landing_path text,
  user_agent text,
  ip_hash text,
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists retropick_waitlist_email_unique
on public.retropick_waitlist (email_normalized);

create unique index if not exists retropick_waitlist_referral_code_unique
on public.retropick_waitlist (referral_code)
where referral_code is not null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_retropick_waitlist_updated_at on public.retropick_waitlist;

create trigger set_retropick_waitlist_updated_at
before update on public.retropick_waitlist
for each row
execute function public.set_updated_at();

alter table public.retropick_waitlist enable row level security;

drop policy if exists "Allow public waitlist insert" on public.retropick_waitlist;
drop policy if exists "Block public waitlist read" on public.retropick_waitlist;
drop policy if exists "Block public waitlist update" on public.retropick_waitlist;
drop policy if exists "Block public waitlist delete" on public.retropick_waitlist;

create policy "Allow public waitlist insert"
on public.retropick_waitlist
for insert
to anon
with check (
  email is not null
  and length(trim(email)) >= 5
  and length(trim(email)) <= 320
  and position('@' in email) > 1
);

notify pgrst, 'reload schema';
