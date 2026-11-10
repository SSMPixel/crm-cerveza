-- Meta de visitas por día para cada KAM (configurable por empresa).
alter table empresas
  add column meta_visitas_dia int not null default 5 check (meta_visitas_dia > 0);
