# Spec Delta

## MODIFIED Requirements

### Requirement: Avisos de decisión sobre reservas
El sistema SHALL enviar un aviso al confirmar, rechazar o cancelar una reserva, indicando el estado resultante y si el turno permanece reservado, vuelve a disponible o queda cancelado. Cuando un jugador libera una reserva pendiente, el aviso SHALL indicar que el turno volvió a disponible y NO SHALL afirmar que requiere republicación manual.

#### Scenario: Reserva confirmada
- **WHEN** un administrador confirma una reserva
- **THEN** el jugador y los administradores reciben el aviso con el turno reservado

#### Scenario: Reserva rechazada
- **WHEN** un administrador rechaza una reserva
- **THEN** los destinatarios reciben el aviso indicando que el turno volvió a disponible

#### Scenario: Reserva cancelada
- **WHEN** un administrador cancela una reserva
- **THEN** los destinatarios reciben el aviso indicando que el turno quedó cancelado y no se republicó automáticamente

#### Scenario: Solicitud pendiente liberada por el jugador
- **WHEN** un jugador libera su reserva pendiente
- **THEN** los destinatarios reciben el aviso indicando que la reserva fue cancelada por el jugador y que el turno volvió a disponible

#### Scenario: Fallo de envío
- **WHEN** el proveedor SMTP falla o no está configurado al notificar una decisión
- **THEN** la operación sobre la reserva se completa igualmente y el sistema registra el aviso de fallo sin exponer credenciales
