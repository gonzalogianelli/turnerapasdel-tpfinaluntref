# Tasks

## 1. Modelos y asociaciones

- [x] 1.1 Crear `src/models/Cancha.js` con la tabla `canchas`, `id`, `nombre` no vacío, `bloqueada` booleano por defecto `false` y `timestamps`; verificar importando el módulo que `rawAttributes` contiene esos campos y que no lanza error de definición.
- [x] 1.2 Crear `src/models/Turno.js` con la tabla `turnos`, `canchaId`, `fechaHoraInicio`, `fechaHoraFin`, `estado` ENUM (`disponible`, `reservado`, `cancelado`, `jugado`, `bloqueado`) y `timestamps`; verificar que la duración exportada sea 90 minutos y que el ENUM tenga los cinco valores.
- [x] 1.3 Crear `src/models/Reserva.js` con la tabla `reservas`, `turnoId`, `usuarioId`, `estado` ENUM (`pendiente`, `confirmada`, `rechazada`, `cancelada`), `cupoMaximo` por defecto 4, `cuposOcupados` entre 1 y 4 y `timestamps`; verificar `rawAttributes` y que un valor fuera de rango falla la validación.
- [x] 1.4 Actualizar `src/models/index.js` para importar los tres modelos, registrar las asociaciones con `User` y devolverlos desde `initModels()`; verificar con MySQL arriba que `SHOW TABLES` incluye `canchas`, `turnos` y `reservas`, y revisar ENUMs y claves foráneas en MySQL Workbench.

## 2. Canchas

- [x] 2.1 Crear `src/utils/canchaValidation.js` con validación de `nombre`, `bloqueada`, identificadores de ruta y filtros `page`/`limit`, lanzando `AppError(400)` ante valores inválidos; verificar con un script temporal que un payload válido pasa y que `nombre` vacío, `bloqueada` no booleano y `page` menor que 1 lanzan 400.
- [x] 2.2 Crear `src/services/cancha.service.js` con `listCanchas`, `getCanchaById`, `createCancha` y `updateCancha`, aplicando filtros `nombre`/`bloqueada`, paginación y regla de bloqueo; verificar que una cancha bloqueada queda fuera del listado habilitado y que al desbloquearla vuelve a aparecer.
- [x] 2.3 Crear `src/controllers/cancha.controller.js` y `src/routes/cancha.routes.js` con `GET /api/canchas`, `POST /api/canchas`, `GET /api/canchas/:id` y `PATCH /api/canchas/:id`, usando `authenticate` en consultas y `requireRole('administrador')` en escrituras; verificar con curl 200/201 para administrador, 403 para jugador, 401 sin cookie y 404 para un identificador inexistente.
- [x] 2.4 Anotar con JSDoc `@swagger` las cuatro operaciones de canchas (tag `Canchas`, `cookieAuth`, parámetros `in: query`/`in: path` y respuestas 200/201/400/401/403/404); verificar en `/api-docs.json` que aparecen los paths con sus parámetros.

## 3. Turnos de 90 minutos

- [x] 3.1 Crear `src/utils/turnoValidation.js` con validación de `canchaId`, `fechaHoraInicio` ISO, `estado`, filtros `fecha`/`canchaId`/`estado`/`page`/`limit` y cálculo de `fechaHoraFin = fechaHoraInicio + 90 min`; verificar con un script temporal que una fecha inválida lanza 400 y que el fin calculado es exactamente 90 minutos después.
- [x] 3.2 Crear `src/services/turno.service.js` con `listTurnos`, `getTurnoById`, `createTurno` y `updateTurno`, ejecutando altas/ediciones en `sequelize.transaction()` con `Transaction.LOCK.UPDATE` sobre `Cancha` y rechazando con 409 solapes `[inicio, fin)` contra turnos `disponible`, `reservado` o `bloqueado` de la misma cancha; verificar que dos turnos solapados en la misma cancha dan 409, en canchas distintas dan 201 y un turno `cancelado` no bloquea la franja.
- [x] 3.3 Implementar las reglas de estado de turno: bloqueo solo sin reserva `pendiente`/`confirmada`, marcar `jugado`, cancelación sin republicación automática y republicación explícita a `disponible` solo desde `cancelado`; verificar con curl que un turno cancelado no aparece en `GET /api/turnos` para jugador y que reaparece después del `PATCH /api/turnos/:id` del administrador con `estado: 'disponible'`.
- [x] 3.4 Crear `src/controllers/turno.controller.js` y `src/routes/turno.routes.js` con `GET /api/turnos`, `POST /api/turnos`, `GET /api/turnos/:id` y `PATCH /api/turnos/:id`, con roles y filtros; verificar que el jugador recibe solo turnos `disponible` aunque envíe `estado=reservado`, que el administrador ve todos y que el jugador recibe 403 al crear o editar.
- [x] 3.5 Anotar con JSDoc `@swagger` las cuatro operaciones de turnos (tag `Turnos`, `cookieAuth`, parámetros `in: query`/`in: path` y respuestas 200/201/400/401/403/404/409); verificar en `/api-docs.json` los paths con sus filtros y parámetros.

## 4. Reservas y cupos

- [x] 4.1 Crear `src/utils/reservaValidation.js` con validación de `turnoId`, `cuposOcupados` entre 1 y 4, `estado`, filtros `estado`/`turnoId`/`fecha`/paginación y helpers para `lugaresFaltantes` y `esCompleta`; verificar con un script temporal que 0 y 5 cupos lanzan 400 y que 4 cupos da `faltantes = 0` y reserva completa.
- [x] 4.2 Crear `src/services/reserva.service.js` con `crearReserva` en `sequelize.transaction()` y `Transaction.LOCK.UPDATE` sobre `Turno`, rechazando con 409 si ya existe reserva `pendiente` o `confirmada`, creando la nueva en `pendiente` y pasando el turno a `reservado`; verificar con dos solicitudes concurrentes al mismo turno que una responde 201, la otra 409 y queda una sola reserva activa en DB.
- [x] 4.3 Implementar `listReservas` y `getReservaById` con aislamiento por rol: jugador solo `usuarioId = req.user.id`, administrador todas, filtros de `req.query` y 404 para reserva ajena o inexistente del jugador; verificar con dos jugadores que cada uno ve solo sus reservas y que el administrador ve ambas.
- [x] 4.4 Implementar `confirmarReserva`, `rechazarReserva`, `cancelarReserva` y `actualizarCupos` con transiciones válidas y efectos en el turno: confirmar mantiene `reservado`, rechazar devuelve `disponible`, cancelar deja `cancelado` sin republicar y actualizar cupos recalcula faltantes; verificar el flujo solicitar→confirmar→cancelar y que el turno sigue fuera de disponibles hasta la republicación administrativa.
- [x] 4.5 Crear `src/controllers/reserva.controller.js` y `src/routes/reserva.routes.js` con `GET /api/reservas`, `POST /api/reservas`, `GET /api/reservas/:id`, `PATCH /api/reservas/:id`, `PATCH /api/reservas/:id/confirmar`, `PATCH /api/reservas/:id/rechazar` y `PATCH /api/reservas/:id/cancelar`, aplicando `authenticate`, `requireRole('jugador')` en la creación y `requireRole('administrador')` en el resto de escrituras; verificar respuestas 201/200/400/401/403/404/409 con curl.
- [x] 4.6 Anotar con JSDoc `@swagger` las siete operaciones de reservas (tag `Reservas`, `cookieAuth`, parámetros `in: query`/`in: path` y respuestas 200/201/400/401/403/404/409); verificar en `/api-docs.json` los paths, sus filtros y el esquema de seguridad.

## 5. Composición, Swagger global y README

- [x] 5.1 Montar los routers de canchas, turnos y reservas en `src/app.js` antes de `notFound` y sin abrir puerto al importar la app; verificar que `npm run dev` levanta sin errores y que `/api/health` sigue respondiendo 200.
- [x] 5.2 Ampliar `src/config/swagger.js` con esquemas `Cancha`, `Turno`, `Reserva` y sus request/response, reutilizando `cookieAuth`; verificar que `/api-docs.json` incluye los esquemas nuevos y los tags `Canchas`, `Turnos` y `Reservas`.
- [x] 5.3 Actualizar `README.md` con los modelos, endpoints, filtros, flujo solicitar→confirmar→cancelar→republicar y ejemplos curl para administrador y jugador; verificar que los comandos documentados funcionan tal cual con datos de prueba y sin incluir secretos.
- [x] 5.4 Verificar ESM estricto en archivos nuevos y modificados (`import`/`export`, extensión `.js` en imports relativos, sin `require` ni `module.exports`); verificar recorriendo `src/**/*.js` que no queda ninguna violación.

## 6. Verificación de integración

- [x] 6.1 Ejecutar el flujo completo con el servidor levantado: login de administrador → crear cancha → crear turno de 90 minutos → login de jugador → consultar disponibles → solicitar reserva → turno desaparece de disponibles → confirmación → cancelación → turno no reaparece → republicación → turno reaparece; verificar los estados en cada respuesta.
- [x] 6.2 Verificar en MySQL Workbench o con `SHOW TABLES`/`DESCRIBE` las tablas `canchas`, `turnos` y `reservas`, sus ENUMs, claves foráneas y filas con `cuposOcupados`, comprobando que `usuarios` no fue modificada.
- [x] 6.3 Ejecutar `openspec validate courts-slots-bookings` y verificar que no haya errores; comprobar que el working tree no incluye `.env` ni secretos antes del commit.

## Workflow follow-up

- Archivar el cambio con OpenSpec una vez que el usuario apruebe la verificación manual del módulo.
- Sugerir el mensaje de commit en Git al cierre del módulo.
