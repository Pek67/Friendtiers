create table if not exists public.friendtiers_state (
    id text primary key,
    rankings jsonb not null default '[]'::jsonb,
    unranked jsonb not null default '[]'::jsonb,
    updated_at timestamptz not null default timezone('utc', now())
);

alter table public.friendtiers_state enable row level security;

drop policy if exists "public can read friendtiers state" on public.friendtiers_state;
create policy "public can read friendtiers state"
on public.friendtiers_state
for select
to anon, authenticated
using (true);

drop policy if exists "public can insert friendtiers state" on public.friendtiers_state;
create policy "public can insert friendtiers state"
on public.friendtiers_state
for insert
to anon, authenticated
with check (true);

drop policy if exists "public can update friendtiers state" on public.friendtiers_state;
create policy "public can update friendtiers state"
on public.friendtiers_state
for update
to anon, authenticated
using (true)
with check (true);

insert into public.friendtiers_state (id, rankings, unranked)
values ('global', '[]'::jsonb, '[]'::jsonb)
on conflict (id) do nothing;
