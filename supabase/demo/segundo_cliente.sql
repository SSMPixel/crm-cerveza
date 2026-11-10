-- =====================================================================
-- Segundo cliente de prueba: Distribuidora Lúpulo Norte
-- Armado CON problemas, para ver las alertas del auditor.
-- Requisito: crear antes en Authentication → Users (con Auto Confirm):
--   carla.lupulo@example.com (manager), diego.lupulo@example.com (KAM),
--   ana.lupulo@example.com (KAM)
-- =====================================================================
do $$
declare
  emp uuid; carla uuid; diego uuid; ana uuid; r record; cta uuid;
  hoy date := (now() at time zone 'America/Mexico_City')::date;
begin
  select id into carla from auth.users where email = 'carla.lupulo@example.com';
  select id into diego from auth.users where email = 'diego.lupulo@example.com';
  select id into ana   from auth.users where email = 'ana.lupulo@example.com';
  if carla is null or diego is null or ana is null then
    raise exception 'Faltan usuarios: crea a Carla, Diego y Ana en Authentication → Users.';
  end if;

  insert into empresas (nombre) values ('Distribuidora Lúpulo Norte') returning id into emp;
  insert into perfiles (id, empresa_id, nombre, correo, rol, meta_visitas_dia) values
    (carla, emp, 'Carla', 'carla.lupulo@example.com', 'manager', null),
    (diego, emp, 'Diego', 'diego.lupulo@example.com', 'kam', null),
    (ana,   emp, 'Ana',   'ana.lupulo@example.com',   'kam', 3);   -- meta ajustada a la baja

  -- kam: 'd' Diego / 'a' Ana · visita: hace cuántos días (null = nunca) · fuera: registrada lejos
  for r in
    select * from (values
      ('d','Cervecería Anzures',     'bar',         'Anzures',    19.4295,-99.1795,'A','activo',      1,  true),
      ('d','Terraza Polanco',        'bar',         'Polanco',    19.4330,-99.1950,'A','activo',      2,  true),
      ('d','La Esquina de Masaryk',  'restaurante', 'Polanco',    19.4318,-99.1985,'B','negociacion', 2,  true),
      ('d','Tienda Gourmet Lamartine','tienda',     'Polanco',    19.4346,-99.1910,'C','contactado',  3,  false),
      ('d','Bar Moliere',            'bar',         'Polanco',    19.4385,-99.2040,'B','activo',      4,  true),
      ('d','Oyster Bar Anzures',     'restaurante', 'Anzures',    19.4275,-99.1770,'B','degustacion', 5,  false),
      ('a','Cantina Narvarte Pte.',  'cantina',     'Narvarte',   19.3955,-99.1570,'A','activo',      6,  false),
      ('a','Taquería del Parque',    'restaurante', 'Del Valle',  19.3880,-99.1680,'B','activo',      null, false),
      ('a','Bar Eugenia',            'bar',         'Del Valle',  19.3850,-99.1610,'B','contactado',  null, false),
      ('a','Minisúper Xola',         'tienda',      'Narvarte',   19.3950,-99.1490,'C','prospecto',   null, false)
    ) as t(kam, nombre, tipo, zona, lat, lng, cat, etapa, visita, fuera)
  loop
    insert into cuentas (empresa_id, kam_id, nombre, tipo_lugar, zona, lat, lng, categoria, etapa, creada_en)
    values (emp, case r.kam when 'd' then diego else ana end, r.nombre, r.tipo, r.zona,
            r.lat, r.lng, r.cat::categoria_cuenta, r.etapa::etapa_cuenta, now() - interval '40 days')
    returning id into cta;

    if r.visita is not null then
      insert into visitas (empresa_id, cuenta_id, kam_id, fecha_hora, lat, lng, distancia_m,
                           fuera_de_rango, motivo_fuera_rango)
      values (emp, cta, case r.kam when 'd' then diego else ana end,
              (hoy - r.visita) + time '12:00',
              case when r.fuera then 19.4400 else r.lat end,
              case when r.fuera then -99.1300 else r.lng end,
              case when r.fuera then 5400 else 30 end,
              r.fuera, case when r.fuera then 'Llamada' end);
    end if;
  end loop;
end $$;

select nombre from empresas order by nombre;
