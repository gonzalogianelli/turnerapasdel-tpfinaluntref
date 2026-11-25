# Tasks: soft-delete-admin-notify

## 1. Modelo y migración de baja lógica

- [x] 1.1 Agregar `deletedAt` nullable y `paranoid: true` a `User`, `Cancha`, `Turno`, `Reserva`, `Partido` e `Inscripcion`, conservando el `defaultScope` de `User` que excluye `password`; verificar con `node --check src/models/*.js` y con una consulta Sequelize que un registro bajado no se devuelva por defecto.
- [x] 1.2 Implementar en `initModels()` la migración idempotente con `describeTable` y `addColumn` para las seis tablas, sin `sync({ alter: true })`; verificar que una segunda llamada no intenta agregar la columna y que no se eliminan filas.
- [x] 1.3 Agregar `test/softDeleteLifecycle.test.js` con `node:test` + `supertest` para columna, ocultamiento, `404`, `400` y migración repetida; verificar que `npm test` pasa con el nuevo archivo.

## 2. Baja lógica de usuarios y autenticación

- [x] 2.1 Implementar `deleteUser` en `src/services/user.service.js` con transacción, `LOCK.UPDATE`, guard de último administrador, bloqueo por reservas/inscripciones activas y respuesta `200` sin contraseña; verificar con tests de baja válida, último admin, dependencias activas e historial terminal.
- [x] 2.2 Agregar `DELETE /api/users/:id` en `src/routes/user.routes.js` y su controlador con `authenticate, requireRole('administrador')`, bloque JSDoc `@swagger` con `cookieAuth`, parámetro de ruta y respuestas `200/400/401/403/404/409`; verificar que `/api-docs.json` incluye la operación.
- [x] 2.3 Ajustar búsquedas de email en `auth.service.js` y `user.service.js` para detectar emails de usuarios bajados con `paranoid: false` y responder `409`; verificar con tests de registro público y alta administrativa.
- [x] 2.4 Verificar que `loginUser` y `authenticate` rechacen con `401` a usuarios bajados mediante scopes/consultas paranoid; agregar tests de login y cookie válida de usuario bajado.

## 3. Baja lógica de canchas y turnos

- [x] 3.1 Implementar `deleteCancha` con transacción y `409` si existen turnos vigentes `disponible`, `reservado` o `bloqueado`; agregar ruta, controlador y JSDoc `@swagger` de `DELETE /api/canchas/:id`; verificar tests de baja permitida, conflicto, RBAC, `404` y `400`.
- [x] 3.2 Implementar `deleteTurno` con transacción, `LOCK.UPDATE` y `409` si existen reservas vigentes `pendiente` o `confirmada`; agregar ruta, controlador y JSDoc `@swagger` de `DELETE /api/turnos/:id`; verificar tests de baja permitida, conflicto, RBAC y `404`.
- [x] 3.3 Verificar que la baja de turno no cambie `estado` ni republique, y que crear una reserva sobre un turno bajado responda `404`; verificar con tests de integración que el turno sigue `cancelado`/`jugado` en su fila histórica.

## 4. Baja lógica de reservas, partidos e inscripciones

- [x] 4.1 Implementar `deleteReserva` solo para estados terminales sin partido vigente, sin tocar el turno; agregar ruta, controlador y JSDoc `@swagger` de `DELETE /api/reservas/:id`; verificar tests de `409` para `pendiente`/`confirmada`, partido activo y baja permitida.
- [x] 4.2 Implementar `deletePartido` solo para partidos `jugado`/`cancelado` sin inscripciones vigentes; agregar ruta, controlador y JSDoc `@swagger` de `DELETE /api/partidos/:id`; verificar tests de baja permitida, partido activo, inscripciones vigentes, RBAC y `404`.
- [x] 4.3 Convertir `darDeBaja` y `cancelarPorQuorum` para marcar inscripciones con `deletedAt` en lugar de borrarlas, recalculando cupos sobre filas activas; verificar tests de baja propia, baja por admin, tercero `403`, quórum y turno no republicado.
- [x] 4.4 Agregar `requireRole('jugador', 'administrador')` al DELETE de inscripción y ajustar la comprobación de duplicado en `inscribirJugador` para responder `409` ante reinscripción histórica; verificar tests de RBAC de inscripción y de `409` por UNIQUE histórico.

## 5. Destinatario administrativo por entorno

- [x] 5.1 Agregar `ADMIN_NOTIFY_EMAIL` a `src/config/env.js` y `.env.example`, con fallback a `SMTP_USER` válido y sin valor/example hardcodeado; verificar que arrancar sin ambas variables no lanza error y que `.env.example` documenta el nuevo campo.
- [x] 5.2 Reemplazar la resolución de administradores por DB en `notification.service.js` con un resolvedor de entorno, omitiendo el destinatario admin cuando no haya email válido y conservando destinatarios históricos de usuarios bajados; verificar con tests inyectando `deps.sendMail`.
- [x] 5.3 Eliminar `admin@example.com` de código, README, ejemplos y configuración; verificar con búsqueda en repo que no queda ninguna ocurrencia y con test que no se usa como fallback.

## 6. Documentación y OpenAPI

- [x] 6.1 Verificar que `/api-docs.json` contiene los seis DELETE con `cookieAuth`, `in: path`, `200`, `400`, `401`, `403`, `404` y `409` según corresponda; ajustar bloques JSDoc o schemas en `src/config/swagger.js` y correr el test `openapi.test.js`.
- [x] 6.2 Actualizar `README.md` con la matriz de endpoints DELETE, reglas de estados terminales, conservación de historial, unicidad histórica y `ADMIN_NOTIFY_EMAIL`, reemplazando ejemplos de login por `$ADMIN_EMAIL`/`$PLAYER_EMAIL`; verificar que los comandos copiados no contienen `admin@example.com`.

## 7. Verificación integral y limpieza

- [x] 7.1 Ejecutar `npm test` completo y verificar que todos los tests de RBAC, baja lógica, emails y OpenAPI pasan sin datos residuales.
- [x] 7.2 Ejecutar `node --check` sobre todos los archivos `.js` modificados y `openspec validate --all --strict`, verificando que no hay errores de sintaxis ni de specs.
- [x] 7.3 Ejecutar el checklist de `padel-backend-qa` sobre la DB de prueba, incluyendo smoke de los nuevos DELETE, 401/403, 404, 409 y destinatario admin; verificar limpieza de minutos temporales, puertos y datos QA.
- [x] 7.4 Revisar `git status --short` y el diff final para confirmar que solo hay cambios del change, sin secretos, cookies, tokens ni artifacts temporales.
