"use client";

import Link from "next/link";
import { FormAltaPersona } from "@/components/FormAltaPersona";
import { crearCliente } from "./acciones";

// Reusa el alta de persona, agregando el nombre de la empresa al envío.
export function FormNuevoCliente() {
  return (
    <div className="space-y-4">
      <label className="block">
        <span className="text-sm font-medium">Nombre del cliente</span>
        <input
          id="empresa"
          name="empresa"
          placeholder="Cervecería …"
          className="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-base focus:border-amber-700 focus:outline-none"
        />
      </label>
      <p className="font-medium">Su manager</p>
      <FormAltaPersona
        puedeManager={false}
        textoBoton="Crear cliente"
        accion={async (fd) => {
          fd.set(
            "empresa",
            (document.getElementById("empresa") as HTMLInputElement)?.value ??
              "",
          );
          return crearCliente(fd);
        }}
      />
      <p className="text-sm text-stone-600">
        Después entra al cliente desde{" "}
        <Link href="/clientes" className="underline">
          Mis clientes
        </Link>{" "}
        para dar de alta a sus KAMs y su cartera.
      </p>
    </div>
  );
}
