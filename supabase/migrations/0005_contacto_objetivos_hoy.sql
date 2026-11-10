-- =====================================================================
-- 0005: correo de contacto, objetivo mensual de pedido por cuenta,
--       meta diaria por KAM (opcional) y vista de cuentas ampliada.
-- =====================================================================

alter table cuentas
  add column contacto_correo       text,
  add column objetivo_mensual_mxn  numeric(12, 2) check (objetivo_mensual_mxn > 0);

-- Si está vacía, el KAM usa la meta de su empresa. Solo la cambian manager o auditor
-- (los KAMs no tienen permiso de editar perfiles).
alter table perfiles
  add column meta_visitas_dia int check (meta_visitas_dia > 0);

-- La vista se recrea para incluir las columnas nuevas y los datos de pedidos.
drop view if exists vista_cuentas;

create view vista_cuentas
with (security_invoker = true) as
with ultima as (
  select cuenta_id, max(fecha_hora) as ultima_visita
  from visitas
  group by cuenta_id
),
accion as (
  select distinct on (cuenta_id)
         cuenta_id, id as accion_id, descripcion as accion_descripcion,
         fecha_compromiso as accion_fecha
  from proximas_acciones
  where not cumplida
  order by cuenta_id, fecha_compromiso
),
pedidos_mes as (
  select cuenta_id, sum(monto_mxn) as pedidos_mes_mxn
  from pedidos
  where date_trunc('month', fecha) = date_trunc('month', hoy_mx())
  group by cuenta_id
),
ultimo_pedido as (
  select distinct on (cuenta_id)
         cuenta_id, monto_mxn as ultimo_pedido_mxn, fecha as ultimo_pedido_fecha
  from pedidos
  order by cuenta_id, fecha desc, id
),
base as (
  select
    c.*,
    p.nombre as kam_nombre,
    u.ultima_visita,
    a.accion_id, a.accion_descripcion, a.accion_fecha,
    coalesce(pm.pedidos_mes_mxn, 0) as pedidos_mes_mxn,
    up.ultimo_pedido_mxn, up.ultimo_pedido_fecha,
    case c.categoria
      when 'A' then e.frecuencia_a_dias
      when 'B' then e.frecuencia_b_dias
      else e.frecuencia_c_dias
    end as frecuencia_dias,
    coalesce((u.ultima_visita at time zone 'America/Mexico_City')::date,
             (c.creada_en     at time zone 'America/Mexico_City')::date) as fecha_referencia
  from cuentas c
  join empresas e on e.id = c.empresa_id
  left join perfiles p on p.id = c.kam_id
  left join ultima u on u.cuenta_id = c.id
  left join accion a on a.cuenta_id = c.id
  left join pedidos_mes pm on pm.cuenta_id = c.id
  left join ultimo_pedido up on up.cuenta_id = c.id
)
select
  base.*,
  (fecha_referencia + frecuencia_dias) as toca_visita,
  case when ultima_visita is null then null
       else hoy_mx() - (ultima_visita at time zone 'America/Mexico_City')::date
  end as dias_sin_visita,
  coalesce((ultima_visita at time zone 'America/Mexico_City')::date = hoy_mx(), false)
    as visitada_hoy,
  case
    when etapa = 'perdido' then 'cerrada'
    when accion_fecha < hoy_mx()
      or fecha_referencia + frecuencia_dias < hoy_mx() then 'vencida'
    when accion_fecha = hoy_mx()
      or fecha_referencia + frecuencia_dias = hoy_mx() then 'hoy'
    else 'al_dia'
  end as estado_seguimiento
from base;

grant select on vista_cuentas to authenticated;
