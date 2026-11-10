import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';

const db = new PGlite();
const archivos = process.argv.slice(2);

// Simular lo que Supabase ya trae: esquemas auth y storage, auth.uid() y el rol "authenticated".
await db.exec(`
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create role authenticated;
  create role anon;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean,
    file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(),
    bucket_id text, name text, owner uuid default auth.uid());
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as
    $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
`);
for (const f of archivos) await db.exec(fs.readFileSync(f, 'utf8'));
await db.exec(`
  grant usage on schema public, auth, storage to authenticated;
  grant all on all tables in schema public, storage to authenticated;
  grant execute on all functions in schema public, auth, storage to authenticated;
`);

// Datos: 2 empresas, auditor, manager y 2 KAMs de la empresa 1, 1 KAM de la empresa 2.
const U = {
  aud: '00000000-0000-0000-0000-00000000000a',
  man: '00000000-0000-0000-0000-00000000000b',
  k1:  '00000000-0000-0000-0000-00000000000c',
  k2:  '00000000-0000-0000-0000-00000000000d',
  k3:  '00000000-0000-0000-0000-00000000000e',
};
const E1 = '10000000-0000-0000-0000-000000000001', E2 = '10000000-0000-0000-0000-000000000002';
await db.exec(`
  insert into auth.users values ${Object.values(U).map(u => `('${u}')`).join(',')};
  insert into empresas (id, nombre) values ('${E1}', 'Cervecería Uno'), ('${E2}', 'Cervecería Dos');
  insert into perfiles (id, empresa_id, nombre, correo, rol) values
    ('${U.aud}', null, 'Auditor', 'a@x', 'auditor'),
    ('${U.man}', '${E1}', 'Manager', 'm@x', 'manager'),
    ('${U.k1}', '${E1}', 'KAM 1', 'k1@x', 'kam'),
    ('${U.k2}', '${E1}', 'KAM 2', 'k2@x', 'kam'),
    ('${U.k3}', '${E2}', 'KAM 3', 'k3@x', 'kam');
  insert into cuentas (empresa_id, kam_id, nombre, categoria) values
    ('${E1}', '${U.k1}', 'Bar del KAM 1', 'A'),
    ('${E1}', '${U.k2}', 'Bar del KAM 2', 'B'),
    ('${E2}', '${U.k3}', 'Bar de otra empresa', 'C');
`);

let ok = 0, fail = 0;
async function as(user, q) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${user}', false); set role authenticated;`);
  try { return { rows: (await db.query(q)).rows }; } catch (e) { return { error: e.message }; }
}
function check(name, cond) { if (cond) { ok++; console.log('OK   ', name); } else { fail++; console.log('FALLA', name); } }

let r;
r = await as(U.k1, 'select nombre from cuentas');
check('KAM 1 solo ve su cuenta', r.rows?.length === 1 && r.rows[0].nombre === 'Bar del KAM 1');
r = await as(U.man, 'select nombre from cuentas');
check('Manager ve las 2 cuentas de su empresa', r.rows?.length === 2);
r = await as(U.aud, 'select nombre from cuentas');
check('Auditor ve las 3 cuentas', r.rows?.length === 3);
r = await as(U.k3, 'select nombre from empresas');
check('KAM de otra empresa solo ve su empresa', r.rows?.length === 1 && r.rows[0].nombre === 'Cervecería Dos');

r = await as(U.k1, `update cuentas set etapa = 'contactado' where nombre = 'Bar del KAM 1' returning etapa`);
check('KAM mueve su cuenta de etapa libremente', r.rows?.[0]?.etapa === 'contactado');
r = await as(U.k1, `update cuentas set etapa = 'perdido' where nombre = 'Bar del KAM 1'`);
check('KAM NO puede dar por perdida', !!r.error);
r = await as(U.k1, `update cuentas set kam_id = '${U.k2}' where nombre = 'Bar del KAM 1'`);
check('KAM NO puede reasignar', !!r.error);
r = await as(U.k1, `update cuentas set categoria = 'A' where nombre = 'Bar del KAM 2' returning id`);
check('KAM NO puede tocar la cuenta de otro', r.rows?.length === 0);

r = await as(U.aud, `select etapa_anterior, etapa_nueva from cambios_etapa c join cuentas a on a.id = c.cuenta_id where a.nombre = 'Bar del KAM 1' order by fecha`);
check('Historial de etapas se registra solo', r.rows?.length === 2 && r.rows[1].etapa_nueva === 'contactado');

const cuenta1 = (await as(U.aud, `select id from cuentas where nombre = 'Bar del KAM 1'`)).rows[0].id;
r = await as(U.k1, `insert into visitas (empresa_id, cuenta_id, kam_id, lat, lng, distancia_m) values ('${E1}', '${cuenta1}', '${U.k1}', 19.4, -99.1, 40) returning id`);
check('KAM registra visita en su cuenta', r.rows?.length === 1);
r = await as(U.k1, `insert into visitas (empresa_id, cuenta_id, kam_id, fuera_de_rango) values ('${E1}', '${cuenta1}', '${U.k1}', true)`);
check('Visita fuera de rango sin motivo se rechaza', !!r.error);
r = await as(U.k2, `insert into visitas (empresa_id, cuenta_id, kam_id) values ('${E1}', '${cuenta1}', '${U.k2}')`);
check('KAM NO registra visita en cuenta ajena', !!r.error);
r = await as(U.k1, `insert into pedidos (empresa_id, cuenta_id, kam_id, monto_mxn) values ('${E1}', '${cuenta1}', '${U.k1}', 4500) returning id`);
check('KAM registra pedido', r.rows?.length === 1);
r = await as(U.k2, 'select * from visitas');
check('KAM 2 no ve visitas del KAM 1', r.rows?.length === 0);
r = await as(U.man, 'select * from visitas');
check('Manager ve visitas del equipo', r.rows?.length === 1);

r = await as(U.k1, `insert into solicitudes (empresa_id, cuenta_id, tipo, solicitante_id) values ('${E1}', '${cuenta1}', 'perdida', '${U.k1}') returning id`);
check('KAM crea solicitud de baja', r.rows?.length === 1);
const sol = r.rows[0].id;
r = await as(U.k1, `update solicitudes set estado = 'aprobada' where id = '${sol}' returning id`);
check('KAM NO puede aprobar su solicitud', r.rows?.length === 0);
r = await as(U.man, `update solicitudes set estado = 'aprobada' where id = '${sol}' returning resuelta_por`);
check('Manager aprueba la solicitud', r.rows?.[0]?.resuelta_por === U.man);
r = await as(U.aud, `select etapa from cuentas where id = '${cuenta1}'`);
check('Al aprobar, la cuenta queda perdida', r.rows?.[0]?.etapa === 'perdido');

r = await as(U.man, `insert into comentarios (empresa_id, cuenta_id, autor_id, texto, visibilidad) values ('${E1}', '${cuenta1}', '${U.man}', 'Nota privada', 'privada_manager')`);
r = await as(U.aud, `insert into comentarios (empresa_id, cuenta_id, autor_id, texto) values ('${E1}', '${cuenta1}', '${U.aud}', 'Comentario de equipo')`);
r = await as(U.k1, 'select texto from comentarios');
check('KAM ve comentarios de equipo pero no notas privadas', r.rows?.length === 1 && r.rows[0].texto === 'Comentario de equipo');
r = await as(U.man, 'select texto from comentarios');
check('Manager ve ambos', r.rows?.length === 2);

r = await as(U.k1, `insert into perfiles (id, empresa_id, nombre, correo, rol) values ('${U.k3}', '${E1}', 'x', 'x', 'manager')`);
check('KAM NO puede crear usuarios ni ascenderse', !!r.error);

// ---------- Vista de cuentas y estado de seguimiento ----------
await db.exec(`reset role;`);
r = await as(U.k2, 'select nombre from vista_cuentas');
check('Vista: KAM 2 solo ve su cuenta', r.rows?.length === 1 && r.rows[0].nombre === 'Bar del KAM 2');
r = await as(U.aud, `select estado_seguimiento from vista_cuentas where nombre = 'Bar del KAM 2'`);
check('Vista: cuenta B recién creada está al día', r.rows?.[0]?.estado_seguimiento === 'al_dia');
r = await as(U.aud, `select estado_seguimiento from vista_cuentas where nombre = 'Bar del KAM 1'`);
check('Vista: cuenta perdida queda cerrada', r.rows?.[0]?.estado_seguimiento === 'cerrada');
await db.exec(`reset role; update cuentas set creada_en = now() - interval '20 days' where nombre = 'Bar del KAM 2';`);
r = await as(U.aud, `select estado_seguimiento from vista_cuentas where nombre = 'Bar del KAM 2'`);
check('Vista: cuenta B sin visita en 20 días está vencida', r.rows?.[0]?.estado_seguimiento === 'vencida');
const cuenta2 = (await as(U.aud, `select id from cuentas where nombre = 'Bar del KAM 2'`)).rows[0].id;
await db.exec(`reset role; insert into visitas (empresa_id, cuenta_id, kam_id, fecha_hora) values ('${E1}', '${cuenta2}', '${U.k2}', now() - interval '3 days');`);
r = await as(U.aud, `select estado_seguimiento, dias_sin_visita from vista_cuentas where nombre = 'Bar del KAM 2'`);
check('Vista: visita hace 3 días la pone al día', r.rows?.[0]?.estado_seguimiento === 'al_dia' && r.rows[0].dias_sin_visita === 3);
await db.exec(`reset role; insert into proximas_acciones (empresa_id, cuenta_id, kam_id, descripcion, fecha_compromiso) values ('${E1}', '${cuenta2}', '${U.k2}', 'Llevar degustación', hoy_mx());`);
r = await as(U.aud, `select estado_seguimiento, accion_descripcion from vista_cuentas where nombre = 'Bar del KAM 2'`);
check('Vista: próxima acción para hoy marca "hoy"', r.rows?.[0]?.estado_seguimiento === 'hoy' && r.rows[0].accion_descripcion === 'Llevar degustación');

// ---------- Registrar visita ----------
if (archivos.some(f => f.includes('0004'))) {
  await db.exec(`reset role; update cuentas set lat = 19.4189, lng = -99.1612 where nombre = 'Bar del KAM 2';
                 update cuentas set etapa = 'negociacion' where nombre = 'Bar del KAM 2';`);
  const rv = (args) => `select * from registrar_visita('${cuenta2}', ${args})`;

  r = await as(U.k2, rv(`19.4190, -99.1613, null, 'Todo bien', 'Llevar barril', hoy_mx() + 3, true, 5200, 'primer_pedido'`));
  check('Visita dentro de rango se registra', r.rows?.[0]?.fuera_de_rango === false && r.rows[0].distancia < 30);
  r = await as(U.k2, `select count(*)::int as n from proximas_acciones where cuenta_id = '${cuenta2}' and not cumplida`);
  check('Acción anterior se cierra y queda solo la nueva', r.rows?.[0]?.n === 1);
  r = await as(U.k2, `select etapa from cuentas where id = '${cuenta2}'`);
  check('La visita mueve la etapa', r.rows?.[0]?.etapa === 'primer_pedido');
  r = await as(U.k2, `select monto_mxn from pedidos where cuenta_id = '${cuenta2}'`);
  check('El pedido queda ligado', r.rows?.length === 1 && Number(r.rows[0].monto_mxn) === 5200);

  r = await as(U.k2, rv(`19.4400, -99.1400, null, null, 'Volver', hoy_mx() + 1`));
  check('Lejos y sin motivo se rechaza', r.error?.includes('FUERA_DE_RANGO_SIN_MOTIVO'));
  r = await as(U.k2, rv(`19.4400, -99.1400, 'Llamada telefónica', null, 'Volver', hoy_mx() + 1`));
  check('Lejos con motivo se guarda marcada', r.rows?.[0]?.fuera_de_rango === true && r.rows[0].distancia > 2000);
  r = await as(U.k2, rv(`null, null, 'GPS apagado', null, 'Volver', hoy_mx() + 1`));
  check('Sin ubicación se guarda marcada', r.rows?.[0]?.fuera_de_rango === true);
  r = await as(U.k2, rv(`19.4190, -99.1613, null, null, '', hoy_mx() + 1`));
  check('Sin próxima acción se rechaza', r.error?.includes('FALTA_PROXIMA_ACCION'));
  r = await as(U.k2, rv(`19.4190, -99.1613, null, null, 'Algo', hoy_mx() - 1`));
  check('Próxima acción en el pasado se rechaza', r.error?.includes('FECHA_EN_PASADO'));
  r = await as(U.k2, rv(`19.4190, -99.1613, null, null, 'Algo', hoy_mx() + 1, true, null, 'perdido'`));
  check('KAM no puede dar por perdida desde la visita', !!r.error);
  r = await as(U.k1, rv(`19.4190, -99.1613, null, null, 'Algo', hoy_mx() + 1`));
  check('KAM no registra visita en cuenta ajena', !!r.error);
  r = await as(U.k2, `insert into visitas (empresa_id, cuenta_id, kam_id, fecha_hora, lat, lng) values ('${E1}', '${cuenta2}', '${U.k2}', now() - interval '10 days', 19.4190, -99.1613) returning fecha_hora > now() - interval '1 minute' as ahora`);
  check('El KAM no puede inventar la hora de la visita', r.rows?.[0]?.ahora === true);

  await db.exec(`reset role; insert into cuentas (id, empresa_id, kam_id, nombre) values ('20000000-0000-0000-0000-000000000001', '${E1}', '${U.k2}', 'Prospecto sin ubicación');`);
  r = await as(U.k2, `select * from registrar_visita('20000000-0000-0000-0000-000000000001', 19.3500, -99.1600, null, null, 'Presentación', hoy_mx() + 2)`);
  r = await as(U.k2, `select lat, lng from cuentas where id = '20000000-0000-0000-0000-000000000001'`);
  check('Primera visita fija la ubicación del prospecto', r.rows?.[0]?.lat === 19.35);
}

// ---------- Pedidos del mes, visitada hoy, meta por KAM ----------
if (archivos.some(f => f.includes('0005'))) {
  r = await as(U.k2, `select pedidos_mes_mxn, ultimo_pedido_mxn, visitada_hoy from vista_cuentas where id = '${cuenta2}'`);
  check('Vista: suma pedidos del mes y marca visitada hoy',
    Number(r.rows?.[0]?.pedidos_mes_mxn) === 5200 && Number(r.rows[0].ultimo_pedido_mxn) === 5200 && r.rows[0].visitada_hoy === true);
  r = await as(U.k2, `update perfiles set meta_visitas_dia = 1 where id = '${U.k2}' returning id`);
  check('KAM no puede bajarse su propia meta', !r.rows?.length);
  r = await as(U.man, `update perfiles set meta_visitas_dia = 3 where id = '${U.k2}' returning meta_visitas_dia`);
  check('Manager ajusta la meta de su KAM', r.rows?.[0]?.meta_visitas_dia === 3);
  r = await as(U.man, `update perfiles set meta_visitas_dia = 3 where id = '${U.k3}' returning id`);
  check('Manager no toca KAMs de otra empresa', !r.rows?.length);
}

// ---------- Resultado de visita y fotos ----------
if (archivos.some(f => f.includes('0007'))) {
  const carpeta2 = `${E1}/${cuenta2}`;
  r = await as(U.k2, `insert into storage.objects (bucket_id, name) values ('fotos-visitas', '${carpeta2}/a.jpg') returning id`);
  check('KAM sube foto a su cuenta', r.rows?.length === 1);
  r = await as(U.k2, `insert into storage.objects (bucket_id, name) values ('fotos-visitas', '${E1}/${cuenta1}/b.jpg')`);
  check('KAM no sube foto a cuenta ajena', !!r.error);
  r = await as(U.k3, `insert into storage.objects (bucket_id, name) values ('fotos-visitas', '${carpeta2}/c.jpg')`);
  check('KAM de otra empresa no sube a esta empresa', !!r.error);
  r = await as(U.man, `insert into storage.objects (bucket_id, name) values ('fotos-visitas', '${carpeta2}/d.jpg')`);
  check('Manager no sube fotos de visita', !!r.error);
  r = await as(U.k1, `select name from storage.objects`);
  check('Equipo de la empresa ve la foto', r.rows?.length === 1);
  r = await as(U.k3, `select name from storage.objects`);
  check('Otra empresa no ve la foto', r.rows?.length === 0);

  r = await as(U.k2, `select * from registrar_visita('${cuenta2}', 19.4190, -99.1613, null, null, 'Llevar carta', hoy_mx() + 2, true, null, null, 'degusto', array['${carpeta2}/a.jpg'])`);
  check('Visita con resultado y foto', r.rows?.length === 1);
  r = await as(U.k2, `select resultado, fotos from visitas where id = '${r.rows?.[0]?.visita_id}'`);
  check('Se guardan resultado y foto', r.rows?.[0]?.resultado === 'degusto' && r.rows[0].fotos.length === 1);
  r = await as(U.k2, `select * from registrar_visita('${cuenta2}', 19.4190, -99.1613, null, null, 'Algo', hoy_mx() + 2, true, null, null, null, array['${E1}/${cuenta1}/x.jpg'])`);
  check('Foto de otra cuenta se rechaza', r.error?.includes('FOTO_INVALIDA'));
}

console.log(`\n${ok} correctas, ${fail} fallas`);
process.exit(fail ? 1 : 0);
