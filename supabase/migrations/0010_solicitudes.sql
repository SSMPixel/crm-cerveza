-- =====================================================================
-- 0010 · Solicitudes al manager (pasar una cuenta a otro KAM / darla por perdida)
-- Ajustes sobre la tabla que ya existía desde 0001.
-- =====================================================================

-- Lo que el manager contesta al resolver (sobre todo si la rechaza).
alter table solicitudes add column if not exists respuesta text;

-- Una sola solicitud pendiente por cuenta.
create unique index if not exists solicitudes_una_pendiente
  on solicitudes (cuenta_id) where estado = 'pendiente';

-- El KAM solo pide cambios de SUS cuentas, y solo hacia otro KAM activo del equipo.
drop policy if exists solicitudes_crear on solicitudes;
create policy solicitudes_crear on solicitudes for insert
  with check (
    solicitante_id = auth.uid() and estado = 'pendiente'
    and exists (
      select 1 from cuentas c
      where c.id = cuenta_id
        and c.empresa_id = solicitudes.empresa_id
        and (es_manager_de(c.empresa_id) or (es_kam_de(c.empresa_id) and c.kam_id = auth.uid()))
        and (solicitudes.tipo <> 'reasignar' or c.kam_id is distinct from solicitudes.kam_destino_id)
    )
    and (
      kam_destino_id is null or exists (
        select 1 from perfiles p
        where p.id = kam_destino_id and p.empresa_id = solicitudes.empresa_id
          and p.rol = 'kam' and p.activo
      )
    )
  );

-- Quien la pidió puede cancelarla mientras siga pendiente.
drop policy if exists solicitudes_cancelar on solicitudes;
create policy solicitudes_cancelar on solicitudes for delete
  using (solicitante_id = auth.uid() and estado = 'pendiente');
