# CRM para equipos comerciales de cerveza artesanal

Web app móvil para que los KAMs registren su trabajo de campo y los managers vean,
cada semana, cómo avanza el pipeline de su equipo. Nombre comercial por definir.

## Qué hay en este proyecto

| Carpeta o archivo | Qué es |
| --- | --- |
| `src/app/` | Las pantallas de la app. Cada carpeta dentro es una ruta (`/cuentas`, `/mapa`, etc.). |
| `supabase/migrations/` | El esquema de la base de datos: tablas, reglas de negocio y seguridad. |
| `supabase/tests/` | Pruebas que verifican que las reglas de seguridad funcionan. |
| `package.json` | La lista de librerías que usa el proyecto y los comandos disponibles. |
| `public/` | Imágenes e íconos. |

## Cómo está pensada la seguridad

Cada registro pertenece a una **empresa** (cliente). La base de datos, no la app,
decide quién ve qué:

- Un **KAM** solo ve y registra actividad en sus propias cuentas.
- Un **manager** ve todo lo de su empresa y aprueba reasignaciones y bajas.
- El **auditor** ve todas las empresas.

Además, la base de datos:

- Impide que un KAM reasigne una cuenta o la dé por perdida sin aprobación.
- Guarda solo el historial de cambios de etapa.
- Exige un motivo cuando una visita se registra lejos de la cuenta.
- Esconde las notas privadas del auditor a los KAMs.

## Comandos

```bash
npm install      # instala las librerías (solo la primera vez)
npm run dev      # abre la app en modo desarrollo en http://localhost:3000
npm run test:db  # prueba el esquema y las reglas de seguridad
```

## Stack

Next.js · Supabase (Postgres, login y seguridad por filas) · Vercel · Leaflet + OpenStreetMap · Resend
