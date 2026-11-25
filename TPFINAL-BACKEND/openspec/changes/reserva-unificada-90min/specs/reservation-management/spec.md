# Specs del cambio — Reservas

## ADDED Requirements

### Requirement: Aviso interno por reserva
El sistema SHALL registrar la reserva confirmada o solicitada como aviso consultable por el administrador, incluyendo cancha, fecha/horario y quién la reservó.

#### Scenario: Reserva con solicitante identificado
- **WHEN** un jugador con nombre y email registra una reserva
- **THEN** el aviso del administrador incluye nombre y email del jugador

#### Scenario: Reserva sin datos opcionales del solicitante
- **WHEN** el solicitante no tiene nombre o email cargado
- **THEN** el aviso igual indica la reserva y la identidad disponible sin fallar

## MODIFIED Requirements

### Requirement: Unicidad de la reserva
La reserva SHALL seguir el flujo actual de solicitud pendiente, confirmación, rechazo y cancelación; el nuevo aviso no modifica los estados ni las transiciones.
