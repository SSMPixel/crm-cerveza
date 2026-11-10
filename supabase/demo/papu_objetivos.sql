-- Datos de prueba para Cervecería Papu (correr después de 0005).
-- Objetivo mensual de pedido para clientes activos y con primer pedido,
-- y correos de contacto de prueba (@example.com: nunca llegan a nadie).
update cuentas c set objetivo_mensual_mxn = case c.categoria
    when 'A' then 15000 when 'B' then 8000 else 3000 end
from empresas e
where e.id = c.empresa_id and e.nombre = 'Cervecería Papu'
  and c.etapa in ('activo', 'primer_pedido');

update cuentas c set
  contacto_correo = lower(regexp_replace(
                      translate(c.nombre, 'áéíóúñÁÉÍÓÚÑ', 'aeiounAEIOUN'),
                      '[^a-zA-Z0-9]+', '.', 'g')) || '@example.com',
  contacto_nombre = coalesce(c.contacto_nombre, 'Gerente')
from empresas e
where e.id = c.empresa_id and e.nombre = 'Cervecería Papu';

-- Para probar WhatsApp y llamada, pon TU número en una cuenta:
-- update cuentas set contacto_telefono = '55 1234 5678' where nombre = 'Taproom Amatlán';
