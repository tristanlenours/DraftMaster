-- Gestion durable des tournois de cube.
-- Toutes les mutations passent par commit_tournament ; les tables restent privées.

create table if not exists public.cube_snapshot_archive (
  snapshot_id text not null,
  canonical_sha256 text not null check (canonical_sha256 ~ '^[0-9a-f]{64}$'),
  cube_key text not null,
  cube_name text not null,
  payload jsonb not null,
  archived_at timestamptz not null default timezone('utc'::text, now()),
  primary key (snapshot_id, canonical_sha256)
);

create table if not exists public.tournaments (
  id text primary key,
  name text not null,
  status text not null check (status in ('preparation', 'active', 'completed')),
  format text check (format is null or format in ('swiss', 'round-robin-three', 'round-robin')),
  planned_round_count integer check (
    planned_round_count is null or planned_round_count between 1 and 31
  ),
  cube_key text,
  snapshot_id text,
  snapshot_sha256 text check (
    snapshot_sha256 is null or snapshot_sha256 ~ '^[0-9a-f]{64}$'
  ),
  revision bigint not null check (revision >= 0),
  schema_version integer not null check (schema_version = 1),
  pairing_engine_version text not null,
  state jsonb not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  started_at timestamptz,
  completed_at timestamptz,
  constraint tournaments_snapshot_reference_fk
    foreign key (snapshot_id, snapshot_sha256)
    references public.cube_snapshot_archive(snapshot_id, canonical_sha256)
);

create index if not exists idx_tournaments_status_updated
  on public.tournaments(status, updated_at desc);

create table if not exists public.tournament_events (
  tournament_id text not null references public.tournaments(id) on delete restrict,
  sequence bigint not null check (sequence > 0),
  revision bigint not null check (revision >= 0),
  request_id text not null,
  event_type text not null,
  occurred_at timestamptz not null,
  payload jsonb not null,
  primary key (tournament_id, sequence)
);

create index if not exists idx_tournament_events_request
  on public.tournament_events(tournament_id, request_id);

create table if not exists public.tournament_command_receipts (
  scope_id text not null,
  request_id text not null,
  tournament_id text not null references public.tournaments(id) on delete restrict,
  request_fingerprint text not null check (request_fingerprint ~ '^[0-9a-f]{64}$'),
  revision_before bigint check (revision_before is null or revision_before >= 0),
  revision_after bigint not null check (revision_after >= 0),
  response jsonb not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  primary key (scope_id, request_id)
);

alter table public.cube_snapshot_archive enable row level security;
alter table public.tournaments enable row level security;
alter table public.tournament_events enable row level security;
alter table public.tournament_command_receipts enable row level security;

create or replace function public.commit_tournament(
  p_scope_id text,
  p_tournament_id text,
  p_expected_revision bigint,
  p_request_id text,
  p_request_fingerprint text,
  p_snapshot_archives jsonb,
  p_events jsonb,
  p_next_state jsonb,
  p_response jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current public.tournaments%rowtype;
  v_receipt public.tournament_command_receipts%rowtype;
  v_snapshot jsonb;
  v_event jsonb;
  v_expected_next_revision bigint;
  v_last_sequence bigint;
  v_event_sequence bigint;
  v_format text;
  v_planned_round_count integer;
  v_cube_key text;
  v_snapshot_id text;
  v_snapshot_sha256 text;
begin
  if p_scope_id is null or btrim(p_scope_id) = '' or
     p_tournament_id is null or btrim(p_tournament_id) = '' or
     p_request_id is null or btrim(p_request_id) = '' or
     p_request_fingerprint !~ '^[0-9a-f]{64}$' or
     jsonb_typeof(p_snapshot_archives) <> 'array' or
     jsonb_typeof(p_events) <> 'array' or
     jsonb_typeof(p_next_state) <> 'object' or
     jsonb_typeof(p_response) <> 'object' then
    return jsonb_build_object('ok', false, 'code', 'INVALID_INPUT', 'details', '{}'::jsonb);
  end if;

  if (p_expected_revision is null and p_scope_id <> 'tournaments') or
     (p_expected_revision is not null and p_scope_id <> p_tournament_id) then
    return jsonb_build_object('ok', false, 'code', 'INVALID_INPUT', 'details', '{}'::jsonb);
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_scope_id || ':' || p_request_id, 0));

  select * into v_receipt
  from public.tournament_command_receipts
  where scope_id = p_scope_id and request_id = p_request_id;

  if found then
    if v_receipt.request_fingerprint <> p_request_fingerprint then
      return jsonb_build_object(
        'ok', false,
        'code', 'IDEMPOTENCY_CONFLICT',
        'details', jsonb_build_object('currentRevision', v_receipt.revision_after)
      );
    end if;
    return jsonb_build_object(
      'ok', true,
      'kind', 'replayed',
      'tournament', v_receipt.response
    );
  end if;

  select * into v_current
  from public.tournaments
  where id = p_tournament_id
  for update;

  if p_expected_revision is null then
    if found then
      return jsonb_build_object(
        'ok', false,
        'code', 'REVISION_CONFLICT',
        'details', jsonb_build_object('currentRevision', v_current.revision)
      );
    end if;
    v_expected_next_revision := 0;
  else
    if not found then
      return jsonb_build_object(
        'ok', false,
        'code', 'TOURNAMENT_NOT_FOUND',
        'details', jsonb_build_object('tournamentId', p_tournament_id)
      );
    end if;
    if v_current.revision <> p_expected_revision then
      return jsonb_build_object(
        'ok', false,
        'code', 'REVISION_CONFLICT',
        'details', jsonb_build_object('currentRevision', v_current.revision)
      );
    end if;
    v_expected_next_revision := p_expected_revision + 1;
  end if;

  if p_next_state->>'tournamentId' <> p_tournament_id or
     (p_next_state->>'revision')::bigint <> v_expected_next_revision then
    return jsonb_build_object(
      'ok', false,
      'code', 'INVALID_INPUT',
      'details', jsonb_build_object('expectedRevision', v_expected_next_revision)
    );
  end if;

  for v_snapshot in select value from jsonb_array_elements(p_snapshot_archives)
  loop
    insert into public.cube_snapshot_archive (
      snapshot_id,
      canonical_sha256,
      cube_key,
      cube_name,
      payload
    ) values (
      v_snapshot->>'snapshotId',
      v_snapshot->>'canonicalSha256',
      v_snapshot->>'cubeKey',
      v_snapshot->>'cubeName',
      v_snapshot->'payload'
    ) on conflict (snapshot_id, canonical_sha256) do nothing;
  end loop;

  v_format := p_next_state->>'format';
  v_planned_round_count := (p_next_state->>'plannedRoundCount')::integer;
  v_cube_key := p_next_state #>> '{cube,cubeKey}';
  v_snapshot_id := p_next_state #>> '{cube,snapshotId}';
  v_snapshot_sha256 := p_next_state #>> '{cube,canonicalSha256}';

  if p_expected_revision is null then
    insert into public.tournaments (
      id,
      name,
      status,
      format,
      planned_round_count,
      cube_key,
      snapshot_id,
      snapshot_sha256,
      revision,
      schema_version,
      pairing_engine_version,
      state,
      created_at,
      updated_at,
      started_at,
      completed_at
    ) values (
      p_tournament_id,
      p_next_state->>'name',
      p_next_state->>'status',
      v_format,
      v_planned_round_count,
      v_cube_key,
      v_snapshot_id,
      v_snapshot_sha256,
      v_expected_next_revision,
      (p_next_state->>'schemaVersion')::integer,
      p_next_state->>'pairingEngineVersion',
      p_next_state,
      (p_next_state->>'createdAt')::timestamptz,
      (p_next_state->>'updatedAt')::timestamptz,
      (p_next_state->>'startedAt')::timestamptz,
      (p_next_state->>'completedAt')::timestamptz
    );
  else
    update public.tournaments
    set name = p_next_state->>'name',
        status = p_next_state->>'status',
        format = v_format,
        planned_round_count = v_planned_round_count,
        cube_key = v_cube_key,
        snapshot_id = v_snapshot_id,
        snapshot_sha256 = v_snapshot_sha256,
        revision = v_expected_next_revision,
        schema_version = (p_next_state->>'schemaVersion')::integer,
        pairing_engine_version = p_next_state->>'pairingEngineVersion',
        state = p_next_state,
        updated_at = (p_next_state->>'updatedAt')::timestamptz,
        started_at = (p_next_state->>'startedAt')::timestamptz,
        completed_at = (p_next_state->>'completedAt')::timestamptz
    where id = p_tournament_id;
  end if;

  select coalesce(max(sequence), 0) into v_last_sequence
  from public.tournament_events
  where tournament_id = p_tournament_id;

  for v_event in select value from jsonb_array_elements(p_events)
  loop
    v_event_sequence := (v_event->>'sequence')::bigint;
    if v_event_sequence <> v_last_sequence + 1 or
       v_event->>'tournamentId' <> p_tournament_id or
       (v_event->>'revision')::bigint <> v_expected_next_revision or
       v_event->>'requestId' <> p_request_id then
      raise exception 'Invalid tournament event sequence or identity';
    end if;
    insert into public.tournament_events (
      tournament_id,
      sequence,
      revision,
      request_id,
      event_type,
      occurred_at,
      payload
    ) values (
      p_tournament_id,
      v_event_sequence,
      (v_event->>'revision')::bigint,
      v_event->>'requestId',
      v_event->>'type',
      (v_event->>'occurredAt')::timestamptz,
      v_event
    );
    v_last_sequence := v_event_sequence;
  end loop;

  insert into public.tournament_command_receipts (
    scope_id,
    request_id,
    tournament_id,
    request_fingerprint,
    revision_before,
    revision_after,
    response
  ) values (
    p_scope_id,
    p_request_id,
    p_tournament_id,
    p_request_fingerprint,
    p_expected_revision,
    v_expected_next_revision,
    p_response
  );

  return jsonb_build_object(
    'ok', true,
    'kind', 'committed',
    'tournament', p_response
  );
end;
$$;

revoke all on table public.cube_snapshot_archive from public, anon, authenticated;
revoke all on table public.tournaments from public, anon, authenticated;
revoke all on table public.tournament_events from public, anon, authenticated;
revoke all on table public.tournament_command_receipts from public, anon, authenticated;

grant select, insert, update, delete on table public.cube_snapshot_archive to service_role;
grant select, insert, update, delete on table public.tournaments to service_role;
grant select, insert, update, delete on table public.tournament_events to service_role;
grant select, insert, update, delete on table public.tournament_command_receipts to service_role;

revoke all on function public.commit_tournament(
  text, text, bigint, text, text, jsonb, jsonb, jsonb, jsonb
) from public, anon, authenticated;
grant execute on function public.commit_tournament(
  text, text, bigint, text, text, jsonb, jsonb, jsonb, jsonb
) to service_role;
