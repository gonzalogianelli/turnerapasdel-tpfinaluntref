# Spec Delta: reservation-management

## ADDED Requirements

### Requirement: Baja lógica de reservas por el administrador
El sistema SHALL exponer `DELETE /api/reservas/:id` para que un administrador dé de baja una reserva, respondiendo `200` con la reserva serializada y conservando su fila histórica en MySQL.

#### Scenario: Baja de reserva terminal
- **WHEN** un administrador solicita `DELETE /api/reservas/:id` sobre una reserva `rechazada` o `cancelada` vigente sin partido activo
- **THEN** el sistema responde `200` y marca la reserva con `deletedAt` no nulo

#### Scenario: Reserva bajada omitida en consultas
- **WHEN** un jugador o administrador consulta `GET /api/reservas` o `GET /api/reservas/:id` después de la baja
- **THEN** la reserva no aparece en el listado y su detalle responde `404`

#### Scenario: Reserva inexistente o ya bajada
- **WHEN** el identificador de ruta no existe o ya tenía `deletedAt` no nulo
- **THEN** el sistema responde `404`

#### Scenario: Identificador inválido
- **WHEN** el identificador de ruta no es un entero positivo
- **THEN** el sistema responde `400`

### Requirement: Baja de reservas solo en estados terminales
El sistema SHALL rechazar con `409` la baja de reservas `pendiente` o `confirmada`, y también la baja de una reserva terminal que tenga un partido vigente en estado `incompleto` o `completo`.

#### Scenario: Baja de reserva pendiente
- **WHEN** un administrador intenta bajar una reserva `pendiente`
- **THEN** el sistema responde `409`, no aplica la baja y conserva la reserva y su turno

#### Scenario: Baja de reserva confirmada
- **WHEN** un administrador intenta bajar una reserva `confirmada`
- **THEN** el sistema responde `409` y requiere cancelarla primero mediante el endpoint de cancelación existente

#### Scenario: Reserva terminal con partido activo
- **WHEN** un administrador intenta bajar una reserva `cancelada` cuyo partido asociado sigue `incompleto` o `completo`
- **THEN** el sistema responde `409` y no modifica la reserva ni el partido

#### Scenario: Reserva terminal con partido cerrado o bajado
- **WHEN** un administrador baja una reserva terminal cuyo partido está `jugado`, `cancelado` o dado de baja
- **THEN** el sistema aplica la baja lógica sin alterar el partido histórico

### Requirement: Baja de reserva sin cambios de turno
El sistema NO SHALL modificar el `estado` del turno asociado ni devolverlo a `disponible` como consecuencia de la baja lógica de una reserva.

#### Scenario: Reserva cancelada con turno cancelado
- **WHEN** un administrador baja una reserva `cancelada` cuyo turno está `cancelado`
- **THEN** el turno permanece `cancelado` y no reaparece en el listado de disponibles

#### Scenario: Reserva rechazada con turno disponible
- **WHEN** un administrador baja una reserva `rechazada` cuyo turno volvió a `disponible`
- **THEN** el turno permanece `disponible` y sigue pudiendo reservarse por separado

#### Scenario: Intento de republicar como efecto de la baja
- **WHEN** se ejecuta `DELETE /api/reservas/:id` sobre una reserva permitida
- **THEN** la respuesta no incluye cambios de estado de turno y no se ejecuta ninguna republicación automática

### Requirement: Control de acceso para baja de reservas
El sistema SHALL exigir una cookie de sesión válida y el rol `administrador` para `DELETE /api/reservas/:id`, respondiendo `401` sin sesión y `403` para un jugador autenticado.

#### Scenario: Jugador intenta bajar una reserva propia
- **WHEN** un jugador solicita `DELETE /api/reservas/:id` incluso sobre una reserva de su propiedad
- **THEN** el sistema responde `403` y no modifica la reserva

#### Scenario: Solicitud sin sesión
- **WHEN** una solicitud de baja de reserva no incluye una cookie de sesión válida
- **THEN** el sistema responde `401`

#### Scenario: Administrador autorizado
- **WHEN** un administrador solicita la baja de una reserva permitida
- **THEN** el sistema procesa la operación según las reglas de baja lógica
