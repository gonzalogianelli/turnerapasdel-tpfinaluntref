# Spec Delta: user-management

## ADDED Requirements

### Requirement: Baja lógica de usuarios por el administrador
El sistema SHALL exponer `DELETE /api/users/:id` para que un administrador dé de baja a un usuario, respondiendo `200` con los datos públicos del usuario y marcando su baja lógica sin borrar la fila.

#### Scenario: Baja de un jugador
- **WHEN** un administrador solicita `DELETE /api/users/:id` sobre un jugador vigente sin dependencias activas
- **THEN** el sistema responde `200`, conserva la fila con `deletedAt` no nulo y devuelve el usuario sin contraseña

#### Scenario: Usuario bajado omitido en listados
- **WHEN** un administrador consulta `GET /api/users` o `GET /api/users/:id` después de la baja
- **THEN** el usuario dado de baja no aparece en el listado y su detalle responde `404`

#### Scenario: Usuario inexistente o ya bajado
- **WHEN** el identificador de ruta no existe o ya tenía `deletedAt` no nulo
- **THEN** el sistema responde `404`

#### Scenario: Identificador inválido
- **WHEN** el identificador de ruta no es un entero positivo
- **THEN** el sistema responde `400`

### Requirement: Restricciones para baja de usuarios
El sistema SHALL rechazar con `409` la baja de usuarios que deje al sistema sin administradores vigentes o que tenga reservas pendientes/confirmadas o inscripciones activas en partidos vigentes.

#### Scenario: Intento de bajar al último administrador
- **WHEN** un administrador intenta bajar al único usuario con rol `administrador` vigente
- **THEN** el sistema responde `409`, no aplica la baja y conserva al menos un administrador vigente

#### Scenario: Baja concurrente de los últimos administradores
- **WHEN** dos administradores intentan bajar simultáneamente a los últimos dos administradores vigentes
- **THEN** solo se confirma la operación que conserva un administrador vigente y la otra recibe `409`

#### Scenario: Usuario con reserva activa
- **WHEN** se intenta bajar un usuario con una reserva `pendiente` o `confirmada` vigente
- **THEN** el sistema responde `409` y no aplica la baja

#### Scenario: Usuario con inscripción activa
- **WHEN** se intenta bajar un usuario con una inscripción vigente en un partido `incompleto` o `completo`
- **THEN** el sistema responde `409` y no aplica la baja

#### Scenario: Usuario con historial terminal
- **WHEN** se intenta bajar un usuario cuyas reservas e inscripciones son terminales o están dadas de baja
- **THEN** el sistema aplica la baja lógica y conserva el historial referenciado

### Requirement: Control de acceso para baja de usuarios
El sistema SHALL exigir una cookie de sesión válida y el rol `administrador` para `DELETE /api/users/:id`, respondiendo `401` sin sesión y `403` para un jugador autenticado.

#### Scenario: Jugador intenta bajar un usuario
- **WHEN** un usuario con rol `jugador` solicita `DELETE /api/users/:id`
- **THEN** el sistema responde `403` y no modifica al usuario

#### Scenario: Solicitud sin sesión
- **WHEN** una solicitud de baja de usuario no incluye una cookie de sesión válida
- **THEN** el sistema responde `401`

#### Scenario: Empleado con rol administrador
- **WHEN** un empleado del complejo autenticado con rol `administrador` baja un usuario permitido
- **THEN** el sistema aplica la baja con las mismas reglas que para cualquier administrador
