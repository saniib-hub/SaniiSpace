-- Internet Smart Hub — Supabase schema for the website's ticket/order log.
--
-- Run this once in the Supabase SQL Editor (Project -> SQL Editor -> New
-- query -> paste this whole file -> Run). Creates a `tickets` table that
-- the public website can INSERT into, but not read, update, or delete —
-- customers can only add their own ticket, never see anyone else's. You
-- (the shop owner) can see everything via the Table Editor or SQL Editor
-- while logged into the Supabase dashboard, which bypasses these rules.

create table if not exists public.tickets (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  ticket_timestamp timestamptz,
  type text,
  ticket_id text,
  name text,
  email text,
  contact text,
  total numeric,
  summary text
);

alter table public.tickets enable row level security;

-- Anyone (including the public, unauthenticated website) can add a new
-- ticket row, but cannot read, edit, or delete any row.
create policy "Public can insert tickets"
  on public.tickets
  for insert
  to anon
  with check (true);
