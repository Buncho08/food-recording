-- Apply this if the original schema.sql has already been run.

create table if not exists public.wasteful_votes (
  meal_id uuid not null references public.meals(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (meal_id, user_id)
);

create index if not exists wasteful_votes_user_idx on public.wasteful_votes(user_id);
create index if not exists wasteful_votes_meal_idx on public.wasteful_votes(meal_id);

alter table public.wasteful_votes enable row level security;

drop policy if exists "wasteful votes readable by members" on public.wasteful_votes;
create policy "wasteful votes readable by members"
on public.wasteful_votes for select to authenticated
using (true);

drop policy if exists "friends can vote once" on public.wasteful_votes;
create policy "friends can vote once"
on public.wasteful_votes for insert to authenticated
with check (
  auth.uid() = user_id
  and not exists (
    select 1
    from public.meals
    where meals.id = wasteful_votes.meal_id
      and meals.user_id = auth.uid()
  )
);

drop policy if exists "voter can undo own vote" on public.wasteful_votes;
create policy "voter can undo own vote"
on public.wasteful_votes for delete to authenticated
using (auth.uid() = user_id);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'wasteful_votes'
  ) then
    alter publication supabase_realtime add table public.wasteful_votes;
  end if;
end $$;
