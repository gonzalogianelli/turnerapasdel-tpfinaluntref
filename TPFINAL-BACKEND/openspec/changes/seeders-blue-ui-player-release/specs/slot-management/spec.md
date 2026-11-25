# Spec Delta

## MODIFIED Requirements

### Requirement: Bloqueo, jugado y republicación manual
El sistema SHALL permitir que un administrador marque un turno como `bloqueado`, `cancelado` o `jugado`, y SHALL permitir volver a `disponible` solo mediante una republicación explícita del administrador, con la excepción de la liberación de una reserva `pendiente` por su propio jugador.

#### Scenario: Administrador bloquea un turno
- **WHEN** un administrador actualiza un turno a estado `bloqueado`
- **THEN** el turno deja de mostrarse en el listado de turnos disponibles

#### Scenario: Cancelación no republica automáticamente
- **WHEN** un turno pasa a estado `cancelado` por una cancelación confirmada
- **THEN** el sistema no lo devuelve a `disponible` sin una acción posterior del administrador

#### Scenario: Liberación de solicitud pendiente
- **WHEN** un jugador libera su reserva `pendiente` sobre un turno `reservado`
- **THEN** el turno pasa a `disponible` y vuelve al listado de turnos disponibles sin intervención del administrador

#### Scenario: Administrador republica un turno
- **WHEN** un administrador ejecuta explícitamente la republicación de un turno cancelado
- **THEN** el turno pasa a estado `disponible` y vuelve al listado de disponibles

#### Scenario: Jugador intenta cambiar el estado
- **WHEN** un jugador intenta bloquear, cancelar, marcar como jugado o republicar un turno directamente
- **THEN** el sistema responde `403` y no modifica el turno

### Requirement: Transiciones de turno validadas contra reservas activas
El sistema SHALL permitir únicamente las transiciones de estado definidas (`disponible`, `reservado`, `cancelado`, `jugado`, `bloqueado`) y SHALL rechazar con `409` cualquier cambio a `disponible`, `bloqueado` o `cancelado` cuando el turno tenga una reserva activa. La comprobación SHALL realizarse dentro de la misma transacción que modifica el turno, con bloqueo pesimista sobre las reservas. La liberación de una reserva pendiente por su jugador SHALL dejar primero la reserva inactiva antes de devolver el turno a `disponible`.

#### Scenario: Bloqueo de turno con reserva activa
- **WHEN** un administrador intenta bloquear un turno que tiene una reserva activa
- **THEN** la operación se rechaza con `409` y el turno conserva su estado

#### Scenario: Cancelación de turno con reserva activa
- **WHEN** un administrador intenta cancelar un turno que tiene una reserva activa
- **THEN** la operación se rechaza con `409` y la reserva permanece vinculada

#### Scenario: Republicación manual sin reserva activa
- **WHEN** un administrador republica manualmente un turno cancelado sin reservas activas
- **THEN** el turno pasa a `disponible` y vuelve a aparecer en el listado de turnos libres

#### Scenario: Liberación pendiente sin reserva activa remanente
- **WHEN** un jugador libera una reserva `pendiente` y esa reserva deja de estar activa dentro de la misma transacción
- **THEN** el turno pasa a `disponible` sin que la validación de reservas activas devuelva `409`

#### Scenario: Transición concurrente sobre el último lugar
- **WHEN** dos operaciones intentan cambiar simultáneamente el estado de un mismo turno con una reserva activa
- **THEN** solo se aplica la primera transacción confirmada y la otra recibe `409`
