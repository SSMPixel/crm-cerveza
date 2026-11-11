// Aviso de privacidad propio (somos responsables): prospectos, contactos de
// clientes, contratación y facturación. Los datos del equipo de un cliente
// NO van aquí: van en el aviso de ese cliente (ver avisoEquipo.ts).
import { identidad, marca } from "@/lib/identidad";

const dato = (v: string | null, marcador: string) => v ?? `[${marcador}]`;

export function avisoPropioTexto() {
  const correo = dato(identidad.correoPrivacidad, "Correo de privacidad");
  const sitio = identidad.dominio
    ? `https://${identidad.dominio}/privacidad`
    : "[Dominio]/privacidad";
  return `Aviso de privacidad integral de ${marca()}

RESPONSABLE
${identidad.titular}, persona física que opera como ${marca()}, con domicilio en ${dato(identidad.domicilio, "Domicilio completo")}, es responsable de los datos personales descritos en este aviso. Contacto de privacidad: ${correo}.
Este aviso cubre a nuestros prospectos, a los representantes y contactos de nuestros clientes, y la contratación, facturación y comunicaciones comerciales. Los datos del personal y de la cartera que tratamos por cuenta de un cliente se rigen por el aviso de ese cliente; en esos casos actuamos como encargados y le ayudamos a contactar al responsable.

DATOS QUE TRATAMOS
- Nombre, cargo, empresa, teléfono y correo.
- El contenido de sus consultas y solicitudes.
- Datos de representación y firma de contratos.
- Datos fiscales para facturar, y referencias y estado de pago.
- Para usar la app: correo de acceso y registros de inicio de sesión.
Los obtenemos de usted, de su organización o de las comunicaciones del contrato. No solicitamos datos sensibles; si los recibimos sin ser necesarios, los eliminaremos.

FINALIDADES NECESARIAS
1. Responder consultas y preparar propuestas.
2. Verificar la representación, celebrar y administrar contratos.
3. Prestar la consultoría, el acceso a la app y el soporte.
4. Facturar, cobrar y cumplir obligaciones legales.
5. Atender reclamaciones relacionadas con el servicio.

FINALIDADES OPCIONALES
1. Enviarle información de servicios y eventos.
2. Invitarle a encuestas.
Puede negarse antes de darnos sus datos o en cualquier momento, escribiendo a ${correo} o con la opción de baja de cada mensaje. Negarse no afecta la contratación. Publicar su testimonio, nombre o imagen requiere una autorización aparte.

PROVEEDORES Y TRANSFERENCIAS
Usamos proveedores de alojamiento, correo, mapas y facturación que tratan los datos por nuestra cuenta, algunos con servidores fuera de México. No vendemos ni rentamos datos personales. Solo los transferimos a autoridades cuando una ley lo exige.

CONSERVACIÓN Y TECNOLOGÍAS
Conservamos los datos mientras sean necesarios para estas finalidades y obligaciones; después se bloquean cuando procede y se eliminan. Los prospectos sin relación activa se eliminan 12 meses después de la última interacción; la documentación fiscal y mercantil sigue sus plazos legales.
La app usa solo cookies necesarias para mantener la sesión iniciada y recordar el cliente que revisa un auditor, y guarda en su navegador la preferencia de modo claro u oscuro. No usamos cookies de publicidad ni de analítica. Desactivar las cookies necesarias impide iniciar sesión.

SUS DERECHOS
Para acceder a sus datos, rectificarlos, cancelarlos u oponerse a su uso, escriba a ${correo} con su nombre, un medio para responderle, el derecho que ejerce, los datos de que se trata y lo que ayude a localizarlos. Para rectificar, indique el cambio y su sustento. Le indicaremos un medio seguro para acreditar su identidad o la de su representante.
Le responderemos en un máximo de 20 días hábiles y, si procede, lo haremos efectivo en los 15 días hábiles siguientes; cada plazo puede ampliarse una vez por un periodo igual, explicando el motivo. Si falta información, se la pediremos una sola vez dentro de 5 días hábiles y tendrá 10 días hábiles para entregarla. El trámite es gratuito, salvo costos de reproducción o envío permitidos por la ley.
Por el mismo medio puede revocar su consentimiento o pedir que limitemos el uso de sus datos. La revocación no es retroactiva ni elimina lo que la ley obliga a conservar. Las bajas de publicidad se aplican en un máximo de 5 días hábiles. También puede inscribirse en el Registro Público para Evitar Publicidad de Profeco.

CAMBIOS Y AUTORIDAD
Publicaremos los cambios con fecha y versión en ${sitio}; los relevantes se los avisaremos por correo o en la app. Si considera vulnerado su derecho a la protección de datos, puede acudir a la Secretaría Anticorrupción y Buen Gobierno (https://www.gob.mx/buengobierno).

Versión ${identidad.version} · vigente desde ${dato(identidad.vigenteDesde, "Fecha")}`;
}

/** Texto corto para el inicio de sesión y formularios. */
export function avisoSimplificadoTexto() {
  return `${identidad.titular}, que opera como ${marca()}, con domicilio en ${dato(identidad.domicilio, "Domicilio completo")}, trata sus datos de identificación, contacto y, cuando corresponde, de facturación para atender consultas, gestionar propuestas y contratos, prestar el servicio y soporte, facturar y cumplir obligaciones legales. Si es parte del equipo de un cliente, ese cliente es responsable de sus datos en la app y nosotros los tratamos por su cuenta. Con su permiso, también le enviaremos información de servicios y eventos; puede negarse escribiendo a ${dato(identidad.correoPrivacidad, "Correo de privacidad")}.`;
}
