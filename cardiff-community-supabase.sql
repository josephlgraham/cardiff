-- Cardiff community widgets
-- Run this once in the Supabase SQL editor.

create extension if not exists pgcrypto;

create table if not exists reactions (
  id uuid default gen_random_uuid() primary key,
  page text not null,
  emoji text not null,
  created_at timestamptz default now()
);

create table if not exists poll_votes (
  id uuid default gen_random_uuid() primary key,
  poll_id text not null,
  option_key text not null,
  created_at timestamptz default now()
);

create table if not exists signups (
  id uuid default gen_random_uuid() primary key,
  area text,
  interests text[],
  note text,
  created_at timestamptz default now()
);

alter table reactions enable row level security;
alter table poll_votes enable row level security;
alter table signups enable row level security;

drop policy if exists "reactions_insert_anon" on reactions;
create policy "reactions_insert_anon" on reactions
for insert
to anon
with check (true);

drop policy if exists "reactions_select_anon" on reactions;
create policy "reactions_select_anon" on reactions
for select
to anon
using (true);

drop policy if exists "poll_votes_insert_anon" on poll_votes;
create policy "poll_votes_insert_anon" on poll_votes
for insert
to anon
with check (true);

drop policy if exists "poll_votes_select_anon" on poll_votes;
create policy "poll_votes_select_anon" on poll_votes
for select
to anon
using (true);

drop policy if exists "signups_insert_anon" on signups;
create policy "signups_insert_anon" on signups
for insert
to anon
with check (true);

drop function if exists cardiff_signup_summary();
create or replace function cardiff_signup_summary()
returns jsonb
language sql
security definer
set search_path = public
as $$
  with totals as (
    select count(*)::int as total from signups
  ),
  breakdown as (
    select
      interest as label,
      count(*)::int as count
    from signups,
    lateral unnest(coalesce(interests, array[]::text[])) as interest
    group by interest
    order by count(*) desc, interest asc
  )
  select jsonb_build_object(
    'total', coalesce((select total from totals), 0),
    'breakdown', coalesce((select jsonb_agg(jsonb_build_object('label', label, 'count', count)) from breakdown), '[]'::jsonb)
  );
$$;

revoke all on function cardiff_signup_summary() from public;
grant execute on function cardiff_signup_summary() to anon;
