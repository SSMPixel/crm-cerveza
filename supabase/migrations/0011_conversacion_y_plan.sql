-- =====================================================================
-- 0011 · Conversación por cuenta (avisos de mensajes nuevos)
--        y plan del día del KAM (para comparar plan contra realidad)
-- =====================================================================

-- ---------- Conversación ----------
-- Hasta cuándo vio cada persona la conversación de cada cuenta.
create table if not exists comentarios_vistos (
  perfil_id  uuid not null references perfiles (id) on delete cascade,
  cuenta_id  uuid not null references cuentas (id) on delete cascade,
  visto_en   timestamptz not null default now(),
  primary key (perfil_id, cuenta_id)
);
alter table comentarios_vistos enable row level security;
drop policy if exists comentarios_vistos_propios on comentarios_vistos;
create policy comentarios_vistos_propios on comentarios_vistos for all
  using (perfil_id = auth.uid()) with check (perfil_id = auth.uid());

create index if not exists comentarios_cuenta_fecha on comentarios (cuenta_id, creado_en);

create or replace function marcar_comentarios_vistos(p_cuenta uuid) returns void
language sql as $$
  insert into comentarios_vistos (perfil_id, cuenta_id, visto_en)
  values (auth.uid(), p_cuenta, now())
  on conflict (perfil_id, cuenta_id) do update set visto_en = now();
$$;

-- Mensajes que otros escribieron y yo no he visto (últimos 14 días).
-- Corre con los permisos de quien pregunta: solo cuenta lo que puede ver.
create or replace function comentarios_sin_leer(p_empresa uuid default null)
returns table (cuenta_id uuid, cuenta text, nuevos int, ultimo_texto text,
               ultimo_autor text, ultimo_en timestamptz)
language sql stable as $$
  select c.cuenta_id, cu.nombre, count(*)::int,
         (array_agg(c.texto order by c.creado_en desc))[1],
         (array_agg(p.nombre order by c.creado_en desc))[1],
         max(c.creado_en)
  from comentarios c
  join cuentas cu on cu.id = c.cuenta_id
  join perfiles p on p.id = c.autor_id
  left join comentarios_vistos v on v.cuenta_id = c.cuenta_id and v.perfil_id = auth.uid()
  where c.autor_id <> auth.uid()
    and c.creado_en > now() - interval '14 days'
    and c.creado_en > coalesce(v.visto_en, '-infinity'::timestamptz)
    and (p_empresa is null or c.empresa_id = p_empresa)
  group by c.cuenta_id, cu.nombre
  order by max(c.creado_en) desc;
$$;

-- ---------- Plan del día ----------
-- La primera vez que el KAM abre la app en el día se fija su plan sugerido.
create table if not exists planes_dia (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references empresas (id) on delete cascade,
  kam_id      uuid not null references perfiles (id) on delete cascade,
  fecha       date not null,
  cuentas     uuid[] not null,
  creado_en   timestamptz not null default now(),
  unique (kam_id, fecha)
);
create index if not exists planes_dia_empresa_fecha on planes_dia (empresa_id, fecha);
alter table planes_dia enable row level security;
drop policy if exists planes_ver on planes_dia;
create policy planes_ver on planes_dia for select
  using (es_auditor() or es_manager_de(empresa_id) or kam_id = auth.uid());
drop policy if exists planes_crear on planes_dia;
create policy planes_crear on planes_dia for insert
  with check (kam_id = auth.uid() and es_kam_de(empresa_id));

-- Guarda el plan de hoy si aún no existe y devuelve el que quedó fijo.
create or replace function fijar_plan_dia(p_cuentas uuid[]) returns uuid[]
language plpgsql as $$
declare
  v uuid[];
begin
  if coalesce(array_length(p_cuentas, 1), 0) > 0 then
    insert into planes_dia (empresa_id, kam_id, fecha, cuentas)
    values (mi_empresa(), auth.uid(), hoy_mx(), p_cuentas)
    on conflict (kam_id, fecha) do nothing;
  end if;
  select cuentas into v from planes_dia where kam_id = auth.uid() and fecha = hoy_mx();
  return v;
end $$;
