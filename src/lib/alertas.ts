// =====================================================================
// Alertas del auditor: lo que conviene revisar con el manager de cada cliente.
// Funciones puras (sin base de datos) para poder probarlas solas.
// =====================================================================

export type Severidad = "alta" | "media" | "baja";

export type Alerta = {
  severidad: Severidad;
  titulo: string; // lo que ve el auditor
  mensaje: string; // texto listo para mandarle al manager
};

export type DatosCliente = {
  empresa: string;
  metaEmpresa: number;
  kams: { id: string; nombre: string; meta: number | null }[];
  cuentas: {
    kam_id: string | null;
    estado_seguimiento: string;
    contacto_telefono: string | null;
    lat: number | null;
  }[];
  visitas7d: { kam_id: string; fecha_hora: string; fuera_de_rango: boolean }[];
  cambiosEtapa7d: { cuenta_kam_id: string | null }[];
  hoy: string; // AAAA-MM-DD en CDMX
};

const peso: Record<Severidad, number> = { alta: 3, media: 2, baja: 1 };

const fechaMx = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Mexico_City",
});

// Días entre una visita (fecha y hora) y hoy, contando por días de CDMX.
function diasEntre(fechaHora: string, hoy: string) {
  const dia = fechaMx.format(new Date(fechaHora));
  return Math.round((Date.parse(hoy) - Date.parse(dia)) / 86_400_000);
}

export function calcularAlertas(d: DatosCliente): Alerta[] {
  const alertas: Alerta[] = [];

  for (const k of d.kams) {
    const suyas = d.visitas7d.filter((v) => v.kam_id === k.id);
    const fuera = suyas.filter((v) => v.fuera_de_rango).length;

    // Visitas fuera de rango: 3 o más, o 30% o más de sus visitas.
    if (fuera >= 3 || (suyas.length >= 3 && fuera / suyas.length >= 0.3)) {
      alertas.push({
        severidad: fuera >= 5 ? "alta" : "media",
        titulo: `${k.nombre}: ${fuera} de ${suyas.length} visitas fuera de rango en 7 días`,
        mensaje: `Hola, revisando la actividad de la semana: ${k.nombre} lleva ${fuera} de ${suyas.length} visitas registradas lejos de la cuenta. Valdría la pena revisar con ${k.nombre} los motivos.`,
      });
    }

    // Días sin visitas.
    const ultima = suyas
      .map((v) => v.fecha_hora)
      .sort()
      .at(-1);
    const dias = ultima ? diasEntre(ultima, d.hoy) : null;
    if (dias === null) {
      alertas.push({
        severidad: "alta",
        titulo: `${k.nombre}: sin visitas en 7 días`,
        mensaje: `Hola, veo que ${k.nombre} no ha registrado visitas en los últimos 7 días. ¿Está de vacaciones o hay algo que debamos revisar?`,
      });
    } else if (dias >= 3) {
      alertas.push({
        severidad: "media",
        titulo: `${k.nombre}: ${dias} días sin registrar visitas`,
        mensaje: `Hola, ${k.nombre} lleva ${dias} días sin registrar visitas. ¿Todo bien?`,
      });
    }

    // Visita mucho pero no mueve etapas.
    const movimientos = d.cambiosEtapa7d.filter(
      (c) => c.cuenta_kam_id === k.id,
    ).length;
    if (suyas.length >= 8 && movimientos === 0) {
      alertas.push({
        severidad: "baja",
        titulo: `${k.nombre}: ${suyas.length} visitas sin mover ninguna etapa`,
        mensaje: `Hola, ${k.nombre} está visitando bien (${suyas.length} visitas en la semana) pero ninguna cuenta avanzó de etapa. Puede ser buen momento para revisar juntos su pipeline.`,
      });
    }

    // Meta ajustada por debajo de la de la empresa.
    if (k.meta !== null && k.meta < d.metaEmpresa) {
      alertas.push({
        severidad: "baja",
        titulo: `${k.nombre} tiene meta de ${k.meta} visitas/día (la empresa usa ${d.metaEmpresa})`,
        mensaje: `Hola, vi que la meta diaria de ${k.nombre} está en ${k.meta} visitas, por debajo de las ${d.metaEmpresa} del equipo. ¿Lo platicamos para confirmar que sigue haciendo sentido?`,
      });
    }
  }

  // Cartera atrasada.
  const vigentes = d.cuentas.filter((c) => c.estado_seguimiento !== "cerrada");
  const atrasadas = vigentes.filter(
    (c) => c.estado_seguimiento === "vencida",
  ).length;
  if (vigentes.length >= 5 && atrasadas / vigentes.length >= 0.4) {
    const pct = Math.round((atrasadas / vigentes.length) * 100);
    alertas.push({
      severidad: pct >= 60 ? "alta" : "media",
      titulo: `${pct}% de la cartera atrasada (${atrasadas} de ${vigentes.length})`,
      mensaje: `Hola, ${atrasadas} de ${vigentes.length} cuentas (${pct}%) están atrasadas en su frecuencia de visita. Puede que las frecuencias A/B/C no quepan en la semana del equipo; ¿lo revisamos?`,
    });
  }

  // Calidad de datos.
  const sinTelefono = vigentes.filter((c) => !c.contacto_telefono).length;
  const sinUbicacion = vigentes.filter((c) => c.lat === null).length;
  if (sinTelefono > 0 || sinUbicacion > 0) {
    const partes = [
      sinTelefono > 0 ? `${sinTelefono} sin teléfono` : null,
      sinUbicacion > 0 ? `${sinUbicacion} sin ubicación` : null,
    ].filter(Boolean);
    alertas.push({
      severidad: "baja",
      titulo: `Datos incompletos: ${partes.join(", ")}`,
      mensaje: `Hola, hay cuentas con datos incompletos (${partes.join(", ")}). Si el equipo los completa, podrán usar los atajos de WhatsApp y la ruta del día.`,
    });
  }

  return alertas.sort((a, b) => peso[b.severidad] - peso[a.severidad]);
}

export function puntajeAtencion(alertas: Alerta[]) {
  return alertas.reduce((s, a) => s + peso[a.severidad], 0);
}
