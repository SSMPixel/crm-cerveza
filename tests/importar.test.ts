// Pruebas de la lectura de cartera: node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  analizarCartera,
  buscarKam,
  campoDeEncabezado,
  categoriaDe,
  etapaDe,
  telefonoDe,
  tipoDeLugar,
  type Opciones,
} from "../src/lib/importarCartera.ts";

const kams = [
  { id: "k1", nombre: "Mónica Rodríguez", correo: "monica@papu.mx" },
  { id: "k2", nombre: "Sofía Hernández", correo: "sofia@papu.mx" },
  { id: "k3", nombre: "Sofía Martínez" },
];
const op: Opciones = {
  kams,
  existentes: [{ nombre: "La Chingonería", direccion: null }],
  etapaPorDefecto: "activo",
  kamPorDefecto: null,
};

test("reconoce encabezados con otros nombres", () => {
  assert.equal(campoDeEncabezado("Cliente"), "nombre");
  assert.equal(campoDeEncabezado("Nombre del contacto"), "contacto_nombre");
  assert.equal(campoDeEncabezado("Teléfono del contacto"), "contacto_telefono");
  assert.equal(campoDeEncabezado("Vendedor asignado"), "kam");
  assert.equal(campoDeEncabezado("Colonia"), "zona");
  assert.equal(campoDeEncabezado("C.P."), "cp");
  assert.equal(campoDeEncabezado("Giro"), "tipo_lugar");
  assert.equal(campoDeEncabezado("No. Cliente"), null);
  assert.equal(campoDeEncabezado("ID cuenta"), null);
  assert.equal(campoDeEncabezado("Meta mensual ($)"), "objetivo");
});

test("valores", () => {
  assert.equal(categoriaDe("Categoría A"), "A");
  assert.equal(categoriaDe("b"), "B");
  assert.equal(categoriaDe("AAA"), null);
  assert.equal(etapaDe("Cliente activo"), "activo");
  assert.equal(etapaDe("Primer pedido"), "primer_pedido");
  assert.equal(etapaDe("Inactivo"), "perdido");
  assert.equal(tipoDeLugar("Cervecería artesanal"), "bar");
  assert.equal(tipoDeLugar("Vinatería"), "tienda");
  assert.equal(tipoDeLugar("Galería"), "otro");
  assert.equal(telefonoDe("5512345678.0"), "5512345678");
  assert.equal(telefonoDe("5.512345678E+09"), "5512345678");
});

test("KAM por nombre, parte del nombre o correo", () => {
  assert.deepEqual(buscarKam("Mónica", kams), { id: "k1" });
  assert.deepEqual(buscarKam("monica r.", kams), { id: "k1" });
  assert.deepEqual(buscarKam("SOFIA@PAPU.MX", kams), { id: "k2" });
  assert.deepEqual(buscarKam("Sofía H", kams), { id: "k2" });
  assert.ok("error" in (buscarKam("Sofía", kams) ?? {}));
  assert.ok("error" in (buscarKam("Pedro", kams) ?? {}));
  assert.equal(buscarKam("", kams), null);
});

test("cartera completa", () => {
  const matriz = [
    ["Cartera noviembre", "", "", "", ""],
    ["", "", "", "", ""],
    [
      "No. cliente",
      "Cliente",
      "Colonia",
      "Vendedor",
      "Categoría",
      "Coordenadas",
      "Meta",
    ],
    ["1", "Bar Uno", "Roma", "Mónica", "A", "19.41, -99.16", "$15,000"],
    ["2", "", "Roma", "Mónica", "A", "", ""],
    ["3", "La Chingonería", "Condesa", "Mónica", "B", "", ""],
    ["4", "Bar Uno", "Roma", "Pedro", "Z", "-99.1, 19.4", "mucho"],
    ["", "", "", "", "", "", ""],
    ["5", "Tienda Dos", "Narvarte", "", "", "", ""],
  ];
  const r = analizarCartera(matriz, op);
  assert.equal(r.problema, null);
  assert.deepEqual(r.ignoradas, ["No. cliente"]);
  assert.equal(r.filas.length, 5);
  const [uno, sinNombre, existe, repetida, dos] = r.filas;
  assert.equal(uno.fila, 4);
  assert.deepEqual(
    [
      uno.datos.lat,
      uno.datos.lng,
      uno.datos.objetivo_mensual_mxn,
      uno.datos.kam_id,
      uno.datos.etapa,
    ],
    [19.41, -99.16, 15000, "k1", "activo"],
  );
  assert.deepEqual(uno.errores, []);
  assert.match(sinNombre.errores[0], /Falta el nombre/);
  assert.match(existe.errores[0], /Ya existe/);
  assert.ok(repetida.errores.some((e) => /fila 4/.test(e)));
  assert.ok(repetida.errores.some((e) => /Pedro/.test(e)));
  assert.equal(repetida.datos.lat, 19.4); // coordenadas al revés, corregidas
  assert.equal(repetida.datos.categoria, "C");
  assert.equal(repetida.avisos.length, 2);
  assert.deepEqual(dos.avisos, ["Sin KAM asignado."]);
});

test("KAM por defecto y archivos que no se entienden", () => {
  const r = analizarCartera(
    [
      ["Nombre", "Zona"],
      ["Bar", "Roma"],
    ],
    { ...op, kamPorDefecto: "k2" },
  );
  assert.equal(r.filas[0].datos.kam_id, "k2");
  assert.match(
    analizarCartera(
      [
        ["a", "b"],
        ["1", "2"],
      ],
      op,
    ).problema ?? "",
    /No reconocimos/,
  );
  assert.match(
    analizarCartera(
      [
        ["Zona", "Vendedor"],
        ["Roma", "x"],
      ],
      op,
    ).problema ?? "",
    /nombre/,
  );
});
