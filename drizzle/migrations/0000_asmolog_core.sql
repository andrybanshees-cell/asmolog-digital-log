-- roles
create type public.app_role as enum ('admin','dit','viewer');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile read" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "read own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- new users get a profile + admin role of their own workspace
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'admin')
  on conflict do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- projects
create table public.projects (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  production_name text default '',
  media_type text not null default 'digital',
  lenses jsonb not null default '[]'::jsonb,
  filters jsonb not null default '[]'::jsonb,
  characters jsonb not null default '[]'::jsonb,
  luts jsonb not null default '[]'::jsonb,
  aspect_ratios jsonb not null default '[]'::jsonb,
  formats jsonb not null default '[]'::jsonb,
  resolutions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.projects to authenticated;
grant all on public.projects to service_role;
alter table public.projects enable row level security;
create policy "own projects" on public.projects for all to authenticated
using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create table public.takes (
  id uuid primary key,
  project_id uuid not null references public.projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  scene text not null default '',
  shot text not null default '',
  take integer not null default 1,
  camera_roll text default '',
  sound_roll text default '',
  lens text default '',
  filter text default '',
  character_name text default '',
  lut text default '',
  aspect_ratio text default '',
  format text default '',
  resolution text default '',
  fps text default '',
  shutter text default '',
  wb text default '',
  iso text default '',
  aperture text default '',
  good_take boolean not null default false,
  notes text default '',
  logged_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.takes to authenticated;
grant all on public.takes to service_role;
alter table public.takes enable row level security;
create policy "own takes" on public.takes for all to authenticated
using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create index takes_project_idx on public.takes(project_id);
