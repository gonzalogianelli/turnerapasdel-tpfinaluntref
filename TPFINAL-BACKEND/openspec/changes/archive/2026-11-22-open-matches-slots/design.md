# Design

## Context

Los módulos 0 a 2 ya están implementados: Express 5 con ESM, Sequelize sobre MySQL, JWT en cookie HTTPOnly con `authenticate` y `requireRole`, `AppError` con middleware global, `asyncHandler` y Swagger con `cookieAuth`. En `src/models/index.js` se inicializan y asocian `User`, `Cancha`, `Turno` y `Reserva` mediante `sequelize.sync()`.

`Reserva` registra cupos solo como dato agregado (`cupoMaximo = 4`, `cuposOcupados` entre 1 y 4) y la spec `reservation-management` lo declara explícitamente. Para el Módulo 3 se decidió incorporar un `Partido` con inscripciones individuales, creado por un administrador sobre una reserva confirmada, con consulta de huecos, inscripción, baja, cancelación por quórum y alta/edición (ver `proposal.md` y las specs del change).

## Goals / Non-Goals

**Goals:**

- Persistir partidos y jugadores inscriptos con integridad referencial, sin duplicados y con desvinculación explícita.
- Calcular los lugares ocupados y faltantes del partido desde las inscripciones reales.
- Aplicar las reglas de dominio de categoría, cupo, estado del turno y concurrencia.
- Exponer endpoints REST autenticados, documentados en `/api-docs` y consistentes con el manejo de errores existente.

**Non-Goals:**

- Modificar los contratos ni la lógica de confirmar, rechazar, cancelar o actualizar cupos de reservas del Módulo 2.
- Sincronizar `Reserva.cuposOcupados` con las inscripciones del partido: sigue siendo el agregado histórico de la solicitud.
- Inscribir automáticamente al titular de la reserva: se anota como cualquier otro jugador.
- Enviar correos, gestionar torneos, rankings, multi-complejo ni generar turnos automáticamente.

## Decisions

1. **Modelo de datos nuevo.** `Partido` con `id`, `reservaId` (único, FK a `reservas.id`), `categoria` (ENUM de las ocho categorías), `estado` y timestamps; `Inscripcion` con `id`, `partidoId` (FK), `usuarioId` (FK), timestamps y restricción única compuesta `(partidoId, usuarioId)`. `Reserva.hasOne(Partido)`, `Partido.hasMany(Inscripcion)` y `User.hasMany(Inscripcion)` se registran en `src/models/index.js`, junto con el retorno de `initModels()`. Se descartó reutilizar solo `cuposOcupados` porque no permite detectar duplicados, validar categorías ni desvincular jugadores; también se descartó guardar jugadores como JSON por falta de integridad referencial.
2. **Estados del partido y transiciones.** `incompleto` (inicial), `completo` (al cuarto inscripto), `cancelado` (quórum) y `jugado` (cierre administrativo). La baja de un inscripto devuelve `completo` a `incompleto` sin tocar el turno. `PATCH /api/partidos/:id` solo cambia `categoria` mientras el partido esté `incompleto` —revalidando a todos los inscriptos— o cierra un partido `completo` a `jugado`.
3. **Fuente de verdad de los cupos.** `Inscripcion` define los lugares del partido; `Reserva.cuposOcupados` permanece como dato histórico y no se recalcula. Se descartó sincronizar ambos valores porque alteraría el contrato de `PATCH /api/reservas/:id` y generaría dos fuentes de verdad contradictorias.
4. **Concurrencia.** Igual que `crearReserva`, la inscripción usa `sequelize.transaction()` con `Partido.findByPk(..., { lock: Transaction.LOCK.UPDATE })` para validar estado, cupo, duplicado y categoría dentro de la transacción, crear la inscripción y marcar el partido `completo` al llegar a cuatro. La restricción única compuesta es la segunda barrera y su error se traduce a `409`.
5. **Compatibilidad de categorías.** Se reutiliza el orden de `CATEGORIAS` de `src/models/User.js` invertido a `primera → octava`, y se admite la inscripción solo si `Math.abs(indiceJugador - indicePartido) <= 1`.
6. **Capas y errores.** Rutas con `authenticate` y `requireRole`; controladores con `asyncHandler` que leen `req.params.id`, `req.params.usuarioId`, `req.query` y `req.user`; servicios con las reglas de negocio y `AppError` (400/404/409); la baja de un tercero por un jugador responde `403`. No se agregan dependencias npm.
7. **API y documentación.** `POST /api/partidos`, `GET /api/partidos`, `GET /api/partidos/:id`, `PATCH /api/partidos/:id`, `POST /api/partidos/:id/inscripciones`, `DELETE /api/partidos/:id/inscripciones/:usuarioId` y `PATCH /api/partidos/:id/cancelar`. El router se monta en `src/app.js`; cada endpoint lleva JSDoc `@swagger` con tag `Partidos`, `cookieAuth`, parámetros de path/query y respuestas 200/201/400/401/403/404/409. Se agregan tag y esquemas en `src/config/swagger.js`; el glob de rutas ya existente incluye el archivo nuevo.
8. **Regla de la hora.** La ventaja de una hora de anticipación se trata como pauta operativa para ejecutar la cancelación por quórum, no como bloqueo técnico: el administrador ya puede cancelar reservas en cualquier momento y el nuevo endpoint mantiene esa misma facultad.

## Risks / Trade-offs

- **[Dos conteos de cupos]** `Reserva.cuposOcupados` y `Inscripcion` pueden diferir → Mitigación: el README y las respuestas de partidos dejan claro que el agregado de la reserva es histórico y que los huecos se calculan desde inscripciones.
- **[Carrera por el último lugar]** dos inscripciones simultáneas pueden exceder el cupo → Mitigación: bloqueo pesimista sobre el partido, restricción única y respuesta `409` al perdedor.
- **[Sin migraciones]** `sequelize.sync()` crea tablas nuevas pero no altera las existentes → Mitigación: verificar `partidos` e `inscripciones` en MySQL Workbench después de reiniciar; no reutilizar columnas de módulos anteriores.
- **[Cambio de categoría con inscriptos]** puede dejar jugadores incompatibles → Mitigación: revalidar todas las inscripciones dentro de la transacción y responder `409` sin aplicar el cambio.
- **[Baja a último momento]** podría tentar a republicar el turno → Mitigación: la baja solo elimina la inscripción y actualiza el partido; el turno se mantiene `reservado` o `jugado`.
- **[Exposición de datos personales]** el detalle del partido incluye jugadores → Mitigación: devolver solo `id`, `nombre` y `categoria`, nunca `password` ni su hash.

## Migration Plan

No hay datos previos que migrar. Al reiniciar el servidor, `sequelize.sync()` crea `partidos` e `inscripciones`; se agrega el router, los esquemas Swagger y la documentación del README. La verificación consiste en ejecutar el flujo completo con curl y comprobar ambas tablas en MySQL Workbench. Para revertir, se descartan los cambios del módulo y se reinicia: las tablas nuevas no se eliminan automáticamente y pueden borrarse manualmente desde Workbench si se desea.
