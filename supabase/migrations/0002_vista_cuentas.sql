-- =====================================================================
-- Vista de cuentas con su estado de seguimiento
--
-- Para cada cuenta calcula:
--   - última visita y días desde entonces,
--   - próxima acción pendiente más cercana,
--   - fecha en que "toca" visitar según su categoría A/B/C,
--   - estado: 'vencida', 'hoy', 'al_dia' o 'cerrada' (perdidas).
--
-- security_invoker = true hace que la vista respete las mismas reglas
-- de seguridad que la tabla: cada quien ve solo lo que le corresponde.
-- =====================================================================

create or replace function hoy_mx() returns date
language sql stable as $$ select (now() at time zone 'America/Mexico_City')::date $$;

create or replace view vista_cuentas
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
base as (
  select
    c.*,
    p.nombre as kam_nombre,
    u.ultima_visita,
    a.accion_id, a.accion_descripcion, a.accion_fecha,
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
)
select
  base.*,
  (fecha_referencia + frecuencia_dias) as toca_visita,
  case when ultima_visita is null then null
       else hoy_mx() - (ultima_visita at time zone 'America/Mexico_City')::date
  end as dias_sin_visita,
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
