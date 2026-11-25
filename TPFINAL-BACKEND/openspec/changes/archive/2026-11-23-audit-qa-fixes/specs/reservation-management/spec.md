# Spec Delta

## ADDED Requirements

### Requirement: Rechazo de reserva solo desde turno reservado
El sistema SHALL confirmar dentro de la transacción de rechazo que el turno asociado sigue en estado `reservado`. Si el turno ya fue cancelado, jugado, bloqueado o republicado, el rechazo SHALL fallar con `409` sin modificar la reserva ni el turno.

#### Scenario: Rechazo válido
- **WHEN** un administrador rechaza una solicitud cuyo turno sigue `reservado`
- **THEN** la solicitud pasa a `rechazada`, el turno vuelve a `disponible` y se envía el aviso por correo

#### Scenario: Rechazo sobre turno ya cancelado
- **WHEN** un administrador intenta rechazar una solicitud cuyo turno ya está `cancelado`
- **THEN** la operación devuelve `409` y la reserva conserva su estado anterior

#### Scenario: Rechazo sobre turno republicado
- **WHEN** un administrador intenta rechazar una solicitud después de que el turno fue republicado manualmente
- **THEN** la operación devuelve `409` y no se altera el listado de turnos disponibles

#### Scenario: Rechazo concurrente
- **WHEN** dos rechazos llegan simultáneamente para la misma solicitud
- **THEN** solo el primero se confirma y el segundo recibe `409`
