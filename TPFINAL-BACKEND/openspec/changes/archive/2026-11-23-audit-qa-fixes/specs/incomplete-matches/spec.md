# Spec Delta

## ADDED Requirements

### Requirement: Alta de partidos serializada con reserva y turno
El sistema SHALL crear partidos incompletos dentro de una transacción que bloquee pesimistamente la reserva de origen y el turno asociado, impidiendo que otra operación cancele, rechace o modifique el turno mientras se calculan los lugares ocupados y faltantes.

#### Scenario: Alta simultánea y cancelación
- **WHEN** un administrador crea un partido mientras otra petición intenta cancelar el mismo turno
- **THEN** ambas operaciones se serializan, el partido se crea sobre el estado coherente de la reserva y la cancelación observa el resultado confirmado

#### Scenario: Alta sobre reserva confirmada
- **WHEN** se crea un partido para una reserva confirmada con un turno `reservado`
- **THEN** el partido queda con cupo máximo de cuatro jugadores y el turno permanece `reservado`

#### Scenario: Reserva inexistente al crear partido
- **WHEN** se solicita crear un partido con una reserva que no existe
- **THEN** la operación se rechaza con `404` y no se crea ningún partido

#### Scenario: Turno inválido al crear partido
- **WHEN** se solicita crear un partido sobre un turno que ya no está `reservado`
- **THEN** la operación se rechaza con `409` y no se modifica el partido ni el turno
