# Spec Delta: incomplete-matches

## MODIFIED Requirements

### Requirement: Baja de jugadores sin republicación
El sistema SHALL permitir que un jugador se dé de baja de su propia inscripción y que un administrador retire cualquier inscripción mediante `DELETE /api/partidos/:id/inscripciones/:usuarioId`, marcando la inscripción como dada de baja lógicamente, sin devolver el turno a `disponible`.

#### Scenario: Baja propia
- **WHEN** un jugador solicita la baja de su inscripción en un partido
- **THEN** el sistema responde `200`, marca la inscripción con `deletedAt` no nulo y el partido pasa a `incompleto` si estaba `completo`

#### Scenario: Baja dispuesta por el administrador
- **WHEN** un administrador quita la inscripción de otro jugador
- **THEN** el sistema responde `200`, marca la inscripción con `deletedAt` no nulo y actualiza los lugares ocupados del partido

#### Scenario: Jugador intenta quitar a otro
- **WHEN** un jugador intenta bajar la inscripción de un tercero
- **THEN** el sistema responde `403` y no modifica la inscripción

#### Scenario: Baja a último momento
- **WHEN** un jugador se da de baja cerca del inicio del turno
- **THEN** el turno permanece ocupado o `jugado` y no se publica nuevamente como disponible

#### Scenario: Inscripción inexistente
- **WHEN** el jugador indicado no tiene una inscripción vigente en el partido, ya sea porque nunca existió o porque ya fue dada de baja
- **THEN** el sistema responde `404`

#### Scenario: Reinscripción luego de una baja
- **WHEN** un jugador dado de baja intenta inscribirse nuevamente en el mismo partido
- **THEN** el sistema responde `409` y no crea una segunda inscripción

#### Scenario: Baja sobre partido terminal
- **WHEN** un jugador o administrador intenta bajar una inscripción de un partido `jugado` o `cancelado`
- **THEN** el sistema responde `409` y conserva la inscripción

### Requirement: Cancelación por falta de quórum
El sistema SHALL permitir que un administrador cancele un partido `incompleto` mediante `PATCH /api/partidos/:id/cancelar`, marcando todas las inscripciones como dadas de baja lógicamente y cancelando la reserva y el turno sin republicación automática.

#### Scenario: Cancelación de partido incompleto
- **WHEN** un administrador cancela un partido que no reunió los cuatro jugadores
- **THEN** el sistema responde `200`, marca todas las inscripciones con `deletedAt` no nulo, marca el partido `cancelado`, la reserva `cancelada` y el turno `cancelado`

#### Scenario: Turno cancelado no reaparece
- **WHEN** un jugador consulta los turnos disponibles después de la cancelación por quórum
- **THEN** el turno cancelado no aparece en el listado de disponibles

#### Scenario: Partido completo
- **WHEN** un administrador intenta cancelar por quórum un partido con cuatro inscriptos
- **THEN** el sistema responde `409` y no modifica el partido ni el turno

#### Scenario: Cancelación sin sesión o por un jugador
- **WHEN** la cancelación la solicita un jugador o una solicitud sin cookie válida
- **THEN** el sistema responde `403` o `401` según corresponda y no aplica la cancelación

#### Scenario: Historial de inscripciones conservado
- **WHEN** se cancela un partido por quórum
- **THEN** las inscripciones permanecen en MySQL con `deletedAt` no nulo y dejan de contarse como lugares ocupados

## ADDED Requirements

### Requirement: Baja lógica de partidos por el administrador
El sistema SHALL exponer `DELETE /api/partidos/:id` para que un administrador dé de baja un partido, respondiendo `200` con el partido serializado y conservando su fila histórica en MySQL.

#### Scenario: Baja de partido permitido
- **WHEN** un administrador solicita `DELETE /api/partidos/:id` sobre un partido terminal sin inscripciones vigentes
- **THEN** el sistema responde `200` y marca el partido con `deletedAt` no nulo

#### Scenario: Partido bajado omitido en consultas
- **WHEN** un usuario consulta `GET /api/partidos` o `GET /api/partidos/:id` después de la baja
- **THEN** el partido no aparece en el listado y su detalle responde `404`

#### Scenario: Partido inexistente o ya bajado
- **WHEN** el identificador de ruta no existe o ya tenía `deletedAt` no nulo
- **THEN** el sistema responde `404`

#### Scenario: Identificador inválido
- **WHEN** el identificador de ruta no es un entero positivo
- **THEN** el sistema responde `400`

### Requirement: Restricción de baja de partidos
El sistema SHALL rechazar con `409` la baja de un partido `incompleto` o `completo`, y también la baja de un partido terminal que tenga inscripciones vigentes.

#### Scenario: Baja de partido incompleto
- **WHEN** un administrador intenta bajar un partido `incompleto`
- **THEN** el sistema responde `409` y no modifica el partido ni sus inscripciones

#### Scenario: Baja de partido completo
- **WHEN** un administrador intenta bajar un partido `completo`
- **THEN** el sistema responde `409` y requiere cerrar o cancelar el partido primero

#### Scenario: Partido terminal con inscripciones vigentes
- **WHEN** un administrador intenta bajar un partido `jugado` o `cancelado` con inscripciones sin `deletedAt`
- **THEN** el sistema responde `409` y no aplica la baja

#### Scenario: Partido terminal sin inscripciones vigentes
- **WHEN** un administrador baja un partido `jugado` o `cancelado` cuyas inscripciones están dadas de baja
- **THEN** el sistema aplica la baja lógica sin alterar la reserva ni el turno

### Requirement: Control de acceso para bajas de partidos e inscripciones
El sistema SHALL exigir una cookie de sesión válida para bajar partidos o inscripciones, permitir `DELETE /api/partidos/:id` solo a administradores y permitir la baja de inscripción al jugador titular o a un administrador.

#### Scenario: Jugador intenta bajar un partido
- **WHEN** un usuario con rol `jugador` solicita `DELETE /api/partidos/:id`
- **THEN** el sistema responde `403` y no modifica el partido

#### Scenario: Jugador baja su propia inscripción
- **WHEN** un jugador autenticado solicita la baja de su propia inscripción vigente
- **THEN** el sistema aplica la baja lógica de la inscripción

#### Scenario: Administrador baja cualquier inscripción
- **WHEN** un administrador autenticado solicita la baja de una inscripción vigente de otro jugador
- **THEN** el sistema aplica la baja lógica de la inscripción

#### Scenario: Solicitud sin sesión
- **WHEN** una solicitud de baja de partido o inscripción no incluye una cookie de sesión válida
- **THEN** el sistema responde `401`
