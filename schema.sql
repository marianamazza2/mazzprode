-- =============================================================
-- mazzprode — esquema Supabase (Postgres)
-- Mundial 2026 — prode de semifinalistas, finalista y campeón
--
-- IDEMPOTENTE: este archivo se puede correr varias veces seguidas
-- sin romper (if not exists / create or replace / drop policy if exists
-- / on conflict do nothing).
-- =============================================================

-- Selecciones del Mundial 2026
create table if not exists teams (
  id serial primary key,
  name text not null,
  code text not null unique,
  flag_emoji text not null,
  group_name text not null
);

-- Participantes del prode
create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  instagram text,
  email text not null unique,
  has_business boolean not null default false,
  business_name text,
  consent boolean not null default false,
  created_at timestamptz not null default now()
);

-- Pronóstico (uno por participante)
create table if not exists predictions (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null unique references participants (id) on delete cascade,
  champion_id integer not null references teams (id),
  runner_up_id integer not null references teams (id),
  semifinal_3_id integer not null references teams (id),
  semifinal_4_id integer not null references teams (id),
  final_goals integer not null,
  points integer not null default 0
);

-- Resultados reales (fila única, id = 1)
create table if not exists results (
  id integer primary key default 1 check (id = 1),
  semifinalists integer[],
  runner_up_id integer references teams (id),
  champion_id integer references teams (id),
  final_goals integer,
  locked boolean not null default false
);

insert into results (id) values (1) on conflict (id) do nothing;

-- =============================================================
-- Helpers de autorización
-- El admin se identifica por el email del JWT de Supabase Auth.
-- ⚠️ Tiene que coincidir con VITE_ADMIN_EMAIL del front.
-- Si cambia el admin, editá SOLO este literal.
-- =============================================================
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() ->> 'email', '') = 'mfmazzariello@gmail.com'
$$;

-- =============================================================
-- Row Level Security
-- Único camino de escritura del público: submit_entry (security definer).
-- anon NO tiene INSERT/UPDATE/DELETE directo en participants ni predictions.
-- =============================================================
alter table teams        enable row level security;
alter table participants enable row level security;
alter table predictions  enable row level security;
alter table results      enable row level security;

-- teams: SELECT público, sin escrituras
drop policy if exists teams_public_select on teams;
create policy teams_public_select on teams
  for select to anon, authenticated
  using (true);

-- participants: anon sin acceso directo; admin autenticado lee/edita/borra
drop policy if exists participants_admin_select on participants;
create policy participants_admin_select on participants
  for select to authenticated
  using (public.is_admin());

drop policy if exists participants_admin_update on participants;
create policy participants_admin_update on participants
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists participants_admin_delete on participants;
create policy participants_admin_delete on participants
  for delete to authenticated
  using (public.is_admin());

-- predictions: sin INSERT directo de anon; SELECT/UPDATE solo admin
drop policy if exists predictions_admin_select on predictions;
create policy predictions_admin_select on predictions
  for select to authenticated
  using (public.is_admin());

drop policy if exists predictions_admin_update on predictions;
create policy predictions_admin_update on predictions
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- results: SELECT público (el front lee "locked"); INSERT/UPDATE solo admin
drop policy if exists results_public_select on results;
create policy results_public_select on results
  for select to anon, authenticated
  using (true);

drop policy if exists results_admin_insert on results;
create policy results_admin_insert on results
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists results_admin_update on results;
create policy results_admin_update on results
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- =============================================================
-- Grants (defensa en profundidad; las policies siguen mandando)
-- =============================================================
-- teams / results: lectura pública
grant select on teams   to anon, authenticated;
grant select on results to anon, authenticated;
-- results: el admin (authenticated) puede escribir, gateado por policy
grant insert, update on results to authenticated;

-- participants / predictions: anon SIN acceso directo de ningún tipo
revoke all on participants from anon;
revoke all on predictions  from anon;
-- admin (authenticated): operaciones gateadas por las policies de arriba
grant select, update, delete on participants to authenticated;
grant select, update         on predictions  to authenticated;

-- =============================================================
-- View leaderboard: lo único que ve el público del ranking.
-- NUNCA expone email. Corre con privilegios del owner (security_invoker
-- por defecto = false), así puede leer participants/predictions saltándose
-- la RLS de esas tablas. El público sólo tiene SELECT sobre la view.
-- =============================================================
create or replace view leaderboard as
  select
    pa.instagram,
    pa.name,
    pr.points,
    pr.final_goals,
    pa.created_at
  from predictions pr
  join participants pa on pa.id = pr.participant_id;

revoke all on leaderboard from anon, authenticated;
grant select on leaderboard to anon, authenticated;

-- =============================================================
-- submit_entry: inserta participante + pronóstico en una sola
-- transacción. Si falla cualquiera de los dos, no queda nada.
-- security definer para que funcione con RLS activado en las tablas.
--
-- Chequeos de cierre:
--   * p_consent debe ser true (RGPD)
--   * now() no puede superar el deadline (28/06/2026 23:59:59 -03,
--     igual que la constante DEADLINE del front)
--   * results.locked no puede estar en true
-- =============================================================
create or replace function submit_entry(
  p_name text,
  p_instagram text,
  p_email text,
  p_has_business boolean,
  p_business_name text,
  p_consent boolean,
  p_champion_id integer,
  p_runner_up_id integer,
  p_semifinal_3_id integer,
  p_semifinal_4_id integer,
  p_final_goals integer
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_participant_id uuid;
begin
  -- RGPD: sin consentimiento no se guarda nada
  if p_consent is not true then
    raise exception 'Consentimiento requerido (RGPD)';
  end if;

  -- Cierre por fecha límite (misma constante que el front)
  if now() > timestamptz '2026-06-28 23:59:59-03' then
    raise exception 'Pronósticos cerrados';
  end if;

  -- Cierre manual del admin
  if exists (select 1 from results where id = 1 and locked) then
    raise exception 'Pronósticos cerrados';
  end if;

  insert into participants (name, instagram, email, has_business, business_name, consent)
  values (p_name, p_instagram, p_email, p_has_business, p_business_name, p_consent)
  returning id into v_participant_id;

  insert into predictions (
    participant_id, champion_id, runner_up_id,
    semifinal_3_id, semifinal_4_id, final_goals
  )
  values (
    v_participant_id, p_champion_id, p_runner_up_id,
    p_semifinal_3_id, p_semifinal_4_id, p_final_goals
  );

  return v_participant_id;
end;
$$;

revoke all on function submit_entry(
  text, text, text, boolean, text, boolean,
  integer, integer, integer, integer, integer
) from public;

grant execute on function submit_entry(
  text, text, text, boolean, text, boolean,
  integer, integer, integer, integer, integer
) to anon;

-- =============================================================
-- recalculate_points: un solo UPDATE masivo cruzando predictions
-- con results (id = 1).
--   +10 por cada pick (campeón/subcampeón/semi3/semi4) que esté en
--       results.semifinalists
--   +25 si el subcampeón es exacto
--   +50 si el campeón es exacto
-- EXECUTE sólo para authenticated (lo dispara el admin).
-- =============================================================
create or replace function public.recalculate_points()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update predictions p
  set points =
      10 * (
        (case when p.champion_id    = any (r.semifinalists) then 1 else 0 end) +
        (case when p.runner_up_id   = any (r.semifinalists) then 1 else 0 end) +
        (case when p.semifinal_3_id = any (r.semifinalists) then 1 else 0 end) +
        (case when p.semifinal_4_id = any (r.semifinalists) then 1 else 0 end)
      )
      + (case when p.runner_up_id = r.runner_up_id then 25 else 0 end)
      + (case when p.champion_id  = r.champion_id  then 50 else 0 end)
  from results r
  where r.id = 1;
end;
$$;

revoke all on function public.recalculate_points() from public;
grant execute on function public.recalculate_points() to authenticated;

-- =============================================================
-- Las 48 selecciones del Mundial 2026 (sorteo del 5/12/2025,
-- repechajes de marzo 2026 ya resueltos)
-- =============================================================
insert into teams (name, code, flag_emoji, group_name) values
  -- Grupo A
  ('México',              'MEX', '🇲🇽', 'A'),
  ('Sudáfrica',           'RSA', '🇿🇦', 'A'),
  ('Corea del Sur',       'KOR', '🇰🇷', 'A'),
  ('Chequia',             'CZE', '🇨🇿', 'A'),
  -- Grupo B
  ('Canadá',              'CAN', '🇨🇦', 'B'),
  ('Suiza',               'SUI', '🇨🇭', 'B'),
  ('Catar',               'QAT', '🇶🇦', 'B'),
  ('Bosnia y Herzegovina','BIH', '🇧🇦', 'B'),
  -- Grupo C
  ('Brasil',              'BRA', '🇧🇷', 'C'),
  ('Marruecos',           'MAR', '🇲🇦', 'C'),
  ('Escocia',             'SCO', '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'C'),
  ('Haití',               'HAI', '🇭🇹', 'C'),
  -- Grupo D
  ('Estados Unidos',      'USA', '🇺🇸', 'D'),
  ('Paraguay',            'PAR', '🇵🇾', 'D'),
  ('Turquía',             'TUR', '🇹🇷', 'D'),
  ('Australia',           'AUS', '🇦🇺', 'D'),
  -- Grupo E
  ('Alemania',            'GER', '🇩🇪', 'E'),
  ('Ecuador',             'ECU', '🇪🇨', 'E'),
  ('Costa de Marfil',     'CIV', '🇨🇮', 'E'),
  ('Curazao',             'CUW', '🇨🇼', 'E'),
  -- Grupo F
  ('Países Bajos',        'NED', '🇳🇱', 'F'),
  ('Japón',               'JPN', '🇯🇵', 'F'),
  ('Suecia',              'SWE', '🇸🇪', 'F'),
  ('Túnez',               'TUN', '🇹🇳', 'F'),
  -- Grupo G
  ('Bélgica',             'BEL', '🇧🇪', 'G'),
  ('Irán',                'IRN', '🇮🇷', 'G'),
  ('Egipto',              'EGY', '🇪🇬', 'G'),
  ('Nueva Zelanda',       'NZL', '🇳🇿', 'G'),
  -- Grupo H
  ('España',              'ESP', '🇪🇸', 'H'),
  ('Uruguay',             'URU', '🇺🇾', 'H'),
  ('Arabia Saudita',      'KSA', '🇸🇦', 'H'),
  ('Cabo Verde',          'CPV', '🇨🇻', 'H'),
  -- Grupo I
  ('Francia',             'FRA', '🇫🇷', 'I'),
  ('Noruega',             'NOR', '🇳🇴', 'I'),
  ('Senegal',             'SEN', '🇸🇳', 'I'),
  ('Irak',                'IRQ', '🇮🇶', 'I'),
  -- Grupo J
  ('Argentina',           'ARG', '🇦🇷', 'J'),
  ('Austria',             'AUT', '🇦🇹', 'J'),
  ('Argelia',             'ALG', '🇩🇿', 'J'),
  ('Jordania',            'JOR', '🇯🇴', 'J'),
  -- Grupo K
  ('Portugal',            'POR', '🇵🇹', 'K'),
  ('Colombia',            'COL', '🇨🇴', 'K'),
  ('Uzbekistán',          'UZB', '🇺🇿', 'K'),
  ('RD Congo',            'COD', '🇨🇩', 'K'),
  -- Grupo L
  ('Inglaterra',          'ENG', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'L'),
  ('Croacia',             'CRO', '🇭🇷', 'L'),
  ('Ghana',               'GHA', '🇬🇭', 'L'),
  ('Panamá',              'PAN', '🇵🇦', 'L')
on conflict (code) do nothing;
