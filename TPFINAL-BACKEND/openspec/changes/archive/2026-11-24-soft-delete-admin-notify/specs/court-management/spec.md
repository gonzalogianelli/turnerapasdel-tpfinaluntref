# Spec Delta: court-management

## ADDED Requirements

### Requirement: Baja lógica de canchas por el administrador
El sistema SHALL exponer `DELETE /api/canchas/:id` para que un administrador dé de baja una cancha, respondiendo `200` con los datos públicos de la cancha y conservando su fila histórica en MySQL.

#### Scenario: Baja de cancha sin turnos activos
- **WHEN** un administrador solicita `DELETE /api/canchas/:id` sobre una cancha vigente sin turnos `disponible`, `reservado` ni `bloqueado`
- **THEN** el sistema responde `200` y marca la cancha con `deletedAt` no nulo

#### Scenario: Cancha bajada omitida en consultas
- **WHEN** un usuario consulta `GET /api/canchas` o `GET /api/canchas/:id` después de la baja
- **THEN** la cancha no aparece en el listado y su detalle responde `404`

#### Scenario: Cancha inexistente o ya bajada
- **WHEN** el identificador de ruta no existe o ya tenía `deletedAt` no nulo
- **THEN** el sistema responde `404`

#### Scenario: Identificador inválido
- **WHEN** el identificador de ruta no es un entero positivo
- **THEN** el sistema responde `400`

### Requirement: Restricción de baja de canchas con turnos activos
El sistema SHALL rechazar con `409` la baja de una cancha que tenga turnos vigentes en estado `disponible`, `reservado` o `bloqueado`, y SHALL permitir la baja cuando solo tenga turnos `jugado`, `cancelado` o dados de baja.

#### Scenario: Cancha con turno disponible
- **WHEN** un administrador intenta bajar una cancha con un turno `disponible` vigente
- **THEN** el sistema responde `409`, no aplica la baja y conserva el turno

#### Scenario: Cancha con turno reservado o bloqueado
- **WHEN** un administrador intenta bajar una cancha con un turno `reservado` o `bloqueado` vigente
- **THEN** el sistema responde `409` y no modifica la cancha ni el turno

#### Scenario: Cancha con solo historial terminal
- **WHEN** un administrador baja una cancha cuyos únicos turnos están `jugado`, `cancelado` o dados de baja
- **THEN** el sistema aplica la baja lógica sin alterar el historial de turnos

### Requirement: Control de acceso para baja de canchas
El sistema SHALL exigir una cookie de sesión válida y el rol `administrador` para `DELETE /api/canchas/:id`, respondiendo `401` sin sesión y `403` para un jugador autenticado.

#### Scenario: Jugador intenta bajar una cancha
- **WHEN** un usuario con rol `jugador` solicita `DELETE /api/canchas/:id`
- **THEN** el sistema responde `403` y no modifica la cancha

#### Scenario: Solicitud sin sesión
- **WHEN** una solicitud de baja de cancha no incluye una cookie de sesión válida
- **THEN** el sistema responde `401`

#### Scenario: Administrador autorizado
- **WHEN** un administrador solicita la baja de una cancha permitida
- **THEN** el sistema procesa la operación según las reglas de baja lógica
