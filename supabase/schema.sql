-- ==============================================================================
-- DRAFTMASTER (LMCDEU) — Schéma PostgreSQL Supabase & Données Initiales
-- ==============================================================================

-- 1. Table des Profils des Magiciens (Les 8 amis réels)
create table if not exists public.magiciens_profiles (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  nickname text not null,
  title text not null,
  quote text not null,
  level text not null default 'elite',
  preferred_colors text[] default array[]::text[],
  avatar_url text,
  total_drafts integer not null default 0,
  best_score numeric(4, 1) not null default 0.0,
  trophies_count integer not null default 0,
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- 2. Table des Records du Mur (Leaderboard & Decks)
create table if not exists public.draft_records (
  id text primary key,
  session_id text not null,
  magicien_slug text references public.magiciens_profiles(slug) on delete set null,
  player_name text not null,
  overall_score numeric(4, 1) not null,
  tier text not null default 'C',
  archetype jsonb not null default '{}'::jsonb,
  radar jsonb not null default '{}'::jsonb,
  macro_axes jsonb not null default '{}'::jsonb,
  draft_duration_seconds integer not null default 0,
  total_duration_seconds integer not null default 0,
  seed integer not null,
  cube_key text not null,
  is_homologated boolean not null default true,
  maindeck_cards jsonb not null default '[]'::jsonb,
  basic_lands jsonb not null default '{}'::jsonb,
  reports jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- Index pour requêtes rapides de classement
create index if not exists idx_draft_records_score on public.draft_records(overall_score desc, total_duration_seconds asc);
create index if not exists idx_draft_records_magicien on public.draft_records(magicien_slug);

-- 3. Table des Archives Complètes de Draft (Admin & 8 sièges)
create table if not exists public.admin_drafts (
  id text primary key,
  session_id text unique not null,
  seed integer not null,
  cube_key text not null,
  cube_name text not null,
  player_name text not null,
  started_at timestamptz not null,
  completed_at timestamptz not null,
  is_homologated boolean not null default true,
  seats jsonb not null default '[]'::jsonb,
  reports jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- 4. Activer Supabase Realtime sur les records de draft
-- Cela permet à tous les clients connectés d'être notifiés dès qu'un deck est validé !
alter publication supabase_realtime add table public.draft_records;

-- 5. Sécurité : Politiques RLS (Row Level Security)
alter table public.magiciens_profiles enable row level security;
alter table public.draft_records enable row level security;
alter table public.admin_drafts enable row level security;

-- Lecture publique pour tout le monde
create policy "Lecture publique magiciens_profiles"
  on public.magiciens_profiles for select
  using (true);

create policy "Lecture publique draft_records"
  on public.draft_records for select
  using (true);

create policy "Lecture publique admin_drafts"
  on public.admin_drafts for select
  using (true);

-- Insertion autorisée pour le jeu (clé anon ou service role)
create policy "Insertion draft_records"
  on public.draft_records for insert
  with check (true);

create policy "Insertion admin_drafts"
  on public.admin_drafts for insert
  with check (true);

create policy "Mise à jour profils"
  on public.magiciens_profiles for update
  using (true);

-- 6. Données Initiales : Les 8 Magiciens Officiels
insert into public.magiciens_profiles (slug, name, nickname, title, quote, level, preferred_colors, avatar_url)
values
  ('nico', 'Nico', 'Big Nixos', 'Le Spike Impitoyable', 'Je prends ce qui gagne. Pas de sentiments en draft.', 'elite', array['U', 'B', 'W'], 'https://api.dicebear.com/7.x/bottts/svg?seed=Nico&backgroundColor=0e1115'),
  ('cedric', 'Cédric', 'Jakko', 'Meilleur Joueur de sa Génération', 'Un play propre, de la value, et la courbe parfaite. La base du beau jeu.', 'elite', array['U', 'R', 'W'], 'https://api.dicebear.com/7.x/bottts/svg?seed=Cedric&backgroundColor=0e1115'),
  ('hugues', 'Hugues', 'HugE', 'Turbo Rien / Le Johnny Osé', 'J''ai vu une combo avec cette saga et ce caillou. Si ça passe, c''est du génie !', 'ambitious', array['U', 'R', 'G'], 'https://api.dicebear.com/7.x/bottts/svg?seed=Hugues&backgroundColor=0e1115'),
  ('remi', 'Rémi', 'Le Rouxeleur', 'Le Maître des Rouxelettes', 'Attends, je peux vraiment jouer ça ? C''est légal ? Bon, je prends quand même !', 'medium', array['R', 'G', 'B'], 'https://api.dicebear.com/7.x/bottts/svg?seed=Remi&backgroundColor=0e1115'),
  ('papayou', 'Papayou', 'Papayourt', 'Le Roi des Légendaires', 'Une légendaire, c''est toujours plus fort. Regarde cette illustration !', 'ambitious', array['W', 'G', 'B'], 'https://api.dicebear.com/7.x/bottts/svg?seed=Papayou&backgroundColor=0e1115'),
  ('ivan', 'Ivan', 'Ivan le Grand', 'Le Ramp Ultime & Gros Thons', 'Pourquoi payer 2 manas pour un 2/2 quand on peut poser un 8/8 piétinement tour 4 ?', 'medium', array['G', 'U', 'R'], 'https://api.dicebear.com/7.x/bottts/svg?seed=Ivan&backgroundColor=0e1115'),
  ('theo', 'Théo', 'Théo Reanimator', 'Le Maître du Cimetière', 'Le cimetière est ma deuxième main. La défausse n''est qu''un début.', 'elite', array['B', 'U', 'R'], 'https://api.dicebear.com/7.x/bottts/svg?seed=Theo&backgroundColor=0e1115'),
  ('titou', 'Tristan', 'Titou', 'L''Architecte du Cube & Maître Tribal', 'Chaque carte a son âme, chaque guilde a son histoire. Bienvenue dans mon cube.', 'elite', array['W', 'U', 'B', 'R', 'G'], 'https://api.dicebear.com/7.x/bottts/svg?seed=Titou&backgroundColor=0e1115')
on conflict (slug) do nothing;

-- 7. Draft multijoueur : etat durable prive, journal append-only et commandes idempotentes
create table if not exists public.multiplayer_lobbies (
  id text primary key check (id = 'global'),
  generation integer not null default 0 check (generation >= 0),
  revision bigint not null default 0 check (revision >= 0),
  status text not null default 'open' check (status in ('open', 'drafting')),
  state jsonb not null,
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.multiplayer_sessions (
  id text primary key,
  lobby_generation integer not null check (lobby_generation > 0),
  revision bigint not null default 0 check (revision >= 0),
  status text not null check (status in ('drafting', 'deckbuilding', 'abandoned')),
  snapshot_id text not null,
  snapshot_sha256 text not null check (snapshot_sha256 ~ '^[0-9a-f]{64}$'),
  engine_version text not null,
  state jsonb not null,
  started_at timestamptz not null,
  completed_at timestamptz,
  abandoned_at timestamptz,
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.multiplayer_events (
  scope_id text not null,
  sequence bigint not null check (sequence > 0),
  revision bigint not null check (revision >= 0),
  request_id text not null,
  participant_id text,
  event_type text not null,
  occurred_at timestamptz not null,
  payload jsonb not null,
  primary key (scope_id, sequence)
);

create index if not exists idx_multiplayer_events_request
  on public.multiplayer_events(scope_id, request_id);

create table if not exists public.multiplayer_command_receipts (
  scope_id text not null,
  request_id text not null,
  request_fingerprint text not null check (request_fingerprint ~ '^[0-9a-f]{64}$'),
  participant_id text,
  revision_before bigint not null,
  revision_after bigint not null,
  response jsonb not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  primary key (scope_id, request_id)
);

create table if not exists public.multiplayer_resume_access (
  participant_id text primary key,
  scope_id text not null,
  token_hash text unique not null check (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.multiplayer_deck_workspaces (
  session_id text not null references public.multiplayer_sessions(id) on delete cascade,
  participant_id text not null,
  revision bigint not null default 0 check (revision >= 0),
  status text not null default 'editing' check (status in ('editing', 'finalized')),
  workspace jsonb not null,
  updated_at timestamptz not null default timezone('utc'::text, now()),
  primary key (session_id, participant_id)
);

alter table public.multiplayer_lobbies enable row level security;
alter table public.multiplayer_sessions enable row level security;
alter table public.multiplayer_events enable row level security;
alter table public.multiplayer_command_receipts enable row level security;
alter table public.multiplayer_resume_access enable row level security;
alter table public.multiplayer_deck_workspaces enable row level security;

insert into public.multiplayer_lobbies (id, state)
values (
  'global',
  '{"lobby":{"lobbyId":"global","generation":0,"revision":0,"status":"open","cubeKey":null,"cubeLocked":false,"activeSessionId":null,"participants":[],"seats":[null,null,null,null,null,null,null,null]},"events":[]}'::jsonb
)
on conflict (id) do nothing;

create or replace function public.commit_multiplayer_lobby(
  p_expected_revision bigint,
  p_request_id text,
  p_request_fingerprint text,
  p_participant_id text,
  p_next_state jsonb,
  p_events jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current public.multiplayer_lobbies%rowtype;
  v_receipt public.multiplayer_command_receipts%rowtype;
  v_event jsonb;
  v_next_revision bigint;
begin
  select * into v_receipt
  from public.multiplayer_command_receipts
  where scope_id = 'global' and request_id = p_request_id;

  if found then
    if v_receipt.request_fingerprint <> p_request_fingerprint then
      return jsonb_build_object(
        'ok', false,
        'code', 'IDEMPOTENCY_CONFLICT',
        'currentRevision', v_receipt.revision_after
      );
    end if;
    return jsonb_build_object(
      'ok', true,
      'duplicate', true,
      'state', v_receipt.response
    );
  end if;

  select * into v_current
  from public.multiplayer_lobbies
  where id = 'global'
  for update;

  if v_current.revision <> p_expected_revision then
    return jsonb_build_object(
      'ok', false,
      'code', 'REVISION_CONFLICT',
      'currentRevision', v_current.revision
    );
  end if;

  v_next_revision := (p_next_state #>> '{lobby,revision}')::bigint;
  if v_next_revision <> p_expected_revision + 1 then
    raise exception 'Invalid multiplayer revision transition';
  end if;

  for v_event in select value from jsonb_array_elements(p_events)
  loop
    insert into public.multiplayer_events (
      scope_id,
      sequence,
      revision,
      request_id,
      participant_id,
      event_type,
      occurred_at,
      payload
    ) values (
      coalesce(v_event->>'scopeId', 'global'),
      (v_event->>'sequence')::bigint,
      (v_event->>'revision')::bigint,
      v_event->>'requestId',
      v_event->>'participantId',
      v_event->>'type',
      (v_event->>'occurredAt')::timestamptz,
      v_event
    ) on conflict (scope_id, sequence) do nothing;
  end loop;

  update public.multiplayer_lobbies
  set generation = (p_next_state #>> '{lobby,generation}')::integer,
      revision = v_next_revision,
      status = p_next_state #>> '{lobby,status}',
      state = p_next_state,
      updated_at = timezone('utc'::text, now())
  where id = 'global';

  insert into public.multiplayer_command_receipts (
    scope_id,
    request_id,
    request_fingerprint,
    participant_id,
    revision_before,
    revision_after,
    response
  ) values (
    'global',
    p_request_id,
    p_request_fingerprint,
    p_participant_id,
    p_expected_revision,
    v_next_revision,
    p_next_state
  );

  return jsonb_build_object('ok', true, 'duplicate', false, 'state', p_next_state);
end;
$$;

revoke all on table public.multiplayer_lobbies from anon, authenticated;
revoke all on table public.multiplayer_sessions from anon, authenticated;
revoke all on table public.multiplayer_events from anon, authenticated;
revoke all on table public.multiplayer_command_receipts from anon, authenticated;
revoke all on table public.multiplayer_resume_access from anon, authenticated;
revoke all on table public.multiplayer_deck_workspaces from anon, authenticated;
revoke all on function public.commit_multiplayer_lobby(bigint, text, text, text, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.commit_multiplayer_lobby(bigint, text, text, text, jsonb, jsonb) to service_role;
