# Proposal

## Why

El flujo actual obliga a cargar turnos uno por uno, separa "Turnos" de "Reservas" en dos pantallas y muestra información repetida. Además, un visitante no puede ver la disponibilidad hasta iniciar sesión y el administrador no tiene un aviso interno de cada reserva registrada.

## What Changes

- Generar de forma idempotente los bloques de 90 minutos entre 08:00 y 23:00 para cada cancha activa, con el día actual como fecha por defecto y actualización al elegir otra fecha.
- Publicar un listado de turnos libres sin autenticación y un endpoint administrativo de generación; mantener `GET /api/turnos` con su contrato autenticado actual.
- Unificar la interfaz en una sola vista de Reserva: grilla por cancha, selección de día/horario/cancha, reserva con sesión y acceso a login/registro preservando la selección.
- Permitir al administrador bloquear y liberar turnos en forma individual o múltiple (uso por torneos/eventos), sin que los bloqueados aparezcan como libres.
- Exponer avisos internos para el administrador con cancha, fecha/horario, solicitante y estado de cada reserva, conservando los correos existentes.
- Simplificar el perfil del jugador con acceso directo a reservar, edición de datos y avisos de partidos compatibles con su categoría; quitar "Turnos" como opción independiente.
- Eliminar tarjetas duplicadas del resumen (canchas/turnos/partidos repetidos).

## Capabilities

### New Capabilities

- `web-client-experience`: flujo único de Reserva, sesión diferida, grilla por cancha, bloqueo administrativo y perfil enfocado.

### Modified Capabilities

- `slot-management`: generación automática de bloques de 90 minutos, rango 08:00–23:00 y listado público de libres.
- `reservation-management`: avisos internos al administrador con datos del solicitante.

## Impact

- Backend: validación y generación de turnos, endpoint público, endpoint de avisos, Swagger y tests.
- Frontend: rutas, encabezado, nueva pantalla de Reserva, perfil, dashboard y estilos.
- Verificación: `npm test` en backend y `npm run build` en frontend.
