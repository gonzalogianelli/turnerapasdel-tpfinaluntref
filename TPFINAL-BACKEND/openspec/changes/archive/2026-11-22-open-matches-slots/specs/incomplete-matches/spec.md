# Spec Delta

## Purpose

Gestiona partidos incompletos creados por el administrador sobre reservas confirmadas, publica los huecos disponibles para jugadores autenticados y controla inscripción, baja y cancelación por falta de quórum con reglas de cupo y categoría.

## ADDED Requirements

### Requirement: Alta de partidos incompletos por el administrador
El sistema SHALL permitir que un administrador cree un partido sobre una reserva confirmada indicando `reservaId` y `categoria`, respondiendo `201` con estado inicial `incompleto`, cero inscriptos y cuatro lugares faltantes.

#### Scenario: Alta válida sobre reserva confirmada
- **WHEN** un administrador crea un partido con una reserva confirmada cuyo turno está `reservado` y una categoría válida
- **THEN** el sistema responde `201`, crea el partido en estado `incompleto` e informa cero lugares ocupados y cuatro faltantes

#### Scenario: Reserva inexistente
- **WHEN** el `reservaId` enviado no corresponde a una reserva existente
- **THEN** el sistema responde `404` y no crea el partido

#### Scenario: Reserva no apta para partido
- **WHEN** la reserva no está confirmada, su turno no está `reservado` o ya tiene un partido asociado
- **THEN** el sistema responde `409` y no crea otro partido

#### Scenario: Categoría inválida
- **WHEN** la categoría enviada no pertenece a las ocho categorías definidas
- **THEN** el sistema responde `400` y no crea el partido

### Requirement: Edición y cierre de partidos por el administrador
El sistema SHALL permitir que un administrador modifique la `categoria` de un partido `incompleto` y cierre un partido `completo` marcándolo `jugado` mediante `PATCH /api/partidos/:id`.

#### Scenario: Edición de categoría sin inscriptos incompatibles
- **WHEN** un administrador cambia la categoría de un partido `incompleto` y todos los inscriptos siguen siendo compatibles
- **THEN** el sistema responde `200` y persiste la nueva categoría

#### Scenario: Edición que deja un inscripto incompatible
- **WHEN** el cambio de categoría deja a algún inscripto fuera del rango permitido
- **THEN** el sistema responde `409` y conserva la categoría original

#### Scenario: Cierre de partido completo
- **WHEN** un administrador marca como `jugado` un partido con cuatro inscriptos
- **THEN** el sistema responde `200` y el partido queda en estado `jugado`

#### Scenario: Cierre de partido incompleto
- **WHEN** un administrador intenta cerrar un partido que no está `completo`
- **THEN** el sistema responde `409` y no modifica el estado

### Requirement: Consulta de huecos disponibles
El sistema SHALL exponer `GET /api/partidos` con filtros de `req.query` `categoria`, `estado`, `fecha`, `page` y `limit`. Un jugador SHALL ver solo partidos `incompleto`; un administrador SHALL ver todos los estados.

#### Scenario: Jugador consulta huecos
- **WHEN** un jugador con sesión válida solicita el listado de partidos
- **THEN** el sistema responde `200` únicamente con partidos en estado `incompleto`

#### Scenario: Administrador consulta todos los partidos
- **WHEN** un administrador con sesión válida solicita el listado de partidos
- **THEN** el sistema responde `200` con partidos de todos los estados

#### Scenario: Filtros y paginación aplicados
- **WHEN** la consulta incluye valores válidos de `categoria`, `estado`, `fecha`, `page` o `limit`
- **THEN** el sistema devuelve solo los partidos que cumplen esos filtros con la paginación solicitada

#### Scenario: Filtro inválido
- **WHEN** alguno de los filtros o parámetros de paginación no tiene un valor válido
- **THEN** el sistema responde `400` y no devuelve resultados parciales

### Requirement: Detalle de partido
El sistema SHALL exponer `GET /api/partidos/:id` e informar los jugadores inscriptos, lugares ocupados, lugares faltantes y la categoría del partido. Un jugador SHALL ver solo partidos `incompleto` o aquellos en los que tiene una inscripción; un administrador SHALL ver cualquiera.

#### Scenario: Administrador consulta cualquier partido
- **WHEN** un administrador solicita el detalle de un partido por su identificador de ruta
- **THEN** el sistema responde `200` con los datos completos del partido

#### Scenario: Jugador consulta un hueco
- **WHEN** un jugador solicita el detalle de un partido `incompleto`
- **THEN** el sistema responde `200` con los lugares ocupados y faltantes

#### Scenario: Detalle ajeno o inexistente para un jugador
- **WHEN** un jugador solicita un partido `completo`, `cancelado` o `jugado` en el que no está inscripto, o un identificador inexistente
- **THEN** el sistema responde `404` y no revela los datos del partido

#### Scenario: Identificador de ruta inválido
- **WHEN** el identificador de ruta no es un entero positivo
- **THEN** el sistema responde `400`

### Requirement: Compatibilidad de categorías
El sistema SHALL admitir la inscripción solo cuando la categoría del jugador esté a lo sumo una posición de la categoría del partido en el orden `primera`, `segunda`, `tercera`, `cuarta`, `quinta`, `sexta`, `séptima`, `octava`.

#### Scenario: Misma categoría
- **WHEN** un jugador de `octava` se inscribe en un partido de `octava`
- **THEN** el sistema acepta la inscripción

#### Scenario: Una categoría de diferencia
- **WHEN** un jugador de `octava` se inscribe en un partido de `séptima`, o uno de `séptima` en un partido de `octava`
- **THEN** el sistema acepta la inscripción

#### Scenario: Dos categorías de diferencia
- **WHEN** un jugador de `octava` intenta inscribirse en un partido de `sexta`
- **THEN** el sistema responde `409` y no registra la inscripción

### Requirement: Inscripción de jugadores
El sistema SHALL permitir que un jugador autenticado se inscriba en un partido `incompleto` mediante `POST /api/partidos/:id/inscripciones`, siempre que quede un lugar, no esté ya inscripto, la categoría sea compatible y el turno asociado siga `reservado`.

#### Scenario: Inscripción válida
- **WHEN** un jugador se inscribe en un partido `incompleto` con lugar disponible y categoría compatible
- **THEN** el sistema responde `201`, registra la inscripción e incrementa en uno los lugares ocupados

#### Scenario: Partido sin lugares
- **WHEN** el partido ya tiene cuatro inscriptos
- **THEN** el sistema responde `409` y no agrega la inscripción

#### Scenario: Jugador repetido
- **WHEN** el jugador ya tiene una inscripción en ese partido
- **THEN** el sistema responde `409` y no duplica la inscripción

#### Scenario: Partido o turno inactivo
- **WHEN** el partido está `cancelado` o `jugado`, o su turno ya no está `reservado`
- **THEN** el sistema responde `409` y no registra la inscripción

### Requirement: Concurrencia en el último cupo
El sistema SHALL procesar las inscripciones simultáneas al último lugar de forma serializada, aceptando solo la primera y respondiendo `409` a las demás.

#### Scenario: Dos inscripciones simultáneas al último lugar
- **WHEN** dos jugadores intentan inscribirse al mismo tiempo cuando queda un solo lugar
- **THEN** una inscripción responde `201`, la otra responde `409` y el partido queda con exactamente cuatro inscriptos

#### Scenario: Intento posterior sobre partido completo
- **WHEN** otro jugador intenta inscribirse después de que se ocupó el último lugar
- **THEN** el sistema responde `409` y el partido sigue con cuatro inscriptos

### Requirement: Baja de jugadores sin republicación
El sistema SHALL permitir que un jugador se dé de baja de su propia inscripción y que un administrador retire cualquier inscripción mediante `DELETE /api/partidos/:id/inscripciones/:usuarioId`, sin devolver el turno a `disponible`.

#### Scenario: Baja propia
- **WHEN** un jugador solicita la baja de su inscripción en un partido
- **THEN** el sistema responde `200`, elimina la inscripción y el partido pasa a `incompleto` si estaba `completo`

#### Scenario: Baja dispuesta por el administrador
- **WHEN** un administrador quita la inscripción de otro jugador
- **THEN** el sistema responde `200` y actualiza los lugares ocupados del partido

#### Scenario: Jugador intenta quitar a otro
- **WHEN** un jugador intenta borrar la inscripción de un tercero
- **THEN** el sistema responde `403` y no elimina la inscripción

#### Scenario: Baja a último momento
- **WHEN** un jugador se da de baja cerca del inicio del turno
- **THEN** el turno permanece ocupado o `jugado` y no se publica nuevamente como disponible

#### Scenario: Inscripción inexistente
- **WHEN** el jugador indicado no tiene inscripción en el partido
- **THEN** el sistema responde `404`

### Requirement: Cancelación por falta de quórum
El sistema SHALL permitir que un administrador cancele un partido `incompleto` mediante `PATCH /api/partidos/:id/cancelar`, desvinculando todas las inscripciones y cancelando la reserva y el turno sin republicación automática.

#### Scenario: Cancelación de partido incompleto
- **WHEN** un administrador cancela un partido que no reunió los cuatro jugadores
- **THEN** el sistema responde `200`, elimina todas las inscripciones, marca el partido `cancelado`, la reserva `cancelada` y el turno `cancelado`

#### Scenario: Turno cancelado no reaparece
- **WHEN** un jugador consulta los turnos disponibles después de la cancelación por quórum
- **THEN** el turno cancelado no aparece en el listado de disponibles

#### Scenario: Partido completo
- **WHEN** un administrador intenta cancelar por quórum un partido con cuatro inscriptos
- **THEN** el sistema responde `409` y no modifica el partido ni el turno

#### Scenario: Cancelación sin sesión o por un jugador
- **WHEN** la cancelación la solicita un jugador o una solicitud sin cookie válida
- **THEN** el sistema responde `403` o `401` según corresponda y no aplica la cancelación

### Requirement: Control de acceso por rol en partidos
El sistema SHALL responder `401` cuando falte una cookie de sesión válida y `403` cuando el rol autenticado no esté autorizado para crear, editar, cerrar o cancelar partidos, o para inscribir jugadores.

#### Scenario: Jugador intenta gestionar partidos
- **WHEN** un jugador intenta crear, editar, cerrar o cancelar un partido
- **THEN** el sistema responde `403` y no aplica la operación

#### Scenario: Administrador intenta inscribirse
- **WHEN** un administrador intenta inscribirse en un partido
- **THEN** el sistema responde `403` y no registra la inscripción

#### Scenario: Solicitud sin sesión
- **WHEN** una solicitud a cualquier endpoint de partidos no incluye una cookie de sesión válida
- **THEN** el sistema responde `401`
