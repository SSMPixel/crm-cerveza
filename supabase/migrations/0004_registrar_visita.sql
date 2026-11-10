-- =====================================================================
-- Registrar visita
--
-- 1) La distancia y la marca "fuera de rango" las calcula el servidor,
--    nunca el celular: así no se puede hacer trampa.
-- 2) Si la cuenta no tenía ubicación (un prospecto nuevo), la primera
--    visita dentro del lugar le fija sus coordenadas.
-- 3) Una sola función guarda todo junto: visita, próxima acción,
--    pedido opcional y cambio de etapa opcional. Si algo falla, no se
--    guarda nada a medias.
-- =====================================================================

-- Distancia en metros entre dos puntos (fórmula de haversine).
create or replace function distancia_m(lat1 float8, lng1 float8, lat2 float8, lng2 float8)
returns int language sql immutable as $$
  select round(6371000 * 2 * asin(sqrt(
           power(sin(radians(lat2 - lat1) / 2), 2) +
           cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
         )))::int
$$;

-- Corre con los permisos de quien registra (no security definer), para poder
-- distinguir a un usuario de la app de una carga administrativa.
create or replace function calcular_rango_visita() returns trigger
language plpgsql set search_path = public as $$
declare
  c_lat float8; c_lng float8; radio int;
begin
  -- Cargas administrativas (SQL Editor, datos de prueba): se respetan tal cual.
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  select c.lat, c.lng, e.radio_checkin_m into c_lat, c_lng, radio
  from cuentas c join empresas e on e.id = c.empresa_id
  where c.id = new.cuenta_id;

  -- La hora la pone el servidor, no el celular.
  new.fecha_hora := now();

  if new.lat is null or new.lng is null then
    -- Sin ubicación del celular: se guarda, pero queda marcada.
    new.distancia_m := null;
    new.fuera_de_rango := true;
  elsif c_lat is null or c_lng is null then
    -- La cuenta aún no tiene ubicación: esta visita se la fija.
    new.distancia_m := 0;
    new.fuera_de_rango := false;
    update cuentas set lat = new.lat, lng = new.lng where id = new.cuenta_id;
  else
    new.distancia_m := distancia_m(c_lat, c_lng, new.lat, new.lng);
    new.fuera_de_rango := new.distancia_m > radio;
  end if;

  if new.fuera_de_rango and coalesce(trim(new.motivo_fuera_rango), '') = '' then
    raise exception 'FUERA_DE_RANGO_SIN_MOTIVO'
      using hint = 'La visita está lejos de la cuenta o sin ubicación: indica el motivo.';
  end if;
  return new;
end $$;

create trigger visitas_rango before insert on visitas
for each row execute function calcular_rango_visita();

-- Todo el registro de una visita en una sola operación.
-- security invoker: corre con los permisos de quien la llama (aplican las reglas RLS).
create or replace function registrar_visita(
  p_cuenta_id          uuid,
  p_lat                float8,
  p_lng                float8,
  p_motivo             text,
  p_nota               text,
  p_accion_descripcion text,
  p_accion_fecha       date,
  p_cumplio_anterior   boolean default true,
  p_monto_pedido       numeric default null,
  p_nueva_etapa        etapa_cuenta default null
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

  insert into visitas (empresa_id, cuenta_id, kam_id, lat, lng, motivo_fuera_rango, nota)
  values (v_emp, p_cuenta_id, auth.uid(), p_lat, p_lng,
          nullif(trim(p_motivo), ''), nullif(trim(p_nota), ''))
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
