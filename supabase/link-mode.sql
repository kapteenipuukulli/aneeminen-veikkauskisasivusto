create table if not exists public.contest_players (
  id text primary key,
  initials text not null,
  display_name text not null,
  access_token text not null unique,
  is_admin boolean not null default false,
  avatar_url text,
  email text,
  email_notifications_enabled boolean not null default true,
  prediction_reminders_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.player_predictions (
  player_id text not null references public.contest_players(id) on delete cascade,
  match_id text not null references public.matches(id) on delete cascade,
  home_score integer not null check (home_score >= 0 and home_score <= 30),
  away_score integer not null check (away_score >= 0 and away_score <= 30),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (player_id, match_id)
);

create table if not exists public.player_champion_picks (
  player_id text primary key references public.contest_players(id) on delete cascade,
  team_name text not null references public.teams(name),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.player_notification_log (
  id uuid primary key default gen_random_uuid(),
  player_id text references public.contest_players(id) on delete cascade,
  kind text not null,
  entity_id text not null,
  sent_at timestamptz not null default now(),
  unique (player_id, kind, entity_id)
);

create table if not exists public.bracket_slots (
  slot_code text primary key,
  team_name text references public.teams(name),
  source text not null default 'admin',
  updated_by text references public.contest_players(id),
  updated_at timestamptz not null default now()
);

create or replace view public.player_leaderboard as
with match_points as (
  select
    p.player_id,
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
  from public.player_predictions p
  left join public.match_results r on r.match_id = p.match_id
  group by p.player_id
),
champion_points as (
  select
    cp.player_id,
    case when cp.team_name = (select value #>> '{}' from public.contest_settings where key = 'champion') then 20 else 0 end as champion_points
  from public.player_champion_picks cp
)
select
  pl.id,
  pl.initials,
  pl.display_name,
  pl.avatar_url,
  pl.is_admin,
  coalesce(mp.match_points, 0) as match_points,
  coalesce(cp.champion_points, 0) as champion_points,
  coalesce(mp.match_points, 0) + coalesce(cp.champion_points, 0) as total_points
from public.contest_players pl
left join match_points mp on mp.player_id = pl.id
left join champion_points cp on cp.player_id = pl.id
order by total_points desc, display_name asc;

alter table public.contest_players enable row level security;
alter table public.player_predictions enable row level security;
alter table public.player_champion_picks enable row level security;
alter table public.player_notification_log enable row level security;
alter table public.bracket_slots enable row level security;

drop trigger if exists contest_players_touch on public.contest_players;
create trigger contest_players_touch before update on public.contest_players for each row execute procedure public.touch_updated_at();

drop trigger if exists player_predictions_touch on public.player_predictions;
create trigger player_predictions_touch before update on public.player_predictions for each row execute procedure public.touch_updated_at();

drop trigger if exists player_champion_picks_touch on public.player_champion_picks;
create trigger player_champion_picks_touch before update on public.player_champion_picks for each row execute procedure public.touch_updated_at();

create or replace function public.touch_bracket_slot()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists bracket_slots_touch on public.bracket_slots;
create trigger bracket_slots_touch before update on public.bracket_slots for each row execute procedure public.touch_bracket_slot();
