-- =====================================================================
-- 0008: registro de resúmenes semanales enviados
-- Evita mandar dos veces el mismo resumen el mismo día.
-- Solo el servidor (con su llave secreta) escribe aquí.
-- =====================================================================
create table resumenes_enviados (
  id             uuid primary key default gen_random_uuid(),
  empresa_id     uuid not null references empresas (id) on delete cascade,
  fecha          date not null,
  destinatarios  text[] not null default '{}',
  enviado_en     timestamptz not null default now(),
  unique (empresa_id, fecha)
);

alter table resumenes_enviados enable row level security;

create policy resumenes_ver on resumenes_enviados for select
  using (es_auditor() or es_manager_de(empresa_id));
