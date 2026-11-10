-- Campus initial schema. Run in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table public.study_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  group_id uuid references public.study_groups(id) on delete set null,
  role text not null default 'student' check (role in ('student', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  group_id uuid references public.study_groups(id) on delete cascade,
  description text,
  created_at timestamptz not null default now()
);

create table public.schedule_events (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.study_groups(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  room text,
  teacher text,
  week_type text not null default 'both' check (week_type in ('numerator', 'denominator', 'both')),
  status text not null default 'active' check (status in ('active', 'cancelled', 'replacement')),
  notes text,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table public.lecture_topics (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  title text not null,
  body text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.lecture_materials (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.lecture_topics(id) on delete cascade,
  title text not null,
  material_type text not null check (material_type in ('text', 'pdf', 'presentation', 'image', 'link')),
  body text,
  file_path text,
  external_url text,
  created_at timestamptz not null default now()
);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.study_groups(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  title text not null,
  description text,
  due_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'submitted', 'reviewed')),
  updated_at timestamptz not null default now(),
  unique (assignment_id, student_id)
);

create table public.material_progress (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.lecture_materials(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  is_read boolean not null default false,
  is_favorite boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (material_id, student_id)
);

create index schedule_group_starts_idx on public.schedule_events(group_id, starts_at);
create index assignments_group_due_idx on public.assignments(group_id, due_at);
create index subjects_group_idx on public.subjects(group_id);

create or replace function public.is_admin()
returns boolean language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin');
$$;

create or replace function public.my_group_id()
returns uuid language sql stable security definer
set search_path = public
as $$
  select group_id from public.profiles where id = auth.uid();
$$;

create or replace function public.set_my_group(target_group_id uuid)
returns void language plpgsql security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not exists (select 1 from public.study_groups where id = target_group_id) then
    raise exception 'Unknown study group';
  end if;
  update public.profiles set group_id = target_group_id, updated_at = now()
  where id = auth.uid() and role = 'student';
end;
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.study_groups enable row level security;
alter table public.profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.schedule_events enable row level security;
alter table public.lecture_topics enable row level security;
alter table public.lecture_materials enable row level security;
alter table public.assignments enable row level security;
alter table public.assignment_submissions enable row level security;
alter table public.material_progress enable row level security;

create policy "Groups visible to authenticated users" on public.study_groups
for select to authenticated using (true);
create policy "Admins manage groups" on public.study_groups
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Read own profile" on public.profiles
for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "Admins manage profiles" on public.profiles
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Students read own group subjects" on public.subjects
for select to authenticated using (group_id = public.my_group_id() or public.is_admin());
create policy "Admins manage subjects" on public.subjects
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Students read own group schedule" on public.schedule_events
for select to authenticated using (group_id = public.my_group_id() or public.is_admin());
create policy "Admins manage schedule" on public.schedule_events
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Students read topics for own group" on public.lecture_topics
for select to authenticated using (
  exists (select 1 from public.subjects s where s.id = subject_id and (s.group_id = public.my_group_id() or public.is_admin()))
);
create policy "Admins manage topics" on public.lecture_topics
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Students read materials for own group" on public.lecture_materials
for select to authenticated using (
  exists (select 1 from public.lecture_topics t join public.subjects s on s.id = t.subject_id
  where t.id = topic_id and (s.group_id = public.my_group_id() or public.is_admin()))
);
create policy "Admins manage materials" on public.lecture_materials
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Students read own group assignments" on public.assignments
for select to authenticated using (group_id = public.my_group_id() or public.is_admin());
create policy "Admins manage assignments" on public.assignments
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Students manage own assignment status" on public.assignment_submissions
for all to authenticated using (student_id = auth.uid() or public.is_admin())
with check (student_id = auth.uid() or public.is_admin());

create policy "Students manage own material progress" on public.material_progress
for all to authenticated using (student_id = auth.uid() or public.is_admin())
with check (student_id = auth.uid() or public.is_admin());

grant execute on function public.set_my_group(uuid) to authenticated;
grant execute on function public.is_admin() to authenticated;
