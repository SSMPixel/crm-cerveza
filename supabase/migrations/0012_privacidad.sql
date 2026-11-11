-- =====================================================================
-- 0012 · Privacidad
--   1) No se guardan las coordenadas del KAM: solo distancia, precisión y hora.
--   2) Aviso de privacidad de cada cliente, con versiones y constancia de lectura.
--   3) Plazos de conservación: borrado automático (lo corre el proceso diario).
-- =====================================================================

-- ---------- 1) Ubicación del KAM ----------
alter table visitas add column if not exists precision_m int;

-- Las coordenadas del celular se usan solo para calcular la distancia y se descartan.
-- Excepción: si la cuenta no tenía ubicación, la primera visita fija la del PUNTO DE VENTA
-- (es la ubicación del negocio, no un registro de dónde estuvo la persona).
create or replace function calcular_rango_visita() returns trigger
language plpgsql set search_path = public as $$
declare
  c_lat float8; c_lng float8; radio int;
begin
  -- Cargas administrativas (SQL Editor, datos de prueba): se respetan, pero sin coordenadas.
  if current_user not in ('authenticated', 'anon') then
    new.lat := null;
    new.lng := null;
    return new;
  end if;

  select c.lat, c.lng, e.radio_checkin_m into c_lat, c_lng, radio
  from cuentas c join empresas e on e.id = c.empresa_id
  where c.id = new.cuenta_id;

  -- La hora la pone el servidor, no el celular.
  new.fecha_hora := now();

  if new.lat is null or new.lng is null then
    new.distancia_m := null;
    new.fuera_de_rango := true;
  elsif c_lat is null or c_lng is null then
    new.distancia_m := 0;
    new.fuera_de_rango := false;
    update cuentas set lat = new.lat, lng = new.lng where id = new.cuenta_id;
  else
    new.distancia_m := distancia_m(c_lat, c_lng, new.lat, new.lng);
    new.fuera_de_rango := new.distancia_m > radio;
  end if;

  -- Ya se usaron: no se guardan.
  new.lat := null;
  new.lng := null;

  if new.fuera_de_rango and coalesce(trim(new.motivo_fuera_rango), '') = '' then
    raise exception 'FUERA_DE_RANGO_SIN_MOTIVO'
      using hint = 'La visita está lejos de la cuenta o sin ubicación: indica el motivo.';
  end if;
  return new;
end $$;

-- Borrar las coordenadas que ya se habían guardado y garantizar que no vuelvan.
update visitas set lat = null, lng = null where lat is not null or lng is not null;
alter table visitas drop constraint if exists visitas_sin_coordenadas;
alter table visitas add constraint visitas_sin_coordenadas check (lat is null and lng is null);

-- registrar_visita recibe además la precisión del GPS.
drop function if exists registrar_visita(uuid, float8, float8, text, text, text, date, boolean,
                                         numeric, etapa_cuenta, resultado_visita, text[]);

create function registrar_visita(
  p_cuenta_id          uuid,
  p_lat                float8,
  p_lng                float8,
  p_motivo             text,
  p_nota               text,
  p_accion_descripcion text,
  p_accion_fecha       date,
  p_cumplio_anterior   boolean default true,
  p_monto_pedido       numeric default null,
  p_nueva_etapa        etapa_cuenta default null,
  p_resultado          resultado_visita default null,
  p_fotos              text[] default '{}',
  p_precision          int default null
) returns table (visita_id uuid, fuera_de_rango boolean, distancia int)
language plpgsql security invoker set search_path = public as $$
declare
  v_emp uuid;
  v_visita visitas%rowtype;
begin
  if coalesce(trim(p_accion_descripcion), '') = '' or p_accion_fecha is null then
    raise exception 'FALTA_PROXIMA_ACCION' using hint = 'Toda visita termina con una próxima acción y su fecha.';
  end if;
  if p_accion_fecha < hoy_mx() then
    raise exception 'FECHA_EN_PASADO' using hint = 'La próxima acción no puede tener fecha pasada.';
  end if;

  select empresa_id into v_emp from cuentas where id = p_cuenta_id;
  if v_emp is null then
    raise exception 'CUENTA_NO_ENCONTRADA';
  end if;

  if exists (
    select 1 from unnest(coalesce(p_fotos, '{}')) f
    where f not like v_emp::text || '/' || p_cuenta_id::text || '/%'
  ) then
    raise exception 'FOTO_INVALIDA';
  end if;

  insert into visitas (empresa_id, cuenta_id, kam_id, lat, lng, precision_m, motivo_fuera_rango,
                       nota, resultado, fotos)
  values (v_emp, p_cuenta_id, auth.uid(), p_lat, p_lng,
          case when p_lat is null then null else greatest(p_precision, 0) end,
          nullif(trim(p_motivo), ''), nullif(trim(p_nota), ''),
          p_resultado, coalesce(p_fotos, '{}'))
  returning * into v_visita;

  if p_cumplio_anterior then
    update proximas_acciones set cumplida = true
    where cuenta_id = p_cuenta_id and not cumplida;
  end if;

  insert into proximas_acciones (empresa_id, cuenta_id, kam_id, visita_id, descripcion, fecha_compromiso)
  values (v_emp, p_cuenta_id, auth.uid(), v_visita.id, trim(p_accion_descripcion), p_accion_fecha);

  if p_monto_pedido is not null and p_monto_pedido > 0 then
    insert into pedidos (empresa_id, cuenta_id, kam_id, visita_id, monto_mxn)
    values (v_emp, p_cuenta_id, auth.uid(), v_visita.id, p_monto_pedido);
  end if;

  if p_nueva_etapa is not null then
    update cuentas set etapa = p_nueva_etapa where id = p_cuenta_id;
  end if;

  return query select v_visita.id, v_visita.fuera_de_rango, v_visita.distancia_m;
end $$;

grant execute on function registrar_visita to authenticated;

-- ---------- 2) Aviso de privacidad del cliente ----------
create table if not exists avisos_privacidad (
  id             uuid primary key default gen_random_uuid(),
  empresa_id     uuid not null references empresas (id) on delete cascade,
  version        int not null,
  texto          text not null check (length(trim(texto)) >= 200),
  publicado_por  uuid references perfiles (id) on delete set null,
  publicado_en   timestamptz not null default now(),
  unique (empresa_id, version)
);

-- Cada publicación es una versión nueva (no se editan ni se borran).
create or replace function numerar_aviso() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  select coalesce(max(version), 0) + 1 into new.version
  from avisos_privacidad where empresa_id = new.empresa_id;
  new.publicado_por := auth.uid();
  new.publicado_en := now();
  return new;
end $$;
drop trigger if exists avisos_numerar on avisos_privacidad;
create trigger avisos_numerar before insert on avisos_privacidad
for each row execute function numerar_aviso();

alter table avisos_privacidad enable row level security;
drop policy if exists avisos_ver on avisos_privacidad;
create policy avisos_ver on avisos_privacidad for select
  using (es_auditor() or empresa_id = mi_empresa());
drop policy if exists avisos_publicar on avisos_privacidad;
create policy avisos_publicar on avisos_privacidad for insert
  with check (es_auditor() or es_manager_de(empresa_id));

-- Constancia: quién tuvo a la vista qué versión y cuándo (no es un consentimiento).
create table if not exists constancias_aviso (
  perfil_id  uuid not null references perfiles (id) on delete cascade,
  aviso_id   uuid not null references avisos_privacidad (id) on delete cascade,
  vista_en   timestamptz not null default now(),
  primary key (perfil_id, aviso_id)
);
alter table constancias_aviso enable row level security;
drop policy if exists constancias_registrar on constancias_aviso;
create policy constancias_registrar on constancias_aviso for insert
  with check (
    perfil_id = auth.uid()
    and exists (select 1 from avisos_privacidad a where a.id = aviso_id and a.empresa_id = mi_empresa())
  );
drop policy if exists constancias_ver on constancias_aviso;
create policy constancias_ver on constancias_aviso for select
  using (
    perfil_id = auth.uid() or es_auditor()
    or exists (select 1 from avisos_privacidad a where a.id = aviso_id and es_manager_de(a.empresa_id))
  );

-- ---------- 3) Conservación ----------
-- Lo corre el proceso diario con la llave de servidor (nadie más puede llamarlo).
-- Las fotos (12 meses) las borra antes el servidor, porque viven en el almacenamiento.
create or replace function aplicar_conservacion() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_visitas int; v_acciones int; v_cambios int; v_comentarios int;
  v_planes int; v_solicitudes int; v_resumenes int;
begin
  -- 24 meses: actividad del equipo (visitas, seguimiento, conversación, plan).
  -- Una visita con fotos pendientes de borrar espera al siguiente día.
  delete from visitas
  where fecha_hora < now() - interval '24 months' and cardinality(fotos) = 0;
  get diagnostics v_visitas = row_count;

  delete from proximas_acciones
  where creada_en < now() - interval '24 months' and cumplida;
  get diagnostics v_acciones = row_count;

  delete from cambios_etapa where fecha < now() - interval '24 months';
  get diagnostics v_cambios = row_count;

  delete from comentarios where creado_en < now() - interval '24 months';
  get diagnostics v_comentarios = row_count;

  delete from planes_dia where fecha < (now() - interval '24 months')::date;
  get diagnostics v_planes = row_count;

  delete from solicitudes
  where estado <> 'pendiente' and resuelta_en < now() - interval '24 months';
  get diagnostics v_solicitudes = row_count;

  -- 90 días: registro técnico de envíos del resumen semanal.
  delete from resumenes_enviados where enviado_en < now() - interval '90 days';
  get diagnostics v_resumenes = row_count;

  return jsonb_build_object(
    'visitas', v_visitas, 'acciones', v_acciones, 'cambios_etapa', v_cambios,
    'comentarios', v_comentarios, 'planes', v_planes, 'solicitudes', v_solicitudes,
    'resumenes', v_resumenes);
end $$;

-- Fotos subidas que nunca quedaron en una visita (se canceló el registro).
create or replace function fotos_huerfanas(p_limite int default 500) returns setof text
language sql stable security definer set search_path = public, storage as $$
  select o.name from storage.objects o
  where o.bucket_id = 'fotos-visitas'
    and o.created_at < now() - interval '2 days'
    and not exists (select 1 from public.visitas v where o.name = any (v.fotos))
  limit p_limite;
$$;

revoke execute on function aplicar_conservacion() from public, anon, authenticated;
revoke execute on function fotos_huerfanas(int) from public, anon, authenticated;
