# Spec Delta

## ADDED Requirements

### Requirement: Transiciones de turno validadas contra reservas activas
El sistema SHALL permitir únicamente las transiciones de estado definidas (`disponible`, `reservado`, `cancelado`, `jugado`, `bloqueado`) y SHALL rechazar con `409` cualquier cambio a `disponible`, `bloqueado` o `cancelado` cuando el turno tenga una reserva activa. La comprobación SHALL realizarse dentro de la misma transacción que modifica el turno, con bloqueo pesimista sobre las reservas.

#### Scenario: Bloqueo de turno con reserva activa
- **WHEN** un administrador intenta bloquear un turno que tiene una reserva activa
- **THEN** la operación se rechaza con `409` y el turno conserva su estado

#### Scenario: Cancelación de turno con reserva activa
- **WHEN** un administrador intenta cancelar un turno que tiene una reserva activa
- **THEN** la operación se rechaza con `409` y la reserva permanece vinculada

#### Scenario: Republicación manual sin reserva activa
- **WHEN** un administrador republica manualmente un turno cancelado sin reservas activas
- **THEN** el turno pasa a `disponible` y vuelve a aparecer en el listado de turnos libres

#### Scenario: Transición concurrente sobre el último lugar
- **WHEN** dos operaciones intentan cambiar simultáneamente el estado de un mismo turno con una reserva activa
- **THEN** solo se aplica la primera transacción confirmada y la otra recibe `409`
