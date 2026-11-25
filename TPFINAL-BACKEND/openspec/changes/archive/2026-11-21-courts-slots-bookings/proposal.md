# Proposal

## Why

El Módulo 1 dejó resuelta la identidad, la sesión con cookie HTTPOnly y los roles `administrador`/`jugador`, pero el complejo todavía no puede gestionar su operación central: canchas, turnos de 90 minutos y solicitudes de reserva. Sin este módulo no hay forma de evitar una doble reserva en la misma cancha y franja horaria, ni de distinguir turnos disponibles, reservados, bloqueados o cancelados.

## What Changes

- Modelos Sequelize en MySQL (`canchas`, `turnos`, `reservas`) relacionados con `usuarios`, creados con `sequelize.sync()` y visibles en MySQL Workbench.
- Alta, edición y consulta de canchas por administrador; consulta autenticada de canchas para jugadores. Una cancha puede marcarse como `bloqueada`.
- Carga manual de turnos de 90 minutos por administrador (sin generación automática desde grilla), con validación de superposición en la misma cancha y bloqueo/republicación manual según corresponda.
- Estados de turno en DB: `disponible`, `reservado`, `cancelado`, `jugado`, `bloqueado`. El listado público de disponibles filtra estrictamente `estado = 'disponible'`.
- Un jugador puede solicitar una reserva sobre un turno `disponible`; la primera solicitud lo pasa a `reservado` y deja de mostrarse como disponible para otros jugadores, conservando el historial en DB.
- Cada reserva registra `cupoMaximo = 4`, `cuposOcupados` (entre 1 y 4) y si la reserva queda completa o incompleta, informando lugares ocupados y faltantes. No se incluyen inscripciones individuales, categorías compatibles, concurrencia por último cupo ni la regla de cancelación por falta de jugadores con 1 hora de anticipación.
- El administrador confirma, rechaza o cancela solicitudes. Una cancelación confirmada deja el turno en `cancelado` y **no** vuelve a `disponible`: requiere republicación explícita del administrador. Se asume que un rechazo sí devuelve el turno a `disponible` porque no es una cancelación confirmada.
- Control de acceso con `authenticate` y `requireRole`: las operaciones de escritura sobre canchas, turnos, confirmación/rechazo/cancelación y republicación son solo para `administrador`; la consulta y la creación de solicitudes son para `jugador` autenticado (y el administrador conserva acceso de consulta/gestión).
- Endpoints REST que usan `req.params` para identificadores y `req.query` para filtros de fecha, cancha, estado, disponibilidad y paginación, con errores de negocio vía `AppError` + `next(err)`.
- Anotaciones JSDoc `@swagger` con tags `Canchas`, `Turnos` y `Reservas`, parámetros `in: path`/`in: query` y respuestas `200`/`201`/`400`/`401`/`403`/`404`/`409`, bajo `/api-docs` y `/api-docs.json`.

**Fuera de alcance:** partidos incompletos con inscripción de jugadores, validación de categorías ±1, `Transaction.LOCK.UPDATE` para último cupo, baja de jugadores a último momento, regla de 1 hora, envíos de Nodemailer, torneos, cuadros, resultados, rankings y multi-complejo.

## Capabilities

### New Capabilities

- `court-management`: alta, edición, consulta y bloqueo de canchas del complejo.
- `slot-management`: turnos manuales de 90 minutos, estados, bloqueo, superposición y republicación.
- `reservation-management`: solicitudes de reserva, cupos, confirmación/rechazo/cancelación por el administrador y control de acceso por rol.

### Modified Capabilities

- `app-foundation`: se generaliza la cobertura de documentación OpenAPI para que el documento incluya también los endpoints de canchas, turnos y reservas con sus parámetros y respuestas, además de los de autenticación y usuarios.

## Impact

- **Código nuevo:** `src/models/Cancha.js`, `src/models/Turno.js`, `src/models/Reserva.js`; `src/services/cancha.service.js`, `src/services/turno.service.js`, `src/services/reserva.service.js`; controladores, rutas y utilidades de validación equivalentes; asociaciones centralizadas en `src/models/index.js`.
- **Código modificado:** `src/app.js` (montar `/api/canchas`, `/api/turnos`, `/api/reservas`), `src/models/index.js` (registrar modelos y asociaciones), `src/config/swagger.js` (esquemas de cancha/turno/reserva) y `README.md`.
- **Base de datos:** nuevas tablas creadas por `sequelize.sync()`; `turnos` con ENUM de estados y `reservas` con `cupoMaximo`, `cuposOcupados` y estado de solicitud.
- **Dependencias:** no se agregan paquetes; se reutilizan `sequelize`, `mysql2`, `express`, `swagger-jsdoc` y los middlewares de auth existentes.
- **APIs:** se introducen `/api/canchas/*`, `/api/turnos/*` y `/api/reservas/*`; Swagger pasa a documentar los cinco tags del módulo (`Canchas`, `Turnos`, `Reservas`, además de `Auth` y `Usuarios`).
- **Módulos posteriores:** partidos incompletos y notificaciones usarán las canchas, turnos y reservas definidos aquí.
