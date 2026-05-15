create extension if not exists "pgcrypto";

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text not null,
  avatar_url text,
  email_notifications_enabled boolean not null default true,
  prediction_reminders_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  max_uses integer,
  used_count integer not null default 0,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.teams (
  name text primary key,
  group_code text not null,
  country_code text not null,
  flag text not null
);

create table public.matches (
  id text primary key,
  stage text not null,
  group_code text,
  home_team text not null,
  away_team text not null,
  starts_at timestamptz not null,
  tv text,
  city text,
  country text,
  status text not null default 'scheduled'
);

create table public.predictions (
  user_id uuid not null references public.profiles(id) on delete cascade,
  match_id text not null references public.matches(id) on delete cascade,
  home_score integer not null check (home_score >= 0 and home_score <= 30),
  away_score integer not null check (away_score >= 0 and away_score <= 30),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, match_id)
);

create table public.champion_picks (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  team_name text not null references public.teams(name),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.match_results (
  match_id text primary key references public.matches(id) on delete cascade,
  home_score integer not null check (home_score >= 0 and home_score <= 30),
  away_score integer not null check (away_score >= 0 and away_score <= 30),
  source text not null default 'admin',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.contest_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id text not null,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

create table public.notification_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  kind text not null,
  entity_id text not null,
  sent_at timestamptz not null default now(),
  unique (user_id, kind, entity_id)
);

create table public.news_cache (
  id text primary key,
  payload jsonb not null,
  fetched_at timestamptz not null default now()
);

create or replace view public.leaderboard as
with match_points as (
  select
    p.user_id,
    coalesce(sum(
      case
        when r.status <> 'approved' then 0
        when p.home_score = r.home_score and p.away_score = r.away_score then 6
        else
          case when sign(p.home_score - p.away_score) = sign(r.home_score - r.away_score) then 3 else 0 end +
          case when (p.home_score - p.away_score) = (r.home_score - r.away_score) then 2 else 0 end +
          case
            when (p.home_score = r.home_score and abs(p.away_score - r.away_score) <= 1)
              or (p.away_score = r.away_score and abs(p.home_score - r.home_score) <= 1)
            then 1 else 0
          end
      end
    ), 0)::integer as match_points
  from public.predictions p
  left join public.match_results r on r.match_id = p.match_id
  group by p.user_id
),
champion_points as (
  select
    cp.user_id,
    case when cp.team_name = (select value #>> '{}' from public.contest_settings where key = 'champion') then 20 else 0 end as champion_points
  from public.champion_picks cp
)
select
  pr.id,
  pr.display_name,
  pr.avatar_url,
  coalesce(mp.match_points, 0) as match_points,
  coalesce(cp.champion_points, 0) as champion_points,
  coalesce(mp.match_points, 0) + coalesce(cp.champion_points, 0) as total_points
from public.profiles pr
left join match_points mp on mp.user_id = pr.id
left join champion_points cp on cp.user_id = pr.id
order by total_points desc, display_name asc;

alter table public.profiles enable row level security;
alter table public.invites enable row level security;
alter table public.teams enable row level security;
alter table public.matches enable row level security;
alter table public.predictions enable row level security;
alter table public.champion_picks enable row level security;
alter table public.match_results enable row level security;
alter table public.contest_settings enable row level security;
alter table public.admin_audit_log enable row level security;
alter table public.notification_log enable row level security;
alter table public.news_cache enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = lower(coalesce(current_setting('app.admin_email', true), ''));
$$;

create policy "profiles are visible to signed in users" on public.profiles for select to authenticated using (true);
create policy "users update own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "teams visible" on public.teams for select to authenticated using (true);
create policy "matches visible" on public.matches for select to authenticated using (true);
create policy "approved results visible" on public.match_results for select to authenticated using (status = 'approved' or public.is_admin());
create policy "own predictions visible before lock" on public.predictions for select to authenticated using (
  auth.uid() = user_id
  or exists (select 1 from public.matches m where m.id = match_id and m.starts_at <= now())
  or public.is_admin()
);
create policy "users upsert own unlocked predictions" on public.predictions for insert to authenticated with check (
  auth.uid() = user_id and exists (select 1 from public.matches m where m.id = match_id and m.starts_at > now())
);
create policy "users update own unlocked predictions" on public.predictions for update to authenticated using (
  auth.uid() = user_id and exists (select 1 from public.matches m where m.id = match_id and m.starts_at > now())
) with check (auth.uid() = user_id);
create policy "champion picks visible to owner and admin" on public.champion_picks for select to authenticated using (auth.uid() = user_id or public.is_admin());
create policy "users set own champion before first match" on public.champion_picks for insert to authenticated with check (
  auth.uid() = user_id and now() < (select min(starts_at) from public.matches)
);
create policy "users update own champion before first match" on public.champion_picks for update to authenticated using (
  auth.uid() = user_id and now() < (select min(starts_at) from public.matches)
) with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles for each row execute procedure public.touch_updated_at();
create trigger predictions_touch before update on public.predictions for each row execute procedure public.touch_updated_at();
create trigger champion_picks_touch before update on public.champion_picks for each row execute procedure public.touch_updated_at();
create trigger match_results_touch before update on public.match_results for each row execute procedure public.touch_updated_at();
