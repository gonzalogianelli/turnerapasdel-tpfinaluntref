# Spec Delta: slot-management

## ADDED Requirements

### Requirement: Baja lógica de turnos por el administrador
El sistema SHALL exponer `DELETE /api/turnos/:id` para que un administrador dé de baja un turno, respondiendo `200` con los datos públicos del turno y conservando su fila histórica en MySQL.

#### Scenario: Baja de turno sin reservas activas
- **WHEN** un administrador solicita `DELETE /api/turnos/:id` sobre un turno vigente sin reservas `pendiente` ni `confirmada`
- **THEN** el sistema responde `200` y marca el turno con `deletedAt` no nulo

#### Scenario: Turno bajado omitido en consultas
- **WHEN** un usuario consulta `GET /api/turnos` o `GET /api/turnos/:id` después de la baja
- **THEN** el turno no aparece en el listado y su detalle responde `404`

#### Scenario: Turno inexistente o ya bajado
- **WHEN** el identificador de ruta no existe o ya tenía `deletedAt` no nulo
- **THEN** el sistema responde `404`

#### Scenario: Identificador inválido
- **WHEN** el identificador de ruta no es un entero positivo
- **THEN** el sistema responde `400`

### Requirement: Restricción de baja de turnos con reservas activas
El sistema SHALL rechazar con `409` la baja de un turno que tenga reservas `pendiente` o `confirmada` vigentes, y SHALL permitir la baja cuando solo tenga reservas `rechazada`, `cancelada` o dadas de baja.

#### Scenario: Turno con reserva pendiente
- **WHEN** un administrador intenta bajar un turno con una reserva `pendiente` vigente
- **THEN** el sistema responde `409`, no aplica la baja y conserva la reserva

#### Scenario: Turno con reserva confirmada
- **WHEN** un administrador intenta bajar un turno con una reserva `confirmada` vigente
- **THEN** el sistema responde `409` y no modifica el turno ni la reserva

#### Scenario: Turno con solo historial terminal
- **WHEN** un administrador baja un turno cuyas únicas reservas son terminales o están dadas de baja
- **THEN** el sistema aplica la baja lógica sin alterar el historial de reservas

### Requirement: Baja de turno sin cambio de estado ni republicación
El sistema NO SHALL cambiar el `estado` del turno ni devolverlo a `disponible` como consecuencia de su baja lógica.

#### Scenario: Baja de turno cancelado
- **WHEN** un administrador baja un turno que estaba `cancelado`
- **THEN** el turno permanece `cancelado` en su fila histórica y no reaparece en el listado de disponibles

#### Scenario: Baja de turno jugado
- **WHEN** un administrador baja un turno que estaba `jugado`
- **THEN** el turno conserva su estado `jugado` y no se publica nuevamente

#### Scenario: Intento de crear reserva sobre turno bajado
- **WHEN** un jugador intenta solicitar una reserva sobre un turno dado de baja
- **THEN** el sistema responde `404` y no crea la reserva

### Requirement: Control de acceso para baja de turnos
El sistema SHALL exigir una cookie de sesión válida y el rol `administrador` para `DELETE /api/turnos/:id`, respondiendo `401` sin sesión y `403` para un jugador autenticado.

#### Scenario: Jugador intenta bajar un turno
- **WHEN** un usuario con rol `jugador` solicita `DELETE /api/turnos/:id`
- **THEN** el sistema responde `403` y no modifica el turno

#### Scenario: Solicitud sin sesión
- **WHEN** una solicitud de baja de turno no incluye una cookie de sesión válida
- **THEN** el sistema responde `401`

#### Scenario: Administrador autorizado
- **WHEN** un administrador solicita la baja de un turno permitido
- **THEN** el sistema procesa la operación según las reglas de baja lógica
