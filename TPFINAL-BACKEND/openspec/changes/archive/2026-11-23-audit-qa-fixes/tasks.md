# Tasks

## 1. Seguridad de logs y errores

- [x] 1.1 Configurar `redact` con `censor: '[REDACTED]'` en `pinoHttp` dentro de `src/app.js` para `req.headers.cookie`, `res.headers['set-cookie']` y `req.headers.authorization`; verificar con un login y una petición autenticada que los logs contengan `[REDACTED]` y no `padel_token=ey`.
- [x] 1.2 Normalizar `SequelizeUniqueConstraintError` a 409, `SequelizeValidationError` y `SequelizeForeignKeyConstraintError` a 400 en `src/middlewares/errorHandler.js`, manteniendo `{ status: 'error', message }` y 500 genérico sin stack; verificar con un email duplicado (409), una foreign key inválida (400) y una ruta que fuerce error inesperado (500 sin `stack`).

## 2. Transiciones de turno y reservas

- [x] 2.1 Agregar en `src/utils/turnoValidation.js` la matriz pura de transiciones permitidas, conservando el estado idéntico como idempotente; verificar con `node --check src/utils/turnoValidation.js` y un `PATCH /api/turnos/:id` con transición inválida que devuelva 409.
- [x] 2.2 Invocar la matriz en `src/services/turno.service.js` y sustituir `Reserva.count` por `Reserva.findAll` con `lock: Transaction.LOCK.UPDATE` antes de pasar a `disponible`, `bloqueado` o `cancelado`; verificar que esos cambios con reserva pendiente/confirmada devuelvan 409 y conserven el estado.
- [x] 2.3 Exigir `turno.estado === 'reservado'` en `rechazarReserva` de `src/services/reserva.service.js` antes de actualizar; verificar que rechazar sobre turno cancelado, jugado, bloqueado o republicado devuelva 409 sin modificar la reserva.

## 3. Partidos incompletos

- [x] 3.1 Agregar `lock: Transaction.LOCK.UPDATE` a la lectura de `Turno` en `crearPartido` de `src/services/partido.service.js`; verificar con dos peticiones simultáneas (alta de partido y cancelación del turno) que ambas se serializan y el partido se crea sobre un estado coherente, o la cancelación gana y el alta devuelve 409.

## 4. Documentación y configuración

- [x] 4.1 Agregar los tags globales `Auth` y `Usuarios` en `src/config/swagger.js`, documentar `GET /api/health` en `src/routes/health.routes.js` y dejar solo `201` como respuesta de creación en los POST de `cancha.routes.js`, `turno.routes.js` y `reserva.routes.js`; verificar que `/api-docs.json` contenga ambos tags, la operación health con `200`/`500` y los tres POST sin `200` duplicado.
- [x] 4.2 Ampliar el `skip` del rate limiter en `src/app.js` a `/^\/api\/health\/?$/`; verificar que `/api/health` y `/api/health/` sigan respondiendo 200 aunque el cliente haya agotado el límite en otra ruta.
- [x] 4.3 Alinear `AGENTS.md` declarando la recuperación de contraseña fuera de alcance y registrando `.opencode/skills/padel-backend-qa/SKILL.md`, y agregar `*cookies*.txt` a `.gitignore`; verificar con `git diff -- AGENTS.md .gitignore` que solo aparecen esos cambios.

## 5. Verificación final

- [x] 5.1 Ejecutar `node --check` sobre todos los archivos de `src/` y confirmar que no hay errores de sintaxis.
- [x] 5.2 Levantar el servidor en puerto aislado con SMTP deshabilitado, ejecutar login, petición autenticada, `/api/health`, `/api/health/` y `/api-docs.json`, confirmar redacción y respuestas, detener el proceso, borrar logs/cookies temporales y mostrar `git status --short` sin commit.
