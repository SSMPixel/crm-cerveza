-- =====================================================================
-- Esquema inicial del CRM (v1)
-- Se ejecuta una sola vez en Supabase (SQL Editor) sobre un proyecto vacío.
--
-- Idea central: cada registro pertenece a una EMPRESA (cliente).
-- Las reglas de seguridad (RLS) garantizan que:
--   - un KAM solo ve sus propias cuentas,
--   - un manager ve todo lo de su empresa,
--   - el auditor (fundador) ve todas las empresas.
-- =====================================================================

-- ---------- Tipos (listas cerradas de valores) ----------
create type rol_usuario      as enum ('kam', 'manager', 'auditor');
create type categoria_cuenta as enum ('A', 'B', 'C');
create type etapa_cuenta     as enum ('prospecto', 'contactado', 'degustacion',
                                      'negociacion', 'primer_pedido', 'activo', 'perdido');
create type tipo_objetivo    as enum ('grifo', 'carta', 'exhibicion');
create type tipo_solicitud   as enum ('reasignar', 'perdida');
create type estado_solicitud as enum ('pendiente', 'aprobada', 'rechazada');
create type visibilidad_com  as enum ('equipo', 'privada_manager');

-- ---------- Empresas (clientes) ----------
create table empresas (
  id                 uuid primary key default gen_random_uuid(),
  nombre             text not null,
  frecuencia_a_dias  int  not null default 7,
  frecuencia_b_dias  int  not null default 14,
  frecuencia_c_dias  int  not null default 30,
  radio_checkin_m    int  not null default 300,
  resumen_dia        int  not null default 1 check (resumen_dia between 1 and 7), -- 1 = lunes
  resumen_hora       time not null default '08:00',
  creada_en          timestamptz not null default now()
);

-- ---------- Perfiles (un perfil por usuario de login) ----------
create table perfiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  empresa_id  uuid references empresas (id) on delete cascade, -- vacío solo para el auditor
  nombre      text not null,
  correo      text not null,
  rol         rol_usuario not null,
  activo      boolean not null default true,
  creado_en   timestamptz not null default now(),
  check (rol = 'auditor' or empresa_id is not null)
);

-- ---------- Cuentas (clientes y prospectos de cada empresa) ----------
create table cuentas (
  id                 uuid primary key default gen_random_uuid(),
  empresa_id         uuid not null references empresas (id) on delete cascade,
  kam_id             uuid references perfiles (id) on delete set null,
  nombre             text not null,
  direccion          text,
  lat                double precision,
  lng                double precision,
  contacto_nombre    text,
  contacto_telefono  text,
  tipo_lugar         text,   -- bar, restaurante, tienda, cadena...
  zona               text,   -- colonia o zona
  categoria          categoria_cuenta not null default 'C',
  etapa              etapa_cuenta not null default 'prospecto',
  creada_en          timestamptz not null default now(),
  actualizada_en     timestamptz not null default now()
);
create index on cuentas (empresa_id);
create index on cuentas (kam_id);

-- ---------- Objetivos dentro de la cuenta (sí/no) ----------
create table objetivos_cuenta (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references empresas (id) on delete cascade,
  cuenta_id   uuid not null references cuentas (id) on delete cascade,
  tipo        tipo_objetivo not null,
  logrado     boolean not null default false,
  logrado_en  date,
  unique (cuenta_id, tipo)
);

-- ---------- Visitas ----------
create table visitas (
  id                  uuid primary key default gen_random_uuid(),
  empresa_id          uuid not null references empresas (id) on delete cascade,
  cuenta_id           uuid not null references cuentas (id) on delete cascade,
  kam_id              uuid not null references perfiles (id),
  fecha_hora          timestamptz not null default now(),
  lat                 double precision,
  lng                 double precision,
  distancia_m         int,
  fuera_de_rango      boolean not null default false,
  motivo_fuera_rango  text,
  nota                text,
  foto_url            text,
  check (not fuera_de_rango or motivo_fuera_rango is not null)
);
create index on visitas (cuenta_id, fecha_hora desc);
create index on visitas (kam_id, fecha_hora desc);

-- ---------- Pedidos reportados por el KAM ----------
create table pedidos (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references empresas (id) on delete cascade,
  cuenta_id   uuid not null references cuentas (id) on delete cascade,
  kam_id      uuid not null references perfiles (id),
  visita_id   uuid references visitas (id) on delete set null,
  fecha       date not null default current_date,
  monto_mxn   numeric(12, 2) not null check (monto_mxn > 0),
  nota        text
);
create index on pedidos (cuenta_id, fecha desc);

-- ---------- Próximas acciones ----------
create table proximas_acciones (
  id                uuid primary key default gen_random_uuid(),
  empresa_id        uuid not null references empresas (id) on delete cascade,
  cuenta_id         uuid not null references cuentas (id) on delete cascade,
  kam_id            uuid not null references perfiles (id),
  visita_id         uuid references visitas (id) on delete set null,
  descripcion       text not null,
  fecha_compromiso  date not null,
  cumplida          boolean not null default false,
  creada_en         timestamptz not null default now()
);
create index on proximas_acciones (kam_id, cumplida, fecha_compromiso);

-- ---------- Historial de cambios de etapa ----------
create table cambios_etapa (
  id               uuid primary key default gen_random_uuid(),
  empresa_id       uuid not null references empresas (id) on delete cascade,
  cuenta_id        uuid not null references cuentas (id) on delete cascade,
  etapa_anterior   etapa_cuenta,
  etapa_nueva      etapa_cuenta not null,
  usuario_id       uuid references perfiles (id),
  fecha            timestamptz not null default now()
);

-- ---------- Solicitudes que aprueba el manager ----------
create table solicitudes (
  id               uuid primary key default gen_random_uuid(),
  empresa_id       uuid not null references empresas (id) on delete cascade,
  cuenta_id        uuid not null references cuentas (id) on delete cascade,
  tipo             tipo_solicitud not null,
  solicitante_id   uuid not null references perfiles (id),
  kam_destino_id   uuid references perfiles (id),      -- solo para reasignar
  motivo           text,
  estado           estado_solicitud not null default 'pendiente',
  resuelta_por     uuid references perfiles (id),
  creada_en        timestamptz not null default now(),
  resuelta_en      timestamptz,
  check (tipo <> 'reasignar' or kam_destino_id is not null)
);

-- ---------- Comentarios y notas privadas ----------
create table comentarios (
  id           uuid primary key default gen_random_uuid(),
  empresa_id   uuid not null references empresas (id) on delete cascade,
  cuenta_id    uuid not null references cuentas (id) on delete cascade,
  autor_id     uuid not null references perfiles (id),
  texto        text not null,
  visibilidad  visibilidad_com not null default 'equipo',
  creado_en    timestamptz not null default now()
);

-- =====================================================================
-- Funciones de apoyo: ¿quién soy y de qué empresa?
-- =====================================================================
create or replace function mi_rol() returns rol_usuario
language sql stable security definer set search_path = public as $$
  select rol from perfiles where id = auth.uid() and activo
$$;

create or replace function mi_empresa() returns uuid
language sql stable security definer set search_path = public as $$
  select empresa_id from perfiles where id = auth.uid() and activo
$$;

create or replace function es_auditor() returns boolean
language sql stable as $$ select coalesce(mi_rol() = 'auditor', false) $$;

create or replace function es_manager_de(emp uuid) returns boolean
language sql stable as $$ select coalesce(mi_rol() = 'manager' and mi_empresa() = emp, false) $$;

create or replace function es_kam_de(emp uuid) returns boolean
language sql stable as $$ select coalesce(mi_rol() = 'kam' and mi_empresa() = emp, false) $$;

-- =====================================================================
-- Reglas de cuentas que la base de datos hace cumplir sola
-- =====================================================================

-- 1) Un KAM no puede reasignar cuentas ni darlas por perdidas directamente:
--    eso pasa por una solicitud que aprueba el manager.
create or replace function proteger_cuenta() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if mi_rol() = 'kam' then
    if new.kam_id is distinct from old.kam_id then
      raise exception 'Solo el manager puede reasignar una cuenta. Envía una solicitud.';
    end if;
    if new.etapa = 'perdido' and old.etapa <> 'perdido' then
      raise exception 'Solo el manager puede dar una cuenta por perdida. Envía una solicitud.';
    end if;
    if new.empresa_id is distinct from old.empresa_id then
      raise exception 'No se puede cambiar la empresa de una cuenta.';
    end if;
  end if;
  new.actualizada_en := now();
  return new;
end $$;

create trigger cuentas_proteger before update on cuentas
for each row execute function proteger_cuenta();

-- 2) Cada cambio de etapa queda registrado automáticamente.
create or replace function registrar_cambio_etapa() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.etapa is distinct from old.etapa then
    insert into cambios_etapa (empresa_id, cuenta_id, etapa_anterior, etapa_nueva, usuario_id)
    values (new.empresa_id, new.id,
            case when tg_op = 'UPDATE' then old.etapa end,
            new.etapa, auth.uid());
  end if;
  return new;
end $$;

create trigger cuentas_historial after insert or update on cuentas
for each row execute function registrar_cambio_etapa();

-- 3) Al aprobar una solicitud, se aplica el cambio en la cuenta.
create or replace function aplicar_solicitud() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.estado = 'aprobada' and old.estado = 'pendiente' then
    if new.tipo = 'reasignar' then
      update cuentas set kam_id = new.kam_destino_id where id = new.cuenta_id;
    else
      update cuentas set etapa = 'perdido' where id = new.cuenta_id;
    end if;
  end if;
  if new.estado <> 'pendiente' and old.estado = 'pendiente' then
    new.resuelta_por := auth.uid();
    new.resuelta_en := now();
  end if;
  return new;
end $$;

create trigger solicitudes_aplicar before update on solicitudes
for each row execute function aplicar_solicitud();

-- =====================================================================
-- Seguridad por filas (RLS): quién ve y quién cambia qué
-- =====================================================================
alter table empresas          enable row level security;
alter table perfiles          enable row level security;
alter table cuentas           enable row level security;
alter table objetivos_cuenta  enable row level security;
alter table visitas           enable row level security;
alter table pedidos           enable row level security;
alter table proximas_acciones enable row level security;
alter table cambios_etapa     enable row level security;
alter table solicitudes       enable row level security;
alter table comentarios       enable row level security;

-- Empresas: cada quien ve la suya; el auditor ve todas. Configura el manager o el auditor.
create policy empresas_ver on empresas for select
  using (es_auditor() or id = mi_empresa());
create policy empresas_editar on empresas for update
  using (es_auditor() or es_manager_de(id));
create policy empresas_crear on empresas for insert
  with check (es_auditor());

-- Perfiles: se ve al equipo de la propia empresa. Altas y cambios: manager o auditor.
create policy perfiles_ver on perfiles for select
  using (es_auditor() or id = auth.uid() or empresa_id = mi_empresa());
create policy perfiles_gestionar on perfiles for all
  using (es_auditor() or (es_manager_de(empresa_id) and rol <> 'auditor'))
  with check (es_auditor() or (es_manager_de(empresa_id) and rol <> 'auditor'));

-- Cuentas: el KAM solo las suyas; manager todas las de su empresa; auditor todo.
create policy cuentas_ver on cuentas for select
  using (es_auditor() or es_manager_de(empresa_id) or (es_kam_de(empresa_id) and kam_id = auth.uid()));
create policy cuentas_crear on cuentas for insert
  with check (es_auditor() or es_manager_de(empresa_id) or (es_kam_de(empresa_id) and kam_id = auth.uid()));
create policy cuentas_editar on cuentas for update
  using (es_auditor() or es_manager_de(empresa_id) or (es_kam_de(empresa_id) and kam_id = auth.uid()));
create policy cuentas_borrar on cuentas for delete
  using (es_auditor() or es_manager_de(empresa_id));

-- Tablas de actividad del KAM (visitas, pedidos, próximas acciones):
-- el KAM ve y registra lo suyo; manager y auditor ven todo lo de la empresa.
create policy visitas_ver on visitas for select
  using (es_auditor() or es_manager_de(empresa_id) or kam_id = auth.uid());
create policy visitas_crear on visitas for insert
  with check (kam_id = auth.uid() and es_kam_de(empresa_id)
              and exists (select 1 from cuentas c where c.id = cuenta_id and c.kam_id = auth.uid()));

create policy pedidos_ver on pedidos for select
  using (es_auditor() or es_manager_de(empresa_id) or kam_id = auth.uid());
create policy pedidos_crear on pedidos for insert
  with check (kam_id = auth.uid() and es_kam_de(empresa_id)
              and exists (select 1 from cuentas c where c.id = cuenta_id and c.kam_id = auth.uid()));
create policy pedidos_corregir on pedidos for update
  using (es_auditor() or es_manager_de(empresa_id) or kam_id = auth.uid());

create policy acciones_ver on proximas_acciones for select
  using (es_auditor() or es_manager_de(empresa_id) or kam_id = auth.uid());
create policy acciones_crear on proximas_acciones for insert
  with check (es_auditor() or es_manager_de(empresa_id) or (kam_id = auth.uid() and es_kam_de(empresa_id)));
create policy acciones_editar on proximas_acciones for update
  using (es_auditor() or es_manager_de(empresa_id) or kam_id = auth.uid());

-- Objetivos: los ve quien ve la cuenta; los marca el KAM dueño o el manager.
create policy objetivos_todo on objetivos_cuenta for all
  using (es_auditor() or es_manager_de(empresa_id)
         or exists (select 1 from cuentas c where c.id = cuenta_id and c.kam_id = auth.uid()))
  with check (es_auditor() or es_manager_de(empresa_id)
         or exists (select 1 from cuentas c where c.id = cuenta_id and c.kam_id = auth.uid()));

-- Historial de etapas: solo lectura (lo escribe el trigger).
create policy cambios_ver on cambios_etapa for select
  using (es_auditor() or es_manager_de(empresa_id)
         or exists (select 1 from cuentas c where c.id = cuenta_id and c.kam_id = auth.uid()));

-- Solicitudes: el KAM las crea y ve las suyas; el manager las ve y resuelve.
create policy solicitudes_ver on solicitudes for select
  using (es_auditor() or es_manager_de(empresa_id) or solicitante_id = auth.uid());
create policy solicitudes_crear on solicitudes for insert
  with check (solicitante_id = auth.uid() and estado = 'pendiente'
              and (es_kam_de(empresa_id) or es_manager_de(empresa_id)));
create policy solicitudes_resolver on solicitudes for update
  using (es_auditor() or es_manager_de(empresa_id));

-- Comentarios: los de equipo los ve quien ve la cuenta;
-- las notas privadas solo el manager de esa empresa y el auditor.
create policy comentarios_ver on comentarios for select
  using (
    es_auditor() or es_manager_de(empresa_id)
    or (visibilidad = 'equipo'
        and exists (select 1 from cuentas c where c.id = cuenta_id and c.kam_id = auth.uid()))
  );
create policy comentarios_crear on comentarios for insert
  with check (
    autor_id = auth.uid() and (
      es_auditor() or es_manager_de(empresa_id)
      or (visibilidad = 'equipo'
          and exists (select 1 from cuentas c where c.id = cuenta_id and c.kam_id = auth.uid()))
    )
  );
