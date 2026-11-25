# Proposal

## Why

El backend ya permite reservar turnos de 90 minutos, pero los cupos de una reserva son solo un contador agregado (`Reserva.cuposOcupados`) sin identidad de jugadores. El complejo necesita publicar partidos incompletos sobre turnos reservados y permitir que jugadores autenticados se anoten a los huecos con reglas de categoría, cupo y concurrencia, sin que esos lugares queden como un dato opaco.

## What Changes

- Nuevo modelo `Partido` asociado a una `Reserva` confirmada y a su `Turno`, con categoría del partido, estado y cupo máximo de 4.
- Nuevo modelo `Inscripcion` con `partidoId` + `usuarioId` únicos, para identificar a los jugadores anotados, evitar duplicados y permitir desvincularlos.
- Endpoints REST bajo `/api/partidos` para alta y edición por el administrador, consulta de huecos (`req.query`), detalle (`req.params`), inscripción y baja de jugadores, y cancelación por quórum.
- Reglas de dominio: el partido exige un turno `reservado`, admite categorías con hasta 1 categoría de diferencia, nunca supera 4 jugadores, usa `Transaction.LOCK.UPDATE` para el último cupo, mantiene el turno ocupado ante una baja a último momento y desvincula jugadores al cancelar por falta de quórum.
- Autorización con `authenticate` y `requireRole` sobre cookie HTTPOnly, errores de negocio con `AppError` + `next(err)` y documentación JSDoc `@swagger` bajo `/api-docs` con el tag `Partidos`.
- Actualización del README y del documento OpenAPI, más un delta sobre `reservation-management`, cuya spec actual afirma que no existen inscripciones individuales de jugadores.

No hay cambios rupturistas: ningún endpoint de los módulos 0 a 2 modifica su contrato.

## Capabilities

### New Capabilities

- `incomplete-matches`: creación y gestión de partidos incompletos sobre reservas confirmadas, consulta de cupos disponibles e inscripción y baja de jugadores, con reglas de categoría, concurrencia y cancelación por quórum.

### Modified Capabilities

- `reservation-management`: deja de ser válida la afirmación de que la reserva no tiene inscripciones individuales; se documenta que puede tener un partido asociado con jugadores identificados y que la cancelación por quórum cancela también la reserva sin republicar el turno.

## Impact

- `src/models/`: nuevos modelos `Partido.js` e `Inscripcion.js`, asociaciones y `sync()` en `index.js`, con las tablas MySQL `partidos` e `inscripciones`.
- Nuevos `src/routes/partido.routes.js`, `src/controllers/partido.controller.js`, `src/services/partido.service.js` y `src/utils/partidoValidation.js`, con el montaje del router en `src/app.js`.
- `src/config/swagger.js`: tag `Partidos`, esquemas propios y uso del esquema de seguridad `cookieAuth` ya existente; documentación en `README.md`.
- Sin dependencias npm nuevas: se reutilizan Sequelize/MySQL, JWT en cookie HTTPOnly, `AppError` y el middleware global de errores.
- Efecto observable nuevo: jugadores con sesión pueden ver huecos y anotarse; el administrador puede crear, editar y cancelar partidos. Las consultas y respuestas de reservas existentes se mantienen.
