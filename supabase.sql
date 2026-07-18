create table if not exists public.friendtiers_state (
    id text primary key,
    rankings jsonb not null default '[]'::jsonb,
    unranked jsonb not null default '[]'::jsonb,
    updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.friendtiers_comments (
    id bigint generated always as identity primary key,
    side text not null check (side in ('left', 'right')),
    author text not null,
    message text not null,
    created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.friendtiers_votes (
    id bigint generated always as identity primary key,
    player_name text not null,
    voter_key text not null unique,
    updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.friendtiers_daily_answers (
    id bigint generated always as identity primary key,
    question_key text not null,
    choice text not null,
    voter_key text not null,
    updated_at timestamptz not null default timezone('utc', now()),
    unique (question_key, voter_key)
);

create table if not exists public.friendtiers_comment_reactions (
    id bigint generated always as identity primary key,
    comment_id bigint not null references public.friendtiers_comments(id) on delete cascade,
    emoji text not null,
    voter_key text not null,
    created_at timestamptz not null default timezone('utc', now()),
    unique (comment_id, emoji, voter_key)
);

alter table public.friendtiers_state enable row level security;
alter table public.friendtiers_comments enable row level security;
alter table public.friendtiers_votes enable row level security;
alter table public.friendtiers_daily_answers enable row level security;
alter table public.friendtiers_comment_reactions enable row level security;

drop policy if exists "public can read friendtiers state" on public.friendtiers_state;
create policy "public can read friendtiers state"
on public.friendtiers_state
for select
to anon, authenticated
using (true);

drop policy if exists "public can insert friendtiers state" on public.friendtiers_state;
drop policy if exists "admin can insert friendtiers state" on public.friendtiers_state;
create policy "public can insert friendtiers state"
on public.friendtiers_state
for insert
to anon, authenticated
with check (true);

drop policy if exists "public can update friendtiers state" on public.friendtiers_state;
drop policy if exists "admin can update friendtiers state" on public.friendtiers_state;
create policy "public can update friendtiers state"
on public.friendtiers_state
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "public can read friendtiers comments" on public.friendtiers_comments;
create policy "public can read friendtiers comments"
on public.friendtiers_comments
for select
to anon, authenticated
using (true);

drop policy if exists "public can insert friendtiers comments" on public.friendtiers_comments;
create policy "public can insert friendtiers comments"
on public.friendtiers_comments
for insert
to anon, authenticated
with check (true);

drop policy if exists "public can read friendtiers votes" on public.friendtiers_votes;
create policy "public can read friendtiers votes"
on public.friendtiers_votes
for select
to anon, authenticated
using (true);

drop policy if exists "public can insert friendtiers votes" on public.friendtiers_votes;
create policy "public can insert friendtiers votes"
on public.friendtiers_votes
for insert
to anon, authenticated
with check (true);

drop policy if exists "public can update friendtiers votes" on public.friendtiers_votes;
create policy "public can update friendtiers votes"
on public.friendtiers_votes
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "public can read friendtiers daily answers" on public.friendtiers_daily_answers;
create policy "public can read friendtiers daily answers"
on public.friendtiers_daily_answers
for select
to anon, authenticated
using (true);

drop policy if exists "public can insert friendtiers daily answers" on public.friendtiers_daily_answers;
create policy "public can insert friendtiers daily answers"
on public.friendtiers_daily_answers
for insert
to anon, authenticated
with check (true);

drop policy if exists "public can update friendtiers daily answers" on public.friendtiers_daily_answers;
create policy "public can update friendtiers daily answers"
on public.friendtiers_daily_answers
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "public can read friendtiers comment reactions" on public.friendtiers_comment_reactions;
create policy "public can read friendtiers comment reactions"
on public.friendtiers_comment_reactions
for select
to anon, authenticated
using (true);

drop policy if exists "public can insert friendtiers comment reactions" on public.friendtiers_comment_reactions;
create policy "public can insert friendtiers comment reactions"
on public.friendtiers_comment_reactions
for insert
to anon, authenticated
with check (true);

drop policy if exists "public can delete friendtiers comment reactions" on public.friendtiers_comment_reactions;
create policy "public can delete friendtiers comment reactions"
on public.friendtiers_comment_reactions
for delete
to anon, authenticated
using (true);

insert into public.friendtiers_state (id, rankings, unranked)
values ('global', '[]'::jsonb, '[]'::jsonb)
on conflict (id) do nothing;
