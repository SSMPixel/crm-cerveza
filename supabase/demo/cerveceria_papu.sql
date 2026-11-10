-- =====================================================================
-- Datos de prueba: Cervecería Papu
-- Requisito: crear antes en Authentication → Users (con Auto Confirm):
--   raul.papu@example.com, monica.papu@example.com, sofia.papu@example.com
-- Las fechas se calculan desde hoy, así que se puede volver a correr
-- (antes borra la empresa: delete from empresas where nombre = 'Cervecería Papu';)
-- =====================================================================
do $$
declare
  emp   uuid;
  raul  uuid;
  moni  uuid;
  sofi  uuid;
  r     record;
  cta   uuid;
  hoy   date := (now() at time zone 'America/Mexico_City')::date;
begin
  select id into raul from auth.users where email = 'raul.papu@example.com';
  select id into moni from auth.users where email = 'monica.papu@example.com';
  select id into sofi from auth.users where email = 'sofia.papu@example.com';
  if raul is null or moni is null or sofi is null then
    raise exception 'Faltan usuarios: crea primero a Raúl, Mónica y Sofía en Authentication → Users.';
  end if;

  insert into empresas (nombre) values ('Cervecería Papu') returning id into emp;

  insert into perfiles (id, empresa_id, nombre, correo, rol) values
    (raul, emp, 'Raúl',   'raul.papu@example.com',   'manager'),
    (moni, emp, 'Mónica', 'monica.papu@example.com', 'kam'),
    (sofi, emp, 'Sofía',  'sofia.papu@example.com',  'kam');

  -- kam: 'm' = Mónica, 's' = Sofía
  -- visita: hace cuántos días fue la última visita (null = nunca)
  -- accion: días desde hoy para la próxima acción (negativo = vencida)
  for r in
    select * from (values
      ('m','La Bodeguita Roma',        'bar',         'Roma Norte', 19.4189,-99.1612,'A','activo',        3,   'Revisar rotación de la IPA',            4,   8500),
      ('m','Cantina El Gallo',         'cantina',     'Roma Sur',   19.4066,-99.1605,'A','activo',        9,   null,                                  null, 6200),
      ('m','Café Tormenta',            'restaurante', 'Condesa',    19.4128,-99.1735,'B','negociacion',   6,   'Enviar lista de precios',              -2,  null),
      ('m','Taproom Amatlán',          'bar',         'Condesa',    19.4105,-99.1702,'A','activo',        7,   null,                                  null, 12400),
      ('m','Pizzería Brasa',           'restaurante', 'Juárez',     19.4262,-99.1590,'B','degustacion',   10,  'Degustación con el chef',              0,   null),
      ('m','Hotel Colima Rooftop',     'hotel',       'Roma Norte', 19.4170,-99.1580,'C','contactado',    12,  'Agendar cita con gerente de A&B',      3,   null),
      ('m','Abarrotes La Esperanza',   'tienda',      'Escandón',   19.4032,-99.1798,'C','prospecto',     null,null,                                  null, null),
      ('m','Mezcalería Nahual',        'bar',         'Juárez',     19.4281,-99.1622,'B','activo',        4,   'Llevar barril de temporada',           8,   5400),
      ('m','Fonda Doña Lupe',          'restaurante', 'Centro',     19.4325,-99.1360,'C','prospecto',     null,'Primera visita',                       0,   null),
      ('m','Salón Bolívar',            'cantina',     'Centro',     19.4318,-99.1395,'B','primer_pedido', 2,   'Confirmar segundo pedido',             5,   3100),
      ('m','Bistró Ámsterdam',         'restaurante', 'Condesa',    19.4115,-99.1688,'A','activo',        14,  null,                                  null, 7800),
      ('m','Vinos y Más Escandón',     'tienda',      'Escandón',   19.4045,-99.1820,'C','negociacion',   20,  'Propuesta de exhibidor',               2,   null),
      ('m','Terraza Durango',          'bar',         'Roma Norte', 19.4200,-99.1650,'B','contactado',    16,  null,                                  null, null),
      ('m','Burger Lab Juárez',        'restaurante', 'Juárez',     19.4255,-99.1630,'C','perdido',       30,  null,                                  null, null),
      ('m','La Hija del Molinero',     'restaurante', 'Roma Norte', 19.4160,-99.1640,'A','activo',        1,   'Capacitación al personal de piso',     6,   9600),
      ('s','Bar La Pila',              'bar',         'Coyoacán',   19.3497,-99.1625,'A','activo',        5,   null,                                  null, 10200),
      ('s','Tacos El Güero',           'restaurante', 'Del Valle',  19.3860,-99.1660,'B','degustacion',   15,  null,                                  null, null),
      ('s','Mercado Gourmet Narvarte', 'tienda',      'Narvarte',   19.3955,-99.1530,'C','contactado',    8,   'Mandar ficha técnica',                 -1,  null),
      ('s','Casa Tlalpan Bar',         'bar',         'Tlalpan',    19.2905,-99.1675,'B','activo',        14,  null,                                  null, 4300),
      ('s','Patio San Ángel',          'restaurante', 'San Ángel',  19.3465,-99.1905,'A','negociacion',   2,   'Cerrar precio por barril',             1,   null),
      ('s','Pulcata Portales',         'cantina',     'Portales',   19.3695,-99.1445,'C','prospecto',     null,null,                                  null, null),
      ('s','Sushi Koi Del Valle',      'restaurante', 'Del Valle',  19.3820,-99.1690,'C','prospecto',     null,'Primera visita',                       2,   null),
      ('s','La Bicicleta Coyoacán',    'bar',         'Coyoacán',   19.3510,-99.1600,'A','activo',        7,   null,                                  null, 11500),
      ('s','Bodega Eugenia',           'bar',         'Narvarte',   19.3880,-99.1580,'B','primer_pedido', 3,   'Llamar para reorden',                  7,   2800),
      ('s','Cocina Xoco',              'restaurante', 'Xoco',       19.3605,-99.1690,'B','contactado',    11,  'Degustación con el gerente',           0,   null),
      ('s','Minisúper Las Flores',     'tienda',      'Portales',   19.3670,-99.1420,'C','activo',        25,  null,                                  null, 1900),
      ('s','Foro Cultural Coyoacán',   'bar',         'Coyoacán',   19.3480,-99.1640,'C','perdido',       40,  null,                                  null, null),
      ('s','Hamburguesas Altavista',   'restaurante', 'San Ángel',  19.3500,-99.1880,'A','activo',        12,  'Revisar exhibición en barra',          -3,  6700),
      ('s','Café Mixcoac',             'restaurante', 'Mixcoac',    19.3755,-99.1870,'B','negociacion',   5,   null,                                  null, null),
      ('s','Terraza Viveros',          'bar',         'Coyoacán',   19.3555,-99.1745,'C','contactado',    2,   'Enviar propuesta',                     10,  null)
    ) as t(kam, nombre, tipo, zona, lat, lng, cat, etapa, visita, accion, accion_dias, pedido)
  loop
    insert into cuentas (empresa_id, kam_id, nombre, tipo_lugar, zona, lat, lng,
                         categoria, etapa, creada_en)
    values (emp, case r.kam when 'm' then moni else sofi end, r.nombre, r.tipo, r.zona,
            r.lat, r.lng, r.cat::categoria_cuenta, r.etapa::etapa_cuenta,
            now() - interval '45 days')
    returning id into cta;

    if r.visita is not null then
      insert into visitas (empresa_id, cuenta_id, kam_id, fecha_hora, lat, lng, distancia_m, nota)
      values (emp, cta, case r.kam when 'm' then moni else sofi end,
              (hoy - r.visita) + time '13:30', r.lat + 0.0002, r.lng - 0.0001, 25,
              'Visita de seguimiento');
    end if;

    if r.accion is not null then
      insert into proximas_acciones (empresa_id, cuenta_id, kam_id, descripcion, fecha_compromiso)
      values (emp, cta, case r.kam when 'm' then moni else sofi end, r.accion, hoy + r.accion_dias);
    end if;

    if r.pedido is not null then
      insert into pedidos (empresa_id, cuenta_id, kam_id, fecha, monto_mxn)
      values (emp, cta, case r.kam when 'm' then moni else sofi end,
              hoy - coalesce(r.visita, 0), r.pedido);
    end if;

    if r.etapa = 'activo' then
      insert into objetivos_cuenta (empresa_id, cuenta_id, tipo, logrado, logrado_en) values
        (emp, cta, 'grifo',      r.cat = 'A',            case when r.cat = 'A' then hoy - 30 end),
        (emp, cta, 'carta',      true,                   hoy - 40),
        (emp, cta, 'exhibicion', r.cat in ('A','B') and r.pedido > 6000, case when r.pedido > 6000 then hoy - 20 end);
    end if;
  end loop;
end $$;

-- Resumen para comprobar
select kam_nombre, estado_seguimiento, count(*)
from vista_cuentas
where empresa_id = (select id from empresas where nombre = 'Cervecería Papu')
group by 1, 2
order by 1, 2;
