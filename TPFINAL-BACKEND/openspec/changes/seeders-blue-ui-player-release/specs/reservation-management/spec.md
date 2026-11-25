# Spec Delta

## MODIFIED Requirements

### Requirement: Cancelación sin republicación automática
El sistema SHALL permitir que un administrador cancele una reserva confirmada mediante `PATCH /api/reservas/:id/cancelar`, dejando el turno en estado `cancelado` y NO SHALL volverlo a `disponible` sin una republicación explícita del administrador. Esta restricción NO SHALL aplicar a la liberación de una reserva `pendiente` realizada por su propio jugador.

#### Scenario: Cancelación de reserva confirmada
- **WHEN** un administrador cancela una reserva confirmada
- **THEN** la reserva pasa a estado cancelada y el turno pasa a `cancelado`

#### Scenario: Turno cancelado no aparece como disponible
- **WHEN** un jugador consulta el listado de turnos disponibles después de una cancelación confirmada
- **THEN** el turno cancelado no aparece en la respuesta

#### Scenario: Republicación manual requerida
- **WHEN** el administrador no ha republicado explícitamente el turno cancelado
- **THEN** el turno permanece fuera del listado de disponibles

#### Scenario: Jugador intenta cancelar
- **WHEN** un jugador solicita `PATCH /api/reservas/:id/cancelar` sobre una reserva confirmada
- **THEN** el sistema responde `409` y no modifica la reserva ni el turno

#### Scenario: Cancelación por falta de quórum de un partido asociado
- **WHEN** un administrador cancela por quórum el partido asociado a una reserva confirmada
- **THEN** la reserva pasa a `cancelada`, el turno a `cancelado` y ninguno vuelve a `disponible` sin una republicación manual explícita

### Requirement: Control de acceso por rol en reservas
El sistema SHALL limitar la creación de solicitudes a usuarios autenticados con rol `jugador`, la confirmación, el rechazo y la actualización de cupos al rol `administrador`, y la cancelación a administradores para reservas confirmadas y a jugadores para sus propias reservas pendientes, respondiendo `401` sin sesión y `403` para roles no permitidos.

#### Scenario: Jugador crea una solicitud
- **WHEN** un jugador con sesión válida solicita una reserva sobre un turno disponible
- **THEN** el sistema procesa la solicitud según las reglas de reserva

#### Scenario: Administrador decide sobre una solicitud
- **WHEN** un administrador con sesión válida confirma, rechaza o cancela una reserva
- **THEN** el sistema procesa la decisión según las reglas de reserva

#### Scenario: Jugador libera su solicitud pendiente
- **WHEN** un jugador con sesión válida cancela su propia reserva pendiente mediante el endpoint de cancelación
- **THEN** el sistema procesa la liberación según las reglas de reserva pendiente

#### Scenario: Rol no permitido
- **WHEN** un usuario autenticado intenta una operación reservada al otro rol
- **THEN** el sistema responde `403` y no aplica la operación

#### Scenario: Solicitud sin sesión
- **WHEN** una solicitud de consulta o creación de reservas no incluye una cookie de sesión válida
- **THEN** el sistema responde `401`

## ADDED Requirements

### Requirement: Liberación de solicitud pendiente por el jugador
El sistema SHALL permitir que un jugador cancele su propia reserva `pendiente` mediante `PATCH /api/reservas/:id/cancelar`, pasando la reserva a `cancelada` y el turno a `disponible` dentro de una misma transacción con bloqueo de la fila, sin crear ni modificar partidos.

#### Scenario: Liberación válida de reserva pendiente
- **WHEN** un jugador cancela su reserva `pendiente` y el turno sigue `reservado`
- **THEN** el sistema responde `200`, la reserva pasa a `cancelada`, el turno pasa a `disponible` y el turno vuelve al listado de disponibles

#### Scenario: Reserva ajena
- **WHEN** un jugador intenta liberar una reserva `pendiente` creada por otro usuario
- **THEN** el sistema responde `404` y no revela los datos de esa reserva

#### Scenario: Reserva confirmada intentada por jugador
- **WHEN** un jugador intenta liberar una reserva que ya fue confirmada
- **THEN** el sistema responde `409` con un mensaje que indica que solo el administrador puede cancelarla y no modifica la reserva ni el turno

#### Scenario: Turno ya no reservado
- **WHEN** un jugador intenta liberar una reserva pendiente cuyo turno ya fue cancelado, jugado, bloqueado o republicado
- **THEN** el sistema responde `409` y conserva la reserva y el turno sin cambios

#### Scenario: Doble liberación
- **WHEN** se intenta liberar dos veces la misma reserva pendiente
- **THEN** la primera petición responde `200` y la segunda responde `409`

#### Scenario: Liberaciones concurrentes
- **WHEN** dos peticiones de liberación llegan simultáneamente sobre la misma reserva pendiente
- **THEN** solo una confirma el cambio a `cancelada` y `disponible`, y la otra responde `409`
