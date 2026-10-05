-- Apply this if the original schema.sql has already been run.
-- Safe to re-run.

create table if not exists public.wasteful_votes (
  meal_id uuid not null references public.meals(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (meal_id, user_id)
);

create index if not exists wasteful_votes_user_idx on public.wasteful_votes(user_id);
create index if not exists wasteful_votes_meal_idx on public.wasteful_votes(meal_id);

-- Make sure PostgREST roles can reach the table.
grant select, insert, delete on table public.wasteful_votes to authenticated;
grant all on table public.wasteful_votes to service_role;

alter table public.wasteful_votes enable row level security;

drop policy if exists "wasteful votes readable by members" on public.wasteful_votes;
create policy "wasteful votes readable by members"
on public.wasteful_votes
for select
to authenticated
using (true);

drop policy if exists "friends can vote once" on public.wasteful_votes;
create policy "friends can vote once"
on public.wasteful_votes
for insert
to authenticated
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
on public.wasteful_votes
for delete
to authenticated
using (auth.uid() = user_id);

-- Realtime is optional for correctness, but enable it when available.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'wasteful_votes'
  ) then
    alter publication supabase_realtime add table public.wasteful_votes;
  end if;
exception
  when undefined_object then
    null;
end $$;

-- Force PostgREST to notice the new table/policies immediately.
notify pgrst, 'reload schema';

-- Diagnostic output. You should see one row with table_exists = true.
select
  to_regclass('public.wasteful_votes') is not null as table_exists,
  has_table_privilege('authenticated', 'public.wasteful_votes', 'select') as authenticated_can_select,
  has_table_privilege('authenticated', 'public.wasteful_votes', 'insert') as authenticated_can_insert,
  has_table_privilege('authenticated', 'public.wasteful_votes', 'delete') as authenticated_can_delete;
