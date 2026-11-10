import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';

const db = new PGlite();
const sql = fs.readFileSync(process.argv[2], 'utf8');

// Simular lo que Supabase ya trae: esquema auth, auth.users, auth.uid() y el rol "authenticated".
await db.exec(`
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create role authenticated;
`);
await db.exec(sql);
await db.exec(`
  grant usage on schema public, auth to authenticated;
  grant all on all tables in schema public to authenticated;
  grant execute on all functions in schema public, auth to authenticated;
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

console.log(`\n${ok} correctas, ${fail} fallas`);
process.exit(fail ? 1 : 0);
