# Tasks

## 1. Modelos y asociaciones del Módulo 3

- [x] 1.1 Crear `src/models/Partido.js` con `id`, `reservaId` único, `categoria`, `estado` (`incompleto`, `completo`, `cancelado`, `jugado`) y constantes exportadas; verificar con `node --check src/models/Partido.js`.
- [x] 1.2 Crear `src/models/Inscripcion.js` con `id`, `partidoId`, `usuarioId` y restricción única compuesta `(partidoId, usuarioId)`; verificar con `node --check src/models/Inscripcion.js`.
- [x] 1.3 Registrar `Reserva.hasOne(Partido)`, `Partido.belongsTo(Reserva)`, `Partido.hasMany(Inscripcion)`, `Inscripcion.belongsTo(Partido)` y las asociaciones con `User` en `src/models/index.js`, exportando los modelos nuevos en `initModels()`; verificar que `npm start` sincronice y que las tablas `partidos` e `inscripciones` existan en MySQL Workbench.

## 2. Validaciones y reglas de dominio

- [x] 2.1 Crear `src/utils/partidoValidation.js` con parseo de `req.params` y `req.query`, validación de `categoria` y `estado`, cálculo de lugares ocupados/faltantes y comparación de categorías con diferencia máxima de 1; verificar con `node --check` y una ejecución manual que acepte `octava`/`séptima` y rechace `octava`/`sexta` con `AppError(409)`.
- [x] 2.2 Definir el serializador de partido que expone `cupoMaximo: 4`, `lugaresOcupados`, `lugaresFaltantes`, `esCompleta` y los inscriptos con solo `id`, `nombre` y `categoria`; verificar que la respuesta nunca incluya `password`.

## 3. Alta, consulta, edición y cierre de partidos

- [x] 3.1 Implementar en `src/services/partido.service.js` la creación sobre reserva confirmada con turno `reservado` y sin partido previo, usando `AppError` para 404/409; verificar con curl que un alta válida devuelva `201` en estado `incompleto` y un duplicado devuelva `409`.
- [x] 3.2 Implementar el listado con filtros de `req.query` (`categoria`, `estado`, `fecha`, `page`, `limit`) y la restricción de jugadores a partidos `incompleto`; verificar con curl que un jugador no vea partidos `completo` y que un filtro inválido devuelva `400`.
- [x] 3.3 Implementar el detalle por `req.params.id`, permitiendo a un jugador ver sus propios partidos y devolviendo `404` para los ajenos; verificar ambos casos con curl.
- [x] 3.4 Implementar `PATCH /api/partidos/:id` para cambiar `categoria` revalidando inscriptos y para cerrar a `jugado` solo si está `completo`; verificar con curl el éxito y los rechazos `409`.

## 4. Inscripción y baja de jugadores

- [x] 4.1 Implementar la inscripción con `sequelize.transaction()` y `Transaction.LOCK.UPDATE` sobre el partido, validando estado, turno `reservado`, cupo, duplicado y categoría; verificar con curl `201`, `409` por partido completo, `409` por duplicado y `409` por categoría incompatible.
- [x] 4.2 Verificar la concurrencia del último cupo lanzando dos inscripciones simultáneas y comprobando que una responde `201`, la otra `409` y la tabla `inscripciones` queda con exactamente cuatro filas para ese partido.
- [x] 4.3 Implementar la baja de la propia inscripción y la baja dispuesta por el administrador mediante `DELETE /api/partidos/:id/inscripciones/:usuarioId`, sin modificar el turno; verificar con curl que un jugador recibe `403` al borrar a otro y que el turno sigue `reservado` tras la baja.

## 5. Cancelación por falta de quórum

- [x] 5.1 Implementar `PATCH /api/partidos/:id/cancelar` en una transacción que elimine las inscripciones, marque el partido `cancelado`, la reserva `cancelada` y el turno `cancelado`, sin republicación; verificar con curl y consultas en MySQL Workbench.
- [x] 5.2 Verificar que un partido `completo` no se pueda cancelar por quórum (`409`) y que, después de una cancelación válida, el turno no aparezca en `GET /api/turnos` para un jugador.

## 6. Capa HTTP, seguridad y documentación OpenAPI

- [x] 6.1 Crear `src/controllers/partido.controller.js` con `asyncHandler`, leyendo `req.params`, `req.query` y `req.user` y delegando en el servicio con `next(err)`; verificar que los errores lleguen al middleware global con formato `{ status: 'error', message }`.
- [x] 6.2 Crear `src/routes/partido.routes.js` con `authenticate` y `requireRole` según la operación, incluyendo bloques JSDoc `@swagger` con tag `Partidos`, `cookieAuth`, parámetros de path/query y respuestas 200/201/400/401/403/404/409; verificar con curl los casos sin cookie (`401`) y con rol incorrecto (`403`).
- [x] 6.3 Montar el router en `src/app.js` bajo `/api/partidos` y agregar el tag y los esquemas `Partido`, `Inscripcion` y de respuesta en `src/config/swagger.js`; verificar que `/api-docs.json` liste las siete rutas nuevas sin errores de generación.

## 7. Documentación y verificación integral

- [x] 7.1 Ampliar `README.md` con el Módulo 3: tablas, estados del partido, endpoints, reglas de categoría/cupo, aclaración de que `Reserva.cuposOcupados` es histórico y un flujo completo con curl; verificar ejecutando los comandos documentados contra el servidor local.
- [x] 7.2 Ejecutar la verificación integral: `npm start`, flujo administrador crea reserva y partido, varios jugadores se inscriben, baja, cierre y cancelación por quórum, comprobando estados en MySQL Workbench; verificar que no haya errores en la consola ni regresiones en los endpoints de los módulos 0 a 2.

## Workflow follow-up

- Esperar la revisión y aprobación explícita del usuario antes de iniciar la implementación.
- Una vez verificado el módulo, archivar el cambio con `openspec archive open-matches-slots` y proponer el mensaje de commit.
