-- =====================================================================
-- 0007: resultado de visita en un toque y fotos de la visita
-- =====================================================================

-- Resultado opcional, de una lista corta (da métricas sin que el KAM escriba).
create type resultado_visita as enum (
  'degusto',            -- Degustó
  'pidio_precios',      -- Pidió precios
  'hizo_pedido',        -- Hizo pedido
  'no_estaba_decisor',  -- No estaba quien decide
  'cerrado',            -- Estaba cerrado
  'seguimiento',        -- Seguimiento de rutina
  'sin_interes'         -- Sin interés
);

alter table visitas
  add column resultado resultado_visita,
  -- Rutas de las fotos dentro del almacenamiento (máximo 3 por visita).
  add column fotos text[] not null default '{}' check (cardinality(fotos) <= 3);

-- La función cambia de parámetros: se borra y se vuelve a crear.
drop function if exists registrar_visita(uuid, float8, float8, text, text, text, date, boolean, numeric, etapa_cuenta);

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
  p_fotos              text[] default '{}'
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

  -- Las fotos solo pueden venir de la carpeta de esta empresa y esta cuenta.
  if exists (
    select 1 from unnest(coalesce(p_fotos, '{}')) f
    where f not like v_emp::text || '/' || p_cuenta_id::text || '/%'
  ) then
    raise exception 'FOTO_INVALIDA';
  end if;

  insert into visitas (empresa_id, cuenta_id, kam_id, lat, lng, motivo_fuera_rango, nota,
                       resultado, fotos)
  values (v_emp, p_cuenta_id, auth.uid(), p_lat, p_lng,
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

-- =====================================================================
-- Almacenamiento de fotos (Supabase Storage)
-- Carpeta: <empresa>/<cuenta>/<archivo>.jpg · privado (se ve con ligas temporales)
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos-visitas', 'fotos-visitas', false, 5242880,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Subir: solo un KAM, solo dentro de la carpeta de su empresa y de una cuenta suya.
create policy fotos_subir on storage.objects for insert to authenticated
with check (
  bucket_id = 'fotos-visitas'
  and mi_rol() = 'kam'
  and (storage.foldername(name))[1] = mi_empresa()::text
  and exists (
    select 1 from public.cuentas c
    where c.id::text = (storage.foldername(name))[2] and c.kam_id = auth.uid()
  )
);

-- Ver: el auditor todo; los demás, las fotos de su empresa.
create policy fotos_ver on storage.objects for select to authenticated
using (
  bucket_id = 'fotos-visitas'
  and (es_auditor() or (storage.foldername(name))[1] = mi_empresa()::text)
);
