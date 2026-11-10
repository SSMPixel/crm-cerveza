// =====================================================================
// Plan del día y ruta sugerida
//
// 1) Elegir QUÉ cuentas visitar: la más urgente es el "ancla" y se completa
//    con cuentas pendientes cercanas a las ya elegidas. Si sobra lugar, se
//    pueden adelantar cuentas que tocan en los próximos días y quedan cerca.
// 2) Decidir EN QUÉ ORDEN: de cada parada a la más cercana, y luego se
//    "destuercen" los cruces (mejora 2-opt).
//
// Distancia en línea recta: suficiente para ordenar paradas. Si en campo no
// convence, se cambia esta función por distancias reales sin tocar pantallas.
// =====================================================================
import { distanciaMetros } from "./geo";
import { diasDesdeHoy, type EstadoSeguimiento } from "./formato";

export type CuentaRuta = {
  id: string;
  lat: number | null;
  lng: number | null;
  categoria: "A" | "B" | "C";
  estado_seguimiento: EstadoSeguimiento;
  toca_visita: string;
};

type Punto = { lat: number; lng: number };

const prioridad: Record<EstadoSeguimiento, number> = {
  hoy: 0,
  vencida: 1,
  al_dia: 2,
  cerrada: 3,
};
const DIAS_PARA_ADELANTAR = 3;

function km(a: Punto, b: Punto) {
  return distanciaMetros(a.lat, a.lng, b.lat, b.lng) / 1000;
}

function conUbicacion<T extends CuentaRuta>(c: T): c is T & Punto {
  return c.lat !== null && c.lng !== null;
}

function porUrgencia(a: CuentaRuta, b: CuentaRuta) {
  return (
    prioridad[a.estado_seguimiento] - prioridad[b.estado_seguimiento] ||
    a.categoria.localeCompare(b.categoria) ||
    a.toca_visita.localeCompare(b.toca_visita)
  );
}

// "Costo" de sumar una cuenta al plan: qué tan lejos queda de lo ya elegido,
// con un castigo si no es urgente y un premio si es categoría A.
function costo(c: CuentaRuta & Punto, elegidas: Punto[]) {
  const cerca = Math.min(...elegidas.map((e) => km(c, e)));
  const castigo = c.estado_seguimiento === "al_dia" ? 1.5 : 0;
  const premio = c.categoria === "A" ? 0.5 : 0;
  return cerca + castigo - premio;
}

/** Elige las cuentas del plan de hoy (sin ordenar todavía). */
export function elegirPlan<T extends CuentaRuta>(
  cuentas: T[],
  cuantas: number,
): T[] {
  if (cuantas <= 0) return [];
  const pendientes = cuentas
    .filter(
      (c) =>
        c.estado_seguimiento === "hoy" || c.estado_seguimiento === "vencida",
    )
    .sort(porUrgencia);
  if (pendientes.length === 0) return [];

  const adelantables = cuentas.filter(
    (c) =>
      c.estado_seguimiento === "al_dia" &&
      diasDesdeHoy(c.toca_visita) <= DIAS_PARA_ADELANTAR,
  );

  // Sin ubicación no se puede agrupar: se toman solo por urgencia.
  const ancla = pendientes.find(conUbicacion);
  if (!ancla) return pendientes.slice(0, cuantas);

  const elegidas: (T & Punto)[] = [ancla];
  const candidatas = [...pendientes, ...adelantables].filter(
    (c): c is T & Punto => conUbicacion(c) && c.id !== ancla.id,
  );

  while (elegidas.length < cuantas && candidatas.length > 0) {
    let mejor = 0;
    for (let i = 1; i < candidatas.length; i++) {
      if (costo(candidatas[i], elegidas) < costo(candidatas[mejor], elegidas))
        mejor = i;
    }
    elegidas.push(candidatas.splice(mejor, 1)[0]);
  }

  // Pendientes sin ubicación que todavía quepan, al final.
  const sinUbicacion = pendientes.filter((c) => !conUbicacion(c));
  return [...elegidas, ...sinUbicacion].slice(0, cuantas);
}

/** Ordena las paradas para recorrerlas con la menor distancia posible. */
export function ordenarRuta<T extends CuentaRuta>(
  paradas: T[],
  inicio?: Punto | null,
): T[] {
  const ubicadas = paradas.filter(conUbicacion);
  const sinUbicacion = paradas.filter((c) => !conUbicacion(c));
  if (ubicadas.length <= 1) return [...ubicadas, ...sinUbicacion];

  // De cada punto, a la parada más cercana.
  const restantes = [...ubicadas];
  const orden: (T & Punto)[] = [];
  let actual: Punto;
  if (inicio) {
    actual = inicio;
  } else {
    const primera = restantes.shift()!;
    orden.push(primera);
    actual = primera;
  }
  while (restantes.length > 0) {
    let i = 0;
    restantes.forEach((c, j) => {
      if (km(actual, c) < km(actual, restantes[i])) i = j;
    });
    actual = restantes.splice(i, 1)[0];
    orden.push(actual as T & Punto);
  }

  // 2-opt: si invertir un tramo acorta el recorrido, se invierte.
  const puntos: Punto[] = inicio ? [inicio, ...orden] : orden;
  const fijo = inicio ? 1 : 0;
  let mejoro = true;
  while (mejoro) {
    mejoro = false;
    for (let i = fijo; i < puntos.length - 1; i++) {
      for (let k = i + 1; k < puntos.length; k++) {
        const antes = i > 0 ? km(puntos[i - 1], puntos[i]) : 0;
        const despues =
          k < puntos.length - 1 ? km(puntos[k], puntos[k + 1]) : 0;
        const nuevoAntes = i > 0 ? km(puntos[i - 1], puntos[k]) : 0;
        const nuevoDespues =
          k < puntos.length - 1 ? km(puntos[i], puntos[k + 1]) : 0;
        if (nuevoAntes + nuevoDespues < antes + despues - 0.001) {
          puntos.splice(i, k - i + 1, ...puntos.slice(i, k + 1).reverse());
          mejoro = true;
        }
      }
    }
  }

  const ordenadas = (inicio ? puntos.slice(1) : puntos) as (T & Punto)[];
  return [...ordenadas, ...sinUbicacion];
}

/** Distancia total del recorrido, en km. */
export function distanciaRuta(
  paradas: CuentaRuta[],
  inicio?: Punto | null,
): number {
  const puntos = [
    ...(inicio ? [inicio] : []),
    ...paradas.filter(conUbicacion),
  ] as Punto[];
  let total = 0;
  for (let i = 1; i < puntos.length; i++) total += km(puntos[i - 1], puntos[i]);
  return total;
}

/** Liga para abrir la ruta completa en Google Maps (hasta 9 paradas intermedias). */
export function ligaRutaGoogle(paradas: CuentaRuta[]): string | null {
  const ubicadas = paradas.filter(conUbicacion).slice(0, 10);
  if (ubicadas.length === 0) return null;
  const txt = (c: Punto) => `${c.lat},${c.lng}`;
  const destino = ubicadas[ubicadas.length - 1];
  const intermedias = ubicadas.slice(0, -1).map(txt).join("|");
  // Sin "origin": Google Maps arranca desde donde está el KAM.
  return (
    `https://www.google.com/maps/dir/?api=1&destination=${txt(destino)}` +
    (intermedias ? `&waypoints=${encodeURIComponent(intermedias)}` : "")
  );
}
