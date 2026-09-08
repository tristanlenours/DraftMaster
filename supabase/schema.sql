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
  ('hugues', 'Hugues', 'Hugo', 'Turbo Rien / Le Johnny Osé', 'J''ai vu une combo avec cette saga et ce caillou. Si ça passe, c''est du génie !', 'ambitious', array['U', 'R', 'G'], 'https://api.dicebear.com/7.x/bottts/svg?seed=Hugues&backgroundColor=0e1115'),
  ('remi', 'Rémi', 'Le Rouxeleur', 'Le Maître des Rouxelettes', 'Attends, je peux vraiment jouer ça ? C''est légal ? Bon, je prends quand même !', 'medium', array['R', 'G', 'B'], 'https://api.dicebear.com/7.x/bottts/svg?seed=Remi&backgroundColor=0e1115'),
  ('papayou', 'Papayou', 'LaPapapaie', 'Le Roi des Légendaires', 'Une légendaire, c''est toujours plus fort. Regarde cette illustration !', 'ambitious', array['W', 'G', 'B'], 'https://api.dicebear.com/7.x/bottts/svg?seed=Papayou&backgroundColor=0e1115'),
  ('ivan', 'Ivan', 'Ivan le Grand', 'Le Ramp Ultime & Gros Thons', 'Pourquoi payer 2 manas pour un 2/2 quand on peut poser un 8/8 piétinement tour 4 ?', 'medium', array['G', 'U', 'R'], 'https://api.dicebear.com/7.x/bottts/svg?seed=Ivan&backgroundColor=0e1115'),
  ('theo', 'Théo', 'Théo Reanimator', 'Le Maître du Cimetière', 'Le cimetière est ma deuxième main. La défausse n''est qu''un début.', 'elite', array['B', 'U', 'R'], 'https://api.dicebear.com/7.x/bottts/svg?seed=Theo&backgroundColor=0e1115'),
  ('titou', 'Tristan', 'Titou', 'L''Architecte du Cube & Maître Tribal', 'Chaque carte a son âme, chaque guilde a son histoire. Bienvenue dans mon cube.', 'elite', array['W', 'U', 'B', 'R', 'G'], 'https://api.dicebear.com/7.x/bottts/svg?seed=Titou&backgroundColor=0e1115')
on conflict (slug) do nothing;
