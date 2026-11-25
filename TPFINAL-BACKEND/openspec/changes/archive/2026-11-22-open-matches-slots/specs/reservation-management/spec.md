# Spec Delta

## ADDED Requirements

### Requirement: Partido asociado con inscripciones individuales
El sistema SHALL permitir que una reserva confirmada tenga un único partido asociado que registre inscripciones individuales de jugadores, manteniendo `cupoMaximo` y `cuposOcupados` como dato agregado histórico de la solicitud.

#### Scenario: Partido creado sobre reserva confirmada
- **WHEN** un administrador crea un partido sobre una reserva confirmada
- **THEN** el partido queda asociado a esa reserva y a su turno sin modificar los campos `cupoMaximo` ni `cuposOcupados` de la reserva

#### Scenario: Inscripciones del partido no alteran el agregado de la reserva
- **WHEN** los jugadores se inscriben o se dan de baja del partido asociado
- **THEN** las respuestas de `GET /api/reservas` y `GET /api/reservas/:id` conservan el valor de `cuposOcupados` registrado al solicitar la reserva

#### Scenario: Reserva inactiva
- **WHEN** la reserva asociada a un partido deja de estar confirmada
- **THEN** el partido no admite nuevas inscripciones y responde `409`

## MODIFIED Requirements

### Requirement: Cancelación sin republicación automática
El sistema SHALL permitir que un administrador cancele una reserva confirmada mediante `PATCH /api/reservas/:id/cancelar`, dejando el turno en estado `cancelado` y NO SHALL volverlo a `disponible` sin una republicación explícita del administrador.

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
- **WHEN** un jugador solicita `PATCH /api/reservas/:id/cancelar`
- **THEN** el sistema responde `403` y no modifica la reserva ni el turno

#### Scenario: Cancelación por falta de quórum de un partido asociado
- **WHEN** un administrador cancela por quórum el partido asociado a una reserva confirmada
- **THEN** la reserva pasa a `cancelada`, el turno a `cancelado` y ninguno vuelve a `disponible` sin una republicación manual explícita
