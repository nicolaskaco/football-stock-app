-- Migration: add player_questionnaire table
-- One row per player; unique constraint enforces "only once" rule at DB level.

create table if not exists player_questionnaire (
  id                          uuid primary key default gen_random_uuid(),
  player_id                   uuid not null references players(id) on delete cascade,

  -- Contacto
  email                       text,
  telefono                    text,

  -- Documentos / identidad
  tiene_pasaporte_uy          boolean,
  tiene_pasaporte_ext         boolean,
  pais_pasaporte_ext          text,

  -- Salud
  tiene_prestador_salud       boolean,
  prestador_salud_cual        text,
  tiene_emergencia_movil      boolean,
  emergencia_movil_cual       text,

  -- Llegada al club
  anio_llegada_club           integer,
  liga_proviene               text,
  club_proviene               text,
  mediante_quien_llego        text,
  quien_capto                 text,

  -- Representante
  tiene_agente                boolean,
  agente_info                 text,

  -- Transporte al entrenamiento
  transporte_entrenamiento    text,
  transporte_entrenamiento_otro text,
  tiempo_entrenamiento        text,

  -- Centro educativo
  centro_educativo_tipo       text,   -- Publico | Privado | No Asiste
  centro_educativo_nombre     text,
  transporte_educativo        text,
  transporte_educativo_otro   text,
  tiempo_educativo            text,
  nivel_educativo             text,   -- último año aprobado
  repitio_anio                boolean,
  repitio_nivel               text,

  -- Entorno familiar / social
  antecedentes_adiciones      boolean,
  composicion_familiar        text,   -- número de habitantes
  convivencia_descripcion     text,
  comparte_tiempo_con         text,   -- semicolon-separated: padre;madre;hermanos;...

  -- Padre / tutor
  padre_nombre                text,
  padre_celular               text,
  padre_ocupacion             text,
  padre_nivel_educativo       text,
  padre_edad                  integer,

  -- Madre / tutora
  madre_nombre                text,
  madre_celular               text,
  madre_ocupacion             text,
  madre_nivel_educativo       text,
  madre_edad                  integer,

  -- Vivienda
  departamento                text,
  barrio                      text,
  direccion                   text,
  tenencia_vivienda           text,   -- Propietario | Inquilino | Ocupante
  condiciones_habitabilidad   text,   -- Adecuadas | Inadecuadas
  material_techo              text,
  material_paredes            text,
  material_piso               text,
  num_habitaciones            text,   -- 1 | 2 | 3 | 4 | mas de 5
  acceso_hogar                text,   -- semicolon-separated multiselect

  -- Comentario libre
  comentario_extra            text,

  -- Control
  completed_at                timestamptz not null default now(),

  unique (player_id)
);

-- Allow anyone to insert (the edge function uses service-role key, but this
-- lets the anon client insert as well if you later decide to call it directly).
-- Adjust RLS policies to match your security requirements.
alter table player_questionnaire enable row level security;

-- Policy: a player can insert their own row (matched by player_id).
-- The frontend passes the player id returned from the validate-player edge function.
create policy "player can insert own questionnaire"
  on player_questionnaire
  for insert
  with check (true);   -- edge function uses service-role, bypasses RLS anyway

-- Policy: allow admins (authenticated Supabase users) to read all rows.
create policy "admins can read all questionnaires"
  on player_questionnaire
  for select
  using (auth.role() = 'authenticated');

-- Policy: allow service-role reads (edge functions / backend).
-- Service role bypasses RLS, so this is just for completeness.
