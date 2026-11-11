// Aviso de privacidad que cada cliente (la cervecería) da a su equipo comercial.
// El cliente es el responsable; nosotros lo tratamos por su cuenta.
// La plantilla refleja lo que la app hace de verdad: si cambia la app, cambia esto.
import type { SupabaseClient } from "@supabase/supabase-js";
import { marca, prestador } from "@/lib/identidad";

export const PLAZOS = {
  actividadMeses: 24,
  fotosMeses: 12,
  tecnicosDias: 90,
};

export function plantillaAvisoEquipo(empresa: string) {
  const app = marca();
  return `Aviso de privacidad para el personal comercial de ${empresa}

RESPONSABLE
[Razón social de ${empresa}], con domicilio en [Domicilio completo], es responsable de los datos personales de su personal que se tratan en la plataforma ${app}. Contacto de privacidad: [Área y correo de privacidad]. Este aviso cubre el uso laboral de la plataforma; los demás expedientes de recursos humanos se rigen por el aviso laboral de la empresa.

DATOS QUE TRATAMOS
- Nombre, correo, teléfono y puesto.
- Cartera asignada y visitas registradas.
- Fotografías, notas, pedidos, resultados de visita y mensajes que usted captura.
- Metas, visitas realizadas, cumplimiento del plan del día e indicadores derivados.
- Registros de acceso a la plataforma.
Los datos provienen de usted, de los administradores autorizados y de su actividad en la plataforma.

UBICACIÓN
Solo al registrar una visita, y con el permiso de su dispositivo, la plataforma obtiene su ubicación para calcular la distancia al punto de venta. Se guardan la distancia, la precisión del GPS y la hora; sus coordenadas no se guardan. No hay seguimiento continuo ni en segundo plano, y no se registran rutas. Si el punto de venta todavía no tiene ubicación, esa primera visita fija la ubicación del negocio.
Puede registrar una visita sin ubicación indicando un motivo. Una visita sin ubicación o lejos del punto de venta no se considera por sí sola un incumplimiento.

DATOS SENSIBLES
No se solicitan datos de salud, biométricos ni otros datos sensibles. No los incluya en notas, motivos o fotografías. Las fotos deben mostrar producto o exhibición, evitando personas identificables y documentos privados. Si se registran por accidente, avise a [Área y correo de privacidad] para retirarlos.

FINALIDADES
1. Organizar la cartera y las visitas.
2. Verificar los registros de visita.
3. Elaborar reportes de actividad y supervisar el trabajo de campo.
4. Dar retroalimentación y capacitación.
5. Administrar las cuentas de acceso y proteger la plataforma.
Estos tratamientos son necesarios para la relación de trabajo (artículo 9, fracción IV, de la LFPDPPP). Los registros no se usan para publicidad ni para entrenar modelos de inteligencia artificial.

QUIÉN TIENE ACCESO
Los usuarios autorizados según su función, su manager y las áreas de ${empresa} que lo necesiten. ${prestador()} opera la plataforma y presta consultoría comercial a ${empresa}: trata estos datos por cuenta de ${empresa}, bajo confidencialidad y sus instrucciones. Los proveedores de alojamiento, envío de correo y mapas de la plataforma pueden tratar información fuera de México con obligaciones de protección. No se transfieren estos datos a terceros, salvo requerimiento fundado de autoridad.

INDICADORES Y REVISIÓN HUMANA
Los indicadores y alertas reflejan lo registrado y pueden tener errores; una alerta de distancia no demuestra por sí sola una ausencia. Ninguna sanción, descuento o terminación se decide de forma automática: una persona revisa el contexto y sus aclaraciones antes de decidir. Puede pedir una explicación, la revisión de un indicador y la corrección de sus registros en [Área y correo de privacidad].

CONSERVACIÓN
- Visitas, indicadores, mensajes y plan del día: ${PLAZOS.actividadMeses} meses desde cada registro.
- Fotografías: ${PLAZOS.fotosMeses} meses desde que se tomaron.
Al vencer, se eliminan automáticamente. Su acceso se desactiva cuando deja de colaborar con la empresa; sus registros siguen los plazos anteriores.

SUS DERECHOS
Para acceder a sus datos, rectificarlos, cancelarlos u oponerse a su uso, escriba a [Área y correo de privacidad] con su nombre, un medio para responderle, el derecho que ejerce, los datos de que se trata y lo que ayude a localizarlos. Para rectificar, indique el cambio y su sustento. Se le pedirá acreditar su identidad por un medio seguro.
Le responderemos en un máximo de 20 días hábiles y, si procede, lo haremos efectivo en los 15 días hábiles siguientes; cada plazo puede ampliarse una vez por un periodo igual, explicando el motivo. Si falta información, se la pediremos una sola vez dentro de 5 días hábiles y tendrá 10 días hábiles para entregarla. El trámite es gratuito, salvo costos de reproducción o envío permitidos por la ley.
También puede revocar su consentimiento cuando sea el fundamento del tratamiento, o pedir que se limite el uso de sus datos, por el mismo medio. La revocación no es retroactiva ni impide conservar lo que la ley exige.

CAMBIOS Y AUTORIDAD
Este aviso está siempre disponible en la plataforma, en Mi perfil. Cuando cambie, se le mostrará la nueva versión al entrar. Si considera vulnerado su derecho a la protección de datos, puede acudir a la Secretaría Anticorrupción y Buen Gobierno (https://www.gob.mx/buengobierno).`;
}

export type Aviso = {
  id: string;
  version: number;
  texto: string;
  publicado_en: string;
};

export async function avisoVigente(
  supabase: SupabaseClient,
  empresaId: string,
): Promise<Aviso | null> {
  const { data } = await supabase
    .from("avisos_privacidad")
    .select("id, version, texto, publicado_en")
    .eq("empresa_id", empresaId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

/** El aviso que esta persona todavía no ha visto (solo personal del cliente). */
export async function avisoPendiente(
  supabase: SupabaseClient,
  perfil: { id: string; rol: string; empresa_id: string | null },
) {
  if (perfil.rol === "auditor" || !perfil.empresa_id) return null;
  const aviso = await avisoVigente(supabase, perfil.empresa_id);
  if (!aviso) return null;
  const { data } = await supabase
    .from("constancias_aviso")
    .select("vista_en")
    .eq("perfil_id", perfil.id)
    .eq("aviso_id", aviso.id)
    .maybeSingle();
  return data ? null : aviso;
}
