# Proposal

## Why

La auditoría y el QA end-to-end detectaron tres riesgos: el logger HTTP registra el JWT crudo de las cookies, Certain transiciones de turno/reserva y la creación de partidos pueden sufrir carreras o estados inválidos, y el contrato de errores no mapea fallos de Sequelize. Además, Swagger/README/AGENTS/.gitignore quedaron desalineados con el comportamiento ya aprobado.

## What Changes

- Redactar `req.headers.cookie`, `res.headers['set-cookie']` y `req.headers.authorization` en `pino-http` con `censor: '[REDACTED]'`.
- Validar transiciones explícitas de estado de turno y verificar con `Transaction.LOCK.UPDATE` que no existan reservas activas antes de pasar a `disponible`, `bloqueado` o `cancelado` (409 si hay activas).
- Exigir que `rechazarReserva` confirme, dentro de la transacción, que el turno está `reservado` antes de devolverlo a `disponible`.
- Bloquear con `Transaction.LOCK.UPDATE` la reserva y su turno al crear un partido.
- Mapear `SequelizeUniqueConstraintError` a 409 y `SequelizeValidationError` / `SequelizeForeignKeyConstraintError` a 400, manteniendo 500 sin stack trace para errores inesperados.
- Documentar `GET /api/health`, agregar tags globales `Auth` y `Usuarios`, corregir respuestas `201` de creación y excluir `/api/health` y `/api/health/` del rate limiter.
- Alinear `AGENTS.md` (recuperación de contraseña fuera de alcance y registro de la skill `padel-backend-qa`) y `.gitignore` (`*cookies*.txt` y temporales de prueba).
- Sin cambios funcionales en los flujos ya aprobados; solo endurecimiento, documentación y manejo de errores.

## Capabilities

### New Capabilities

- (Ninguna)

### Modified Capabilities

- `app-foundation`: redacción de credenciales en logs HTTP y mapeo de errores de Sequelize al envelope estándar.
- `health-check`: excepción del rate limiter para `/api/health` y `/api/health/` y documentación OpenAPI del endpoint.
- `slot-management`: transiciones explícitas de estado con verificación transaccional de reservas activas.
- `reservation-management`: rechazo de reserva solo si el turno sigue `reservado`.
- `incomplete-matches`: bloqueo pesimista de reserva y turno durante el alta de partidos.

## Impact

- `src/app.js`, `src/config/logger.js`, `src/config/swagger.js`, `src/middlewares/errorHandler.js`.
- `src/routes/health.routes.js`, `cancha.routes.js`, `turno.routes.js`, `reserva.routes.js`.
- `src/utils/turnoValidation.js`, `src/services/turno.service.js`, `reserva.service.js`, `partido.service.js`.
- `AGENTS.md`, `.gitignore`.
- Sin dependencias nuevas; no se modifica el esquema de base de datos ni las respuestas de los flujos aprobados.
