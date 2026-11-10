-- =====================================================================
-- 0009: reglas para dar de alta y editar cuentas desde la app
--
-- El KAM puede crear prospectos y corregir datos de contacto, pero la
-- categoría A/B/C y el objetivo mensual los decide el manager: si el KAM
-- pudiera bajar una cuenta de A a C, se quitaría trabajo sin que nadie lo note.
-- =====================================================================

create or replace function proteger_cuenta() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if mi_rol() = 'kam' then
    if new.kam_id is distinct from old.kam_id then
      raise exception 'Solo el manager puede reasignar una cuenta. Envía una solicitud.';
    end if;
    if new.etapa = 'perdido' and old.etapa <> 'perdido' then
      raise exception 'Solo el manager puede dar una cuenta por perdida. Envía una solicitud.';
    end if;
    if new.empresa_id is distinct from old.empresa_id then
      raise exception 'No se puede cambiar la empresa de una cuenta.';
    end if;
    if new.categoria is distinct from old.categoria then
      raise exception 'SOLO_MANAGER_CATEGORIA';
    end if;
    if new.objetivo_mensual_mxn is distinct from old.objetivo_mensual_mxn then
      raise exception 'SOLO_MANAGER_OBJETIVO';
    end if;
  end if;
  new.actualizada_en := now();
  return new;
end $$;

-- Cuentas nuevas creadas por un KAM: suyas, categoría C y sin objetivo
-- (el manager las ajusta después).
create or replace function preparar_cuenta_nueva() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if mi_rol() = 'kam' then
    new.kam_id := auth.uid();
    new.empresa_id := mi_empresa();
    new.categoria := 'C';
    new.objetivo_mensual_mxn := null;
    new.etapa := case when new.etapa = 'perdido' then 'prospecto' else new.etapa end;
  end if;
  return new;
end $$;

create trigger cuentas_nueva before insert on cuentas
for each row execute function preparar_cuenta_nueva();

-- La empresa que configura su equipo (manager o auditor) puede ajustar
-- frecuencias, radio y meta; el auditor además da de alta empresas (ya existía).
