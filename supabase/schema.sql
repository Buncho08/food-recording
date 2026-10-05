-- Run this whole file in Supabase Dashboard > SQL Editor.
-- Safe to re-run. The browser uses only the public anon key, so RLS is mandatory.

create extension if not exists pgcrypto;

do $$ begin
  create type public.meal_type as enum ('breakfast', 'lunch', 'dinner');
exception when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 30),
  avatar_path text,
  created_at timestamptz not null default now()
);

create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  meal_date date not null default current_date,
  meal_type public.meal_type not null,
  title text not null check (char_length(title) between 1 and 120),
  note text check (note is null or char_length(note) <= 1000),
  image_path text,
  -- Legacy column kept for compatibility. Beer penalties are now calculated from wasteful_votes.
  is_wasteful_outing boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists meals_created_at_idx on public.meals(created_at desc);
create index if not exists meals_user_date_idx on public.meals(user_id, meal_date desc);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.meals(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 300),
  created_at timestamptz not null default now()
);

create index if not exists comments_meal_created_idx on public.comments(meal_id, created_at asc);

-- One user can vote only once per meal.
-- Deleting the row is the "undo" operation.
create table if not exists public.wasteful_votes (
  meal_id uuid not null references public.meals(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (meal_id, user_id)
);

create index if not exists wasteful_votes_user_idx on public.wasteful_votes(user_id);
create index if not exists wasteful_votes_meal_idx on public.wasteful_votes(meal_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1), 'user')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

insert into public.profiles (id, display_name)
select id, coalesce(nullif(raw_user_meta_data ->> 'display_name', ''), split_part(email, '@', 1), 'user')
from auth.users
on conflict (id) do nothing;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists meals_set_updated_at on public.meals;
create trigger meals_set_updated_at
before update on public.meals
for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.meals enable row level security;
alter table public.comments enable row level security;
alter table public.wasteful_votes enable row level security;

drop policy if exists "profiles readable by members" on public.profiles;
create policy "profiles readable by members"
on public.profiles for select to authenticated using (true);

drop policy if exists "profile owner can update" on public.profiles;
create policy "profile owner can update"
on public.profiles for update to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "meals readable by members" on public.meals;
create policy "meals readable by members"
on public.meals for select to authenticated using (true);

drop policy if exists "meal owner can insert" on public.meals;
create policy "meal owner can insert"
on public.meals for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "meal owner can update" on public.meals;
create policy "meal owner can update"
on public.meals for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "meal owner can delete" on public.meals;
create policy "meal owner can delete"
on public.meals for delete to authenticated
using (auth.uid() = user_id);

drop policy if exists "comments readable by members" on public.comments;
create policy "comments readable by members"
on public.comments for select to authenticated using (true);

drop policy if exists "members can comment" on public.comments;
create policy "members can comment"
on public.comments for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "comment owner can delete" on public.comments;
create policy "comment owner can delete"
on public.comments for delete to authenticated
using (auth.uid() = user_id);

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

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('meal-images', 'meal-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 3145728, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "meal image owner upload" on storage.objects;
create policy "meal image owner upload"
on storage.objects for insert to authenticated
with check (bucket_id = 'meal-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "meal image owner update" on storage.objects;
create policy "meal image owner update"
on storage.objects for update to authenticated
using (bucket_id = 'meal-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "meal image owner delete" on storage.objects;
create policy "meal image owner delete"
on storage.objects for delete to authenticated
using (bucket_id = 'meal-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatar owner upload" on storage.objects;
create policy "avatar owner upload"
on storage.objects for insert to authenticated
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatar owner update" on storage.objects;
create policy "avatar owner update"
on storage.objects for update to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatar owner delete" on storage.objects;
create policy "avatar owner delete"
on storage.objects for delete to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'meals'
  ) then
    alter publication supabase_realtime add table public.meals;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'comments'
  ) then
    alter publication supabase_realtime add table public.comments;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'wasteful_votes'
  ) then
    alter publication supabase_realtime add table public.wasteful_votes;
  end if;
end $$;
