-- =============================================================
-- mazzprode — esquema Supabase (Postgres)
-- Mundial 2026 — prode de semifinalistas, finalista y campeón
-- =============================================================

-- Selecciones del Mundial 2026
create table teams (
  id serial primary key,
  name text not null,
  code text not null unique,
  flag_emoji text not null,
  group_name text not null
);

-- Participantes del prode
create table participants (
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
create table predictions (
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
create table results (
  id integer primary key default 1 check (id = 1),
  semifinalists integer[],
  runner_up_id integer references teams (id),
  champion_id integer references teams (id),
  final_goals integer,
  locked boolean not null default false
);

insert into results (id) values (1);

-- =============================================================
-- submit_entry: inserta participante + pronóstico en una sola
-- transacción. Si falla cualquiera de los dos, no queda nada.
-- security definer para que funcione con RLS activado en las tablas.
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
  ('Panamá',              'PAN', '🇵🇦', 'L');
