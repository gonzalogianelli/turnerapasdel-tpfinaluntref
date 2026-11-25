# Design

## Context

El backend ya está implementado en ESM con Express, Sequelize/MySQL, JWT en cookie HTTPOnly y documentación OpenAPI. El QA end-to-end confirmó los flujos funcionales, pero dejó tres brechas: `pino-http` serializa las cabeceras de sesión completas; `updateTurno` y `rechazarReserva` no validan todas las transiciones con bloqueo; `crearPartido` bloquea la reserva pero no el turno. Swagger y archivos de soporte tampoco reflejan del todo el comportamiento real. Ver `proposal.md` para la motivación.

## Goals / Non-Goals

**Goals:**
- Impedir que credenciales de sesión aparezcan en cualquier log HTTP.
- Hacer que los cambios de estado y el alta de partidos sean atómicos y coherentes bajo concurrencia.
- Uniformar el envelope de errores ante fallos de Sequelize.
- Alinear OpenAPI, rate limiter, `AGENTS.md` y `.gitignore` con el comportamiento aprobado.

**Non-Goals:**
- No agregar endpoints, tablas ni dependencias.
- No modificar reglas de negocio de duración, cupos, categorías ni estados permitidos en DB.
- No implementar recuperación de contraseña (fuera de alcance según `email-notifications`).
- No cambiar respuestas exitosas ni el esquema de cookies.

## Decisions

- **Redacción en la capa HTTP.** Configurar `pinoHttp` con `redact: { paths: ['req.headers.cookie', 'res.headers["set-cookie"]', 'req.headers.authorization'], censor: '[REDACTED]' }` en `src/app.js`. Alternativa descartada: serializadores manuales, porque pueden omitir rutas anidadas y no cubren `set-cookie`. El logger base de `src/config/logger.js` queda intacto.
- **Matriz de transiciones pura + guard transaccional.** Agregar en `src/utils/turnoValidation.js` una función pura que devuelva las transiciones permitidas; `updateTurno` la invoca dentro de la transacción, tras cargar el turno con `Transaction.LOCK.UPDATE`. Alternativa descartada: apoyarse solo en el enum de Sequelize, que valida valores pero no transiciones de negocio.
- **Reserva activa con bloqueo real.** Sustituir `Reserva.count` por `Reserva.findAll` con `attributes: ['id']` y `lock: Transaction.LOCK.UPDATE` al verificar reservas pendientes/confirmadas. Alternativa descartada: `count`, que no bloquea filas y permite una carrera entre verificación y actualización.
- **Rechazo consistente.** `rechazarReserva` reutiliza `findTurnoForDecision` y exige `turno.estado === 'reservado'` antes de escribir. Alternativa descartada: confiar en el estado de la reserva únicamente, que ya se usa pero no protege al turno.
- **Alta de partido serializeda.** Agregar `lock: Transaction.LOCK.UPDATE` a la lectura de `Turno` en `crearPartido`, igual que ya hace `inscribirJugador`. Alternativa descartada: reintentos optimistas, que no existen en el proyecto y complicarían el manejo de errores.
- **Normalización de errores Sequelize.** En `src/middlewares/errorHandler.js`, mapear por `error.name`: `SequelizeUniqueConstraintError` → `AppError(..., 409)`, `SequelizeValidationError` y `SequelizeForeignKeyConstraintError` → `AppError(..., 400)`. El resto sigue siendo `500` con mensaje genérico, sin `err.stack` en la respuesta. Alternativa descartada: envolver cada servicio, que duplicaría lógica y dejaría rutas descubiertas.
- **Documentación y limpieza.** Agregar tags globales `Auth` y `Usuarios`, el JSDoc de `GET /api/health`, quitar el `200` duplicado de los POST de creación dejando solo `201`, ampliar el `skip` del limiter a `/^\/api\/health\/?$/`, registrar la skill de QA y los patrones `*cookies*.txt` en `.gitignore`.

## Risks / Trade-offs

- [El `redact` de Pino no cubre un alias de cabecera nuevo] → La verificación de QA busca explícitamente `padel_token=` en los logs tras login y peticiones autenticadas.
- [La matriz de transiciones puede rechazar una operación administrativa antes permitida] → Se conserva el estado idéntico como idempotente y se mantienen explícitas solo las transiciones del flujo aprobado; cualquier cambio adicional requiere nueva spec.
- [Bloquear filas de reservas aumenta la contención] → Solo se bloquean filas del turno destino y se liberan al confirmar/revertir la transacción; no hay cambios de esquema.
- [Cambiar el `skip` del limiter permite más peticiones a health] → Es intencional: health es para monitoreo y ya está documentado como operación pública.
- [Los errores 400/409 de Sequelize pueden revelar nombres de columnas] → Se usa un mensaje fijo y legible, sin `errors[]`, `sql` ni stack.

## Migration Plan

- No hay migración de base de datos.
- Desplegar el cambio completo junto con sus deltas de spec; no requiere variables de entorno nuevas.
- Rollback: revertir los archivos tocados y reiniciar el proceso; no hay datos persistidos nuevos.

## Verification

- `node --check` sobre todos los archivos de `src/`.
- Servidor aislado en puerto libre con SMTP deshabilitado.
- Login + petición autenticada + `/api/health` + `/api/health/` + `/api-docs.json`.
- Confirmar en logs `[REDACTED]` y ausencia de `padel_token=ey` / passwords.
- Comprobar que `/api-docs.json` incluye `Auth`, `Usuarios`, `GET /api/health` y `201` sin `200` duplicado en los POST.
- Verificar código desalida y `git status --short`; sin commit.
