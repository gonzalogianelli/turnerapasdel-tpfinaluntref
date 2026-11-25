# Design

## Context

Ver `proposal.md` para la motivación y `specs/` para el contrato de comportamiento. El proyecto ya cuenta con Express en ESM, MySQL/Sequelize, cookie HTTPOnly con JWT, `authenticate`/`requireRole`, `AppError` + middleware global, Swagger montado en `/api-docs` y un único modelo `User` sobre la tabla `usuarios`. No hay herramienta de migraciones: las tablas se crean con `sequelize.sync()` en `initModels()`.

## Goals / Non-Goals

**Goals:**

- Persistir canchas, turnos de 90 minutos y reservas con sus relaciones hacia `usuarios`, manteniendo compatibilidad con MySQL Workbench.
- Impedir superposiciones de turnos activos en una misma cancha y evitar dos solicitudes activas sobre un mismo turno, incluso con peticiones concurrentes.
- Centralizar las transiciones de estado de turnos y reservas para que la republicación manual y la no republicación tras cancelación sean observables y verificables.
- Exponer endpoints REST con filtros por `req.query`, identificadores por `req.params`, errores controlados y documentación OpenAPI con los tags `Canchas`, `Turnos` y `Reservas`.

**Non-Goals:**

- No generar turnos automáticamente desde una grilla.
- No modelar inscripción individual de jugadores, categorías compatibles, último cupo concurrente ni la regla de 1 hora.
- No enviar correos ni modificar el modelo `User` ni sus rutas.
- No introducir torneos, resultados, rankings ni multi-complejo.

## Decisions

- **Arquitectura en capas reutilizada.** Se crearán modelos, servicios, controladores, rutas y utilidades de validación propias para cada capability, siguiendo el patrón de `user.service.js`/`user.controller.js`/`user.routes.js`. Alternativa descartada: lógica de dominio dentro de los controladores, porque mezclaría validación, transacciones y respuestas HTTP.
- **Modelo de datos.** `Cancha` tendrá `id`, `nombre` no vacío y `bloqueada` booleano por defecto `false`. `Turno` tendrá `id`, `canchaId`, `fechaHoraInicio`, `fechaHoraFin`, `estado` ENUM (`disponible`, `reservado`, `cancelado`, `jugado`, `bloqueado`) y `timestamps`. `fechaHoraFin` se calcula siempre como `fechaHoraInicio + 90 minutos` y no se acepta en el body. `Reserva` tendrá `id`, `turnoId`, `usuarioId`, `estado` ENUM (`pendiente`, `confirmada`, `rechazada`, `cancelada`), `cupoMaximo` fijo en 4, `cuposOcupados` entre 1 y 4 y `timestamps`. Alternativa descartada: tabla de jugadores por reserva, porque pertenece al módulo de partidos incompletos.
- **Asociaciones centralizadas.** `src/models/index.js` registrará `Cancha.hasMany(Turno)`, `Turno.belongsTo(Cancha)`, `Turno.hasMany(Reserva)`, `Reserva.belongsTo(Turno)`, `User.hasMany(Reserva)` y `Reserva.belongsTo(User)`, e importará los nuevos modelos antes de `sequelize.sync()`. No se tocará `src/models/User.js`.
- **Cupos como dato agregado.** `cuposOcupados` se persiste directamente en `reservas` y de ahí se derivan `lugaresOcupados`, `lugaresFaltantes = cupoMaximo - cuposOcupados` y `esCompleta`. Alternativa descartada: tabla intermedia `reserva_jugadores`, porque implicaría inscripciones individuales fuera de alcance.
- **Unicidad de reserva activa por transacción.** No se usará un índice `UNIQUE (turnoId)` porque el historial debe conservar solicitudes rechazadas o canceladas y el turno puede republicarse. En su lugar, `crearReserva` abrirá `sequelize.transaction()`, bloqueará la fila del turno con `Transaction.LOCK.UPDATE`, verificará que no exista otra reserva en estado `pendiente` o `confirmada` para ese `turnoId`, y solo entonces creará la reserva y cambiará el turno a `reservado`. Alternativa descartada: comprobación sin bloqueo, que permite doble reserva bajo concurrencia.
- **Superposición de turnos con bloqueo de cancha.** `crearTurno`/`actualizarTurno` bloquearán la fila de `Cancha` con `Transaction.LOCK.UPDATE` y dentro de la transacción buscarán turnos activos (`disponible`, `reservado`, `bloqueado`) de esa cancha donde `fechaHoraInicio < nuevoFin AND fechaHoraFin > nuevoInicio`. Si existe, se lanza `AppError(409)`. Alternativa descartada: validar solo `fechaHoraInicio`, que deja pasar solapes parciales.
- **Transiciones de estado explícitas.** Las decisiones de reserva no se harán con un `PATCH` genérico de estado, sino con rutas dedicadas: confirmar (`pendiente` → `confirmada`, turno sigue `reservado`), rechazar (`pendiente` → `rechazada`, turno vuelve a `disponible`) y cancelar (`confirmada` → `cancelada`, turno pasa a `cancelado`). La republicación será un `PATCH /api/turnos/:id` con `estado: 'disponible'` ejecutado por administrador sobre un turno `cancelado`. Alternativa descartada: permitir cualquier transición desde un único endpoint, que facilitaría estados inválidos.
- **Rechazo versus cancelación.** Se asume que rechazar una solicitud devuelve el turno a `disponible` porque no hubo cancelación confirmada; cancelar una reserva confirmada deja el turno en `cancelado` y exige republicación manual. Esta distinción quedó registrada en la propuesta y en las specs.
- **Bloqueo de canchas y turnos.** Una cancha bloqueada no ofrece turnos reservables. Un turno puede pasarse a `bloqueado` solo si no tiene una reserva `pendiente` o `confirmada`; si la tiene, el administrador debe cancelarla antes. Alternativa descartada: bloquear automáticamente y desvincular la reserva, que no está previsto en las reglas del complejo.
- **Control de acceso.** Las rutas de consulta de canchas/turnos/reservas llevarán `authenticate`. Las escrituras de canchas y turnos, la actualización de cupos y las decisiones de reserva llevarán `authenticate` + `requireRole('administrador')`. La creación de reservas llevará `authenticate` + `requireRole('jugador')`. Un jugador solo verá sus propias reservas; el administrador verá todas.
- **Validación y errores.** Los payloads y filtros se validarán en utilidades propias que lanzan `AppError(400)`; ausencia de recursos da `404`, operaciones sobre estados inválidos o duplicados dan `409`, y problemas de sesión/rol dan `401`/`403`. Todos los controladores usarán `asyncHandler` o `try/catch` con `next(err)` para llegar al middleware global.
- **Swagger incremental.** Se ampliarán los `components.schemas` de `src/config/swagger.js` con `Cancha`, `Turno`, `Reserva` y sus request/response, y cada ruta nueva tendrá JSDoc `@swagger` con tags, `cookieAuth`, parámetros `in: path`/`in: query` y respuestas `200`/`201`/`400`/`401`/`403`/`404`/`409`. Alternativa descartada: documentación separada, porque `/api-docs.json` ya es la fuente única.

## Risks / Trade-offs

- **[Doble reserva por concurrencia]** → bloqueo pesimista del turno dentro de una transacción y verificación de reservas activas antes de insertar.
- **[Solapes parciales entre turnos]** → bloqueo de la cancha y comparación de intervalos semiabiertos `[inicio, fin)` con los estados activos.
- **[Historial versus restricción única]** → no hay `UNIQUE (turnoId)`; la integridad depende de que todas las altas pasen por el servicio transaccional.
- **[Cupos sin jugadores reales]** → `cuposOcupados` es un número agregado; el módulo de partidos incompletos deberá migrarlo a una relación con `usuarios`.
- **[Rechazo con republicación automática]** → decisión asumida y visible en specs; si el complejo la rechaza, el cambio debe volver a Fase 1 antes de implementarse.
- **[Fechas y zona horaria]** → se aceptarán cadenas ISO y se almacenarán como `DATETIME`; la API no convertirá zonas horarias, por lo que el cliente debe enviar una referencia consistente.
- **[`sequelize.sync()`]** → crea tablas nuevas pero no altera tablas existentes; cualquier cambio posterior de columnas requiere intervención manual en MySQL Workbench.

## Migration Plan

- No hay migration framework: al reiniciar el servidor, `initModels()` importará los nuevos modelos y `sequelize.sync()` creará `canchas`, `turnos` y `reservas` sin tocar `usuarios`.
- El orden de sincronización lo resuelve Sequelize a partir de las asociaciones; no se insertarán datos semilla automáticos.
- Rollback: detener el servidor y eliminar las tres tablas nuevas en MySQL Workbench si se descarta el módulo; no hay datos previos que migrar.
- Verificación manual esperada: `SHOW TABLES`, revisión de ENUMs y claves foráneas en MySQL Workbench, y ejecución de los flujos de reserva desde `/api-docs`.
