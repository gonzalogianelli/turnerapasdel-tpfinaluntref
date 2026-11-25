# Proposal

## Why

El complejo necesita datos base reproducibles para que el dueño y el personal puedan ingresar sin depender de cargas manuales, y el cliente web debe dejar de exponer credenciales de prueba, respetar estrictamente roles y ofrecer una experiencia visual propia. Además, un jugador que se equivoca al solicitar un turno hoy no puede liberarlo: la reserva queda pendiente y el turno deja de estar disponible para los demás.

## What Changes

- Agregar un comando de seeders idempotente que crea 1 administrador dueño, 2 empleados con rol `administrador` y 6 jugadores con nombres y apellidos reales y variados, con credenciales documentadas en `README.md`.
- Sembrar exactamente dos canchas iniciales del complejo (`Cancha 1 — Central` y `Cancha 2 — Blindex`) de forma idempotente, sin impedir que el administrador agregue o dé de baja canchas después.
- Mantener sin cambios el registro público: `POST /api/auth/register` sigue rechazando cualquier `rol` y siempre crea `jugador`.
- Permitir que un jugador cancele únicamente su propia reserva `pendiente` mediante `PATCH /api/reservas/:id/cancelar`, devolviendo el turno a `disponible` dentro de la misma transacción.
- Mantener la regla existente para cancelaciones confirmadas por administrador: la reserva pasa a `cancelada`, el turno queda `cancelado` y requiere republicación manual.
- Eliminar todo autocompletado, “Prueba rápida” y credenciales precargadas del frontend; dejar los campos de login vacíos y agregar ver/ocultar contraseña.
- Hacer que `/` muestre directamente `/login` cuando no hay sesión, reforzar guards por rol y distinguir mensajes de credenciales inválidas frente a sesión vencida.
- Rediseñar completamente la interfaz con una identidad azul propia: azul profundo, azul cancha de acento, superficies marcadas y tipografía clara.
- Revisar de punta a punta rutas, campos, estados, permisos y mensajes `400/401/403/404/409`, con foco operativo en 2 canchas.

## Capabilities

### New Capabilities

- `database-seeders`: carga idempotente y documentada de cuentas base del complejo para dueño, empleados y jugadores, y de las dos canchas iniciales.
- `web-client-experience`: comportamiento del cliente web para acceso, sesión persistente, roles, errores reales, presentación visual y liberación de reservas propias.

### Modified Capabilities

- `reservation-management`: excepción controlada para que el jugador cancele su reserva pendiente y el turno vuelva a `disponible`, sin alterar la cancelación confirmada del administrador.
- `slot-management`: documentación de la excepción de liberación automática sobre reservas pendientes canceladas por el propio jugador.
- `email-notifications`: aviso de cancelación Pendiente con el turno efectivamente liberado, sin mensajes de republicación manual.

## Impact

- Backend: `package.json`, `scripts/seed.js`, `README.md`, servicios/rutas/Swagger de reservas, tests de registro, seeders y ciclo de reserva.
- Frontend: `src/api`, `src/context`, `src/components`, `src/pages`, `src/styles`, `README.md` y `package.json` si hace falta algún script de verificación.
- OpenAPI: endpoint de cancelación de reservas con acceso por roles y estados resultantes.
- Verificación: `npm test`, `openspec validate --all --strict`, `npm run build` del frontend y smoke del servidor con SMTP deshabilitado.
