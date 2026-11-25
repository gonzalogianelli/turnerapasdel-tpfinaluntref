# Spec Delta

## Purpose

Gestiona las solicitudes de reserva sobre turnos disponibles, registrando cupos y estados de solicitud, con confirmación, rechazo o cancelación por parte del administrador y sin inscripciones individuales de jugadores.

## ADDED Requirements

### Requirement: Solicitud de reserva sobre turno disponible
El sistema SHALL permitir que un jugador autenticado solicite una reserva mediante `POST /api/reservas` indicando `turnoId` y `cuposOcupados` entre 1 y 4, pasando el turno de `disponible` a `reservado` y conservando el registro histórico en DB.

#### Scenario: Solicitud válida
- **WHEN** un jugador solicita un turno `disponible` con `cuposOcupados` válido
- **THEN** el sistema responde `201`, crea la reserva en estado pendiente y el turno pasa a `reservado`

#### Scenario: Turno ya reservado
- **WHEN** un jugador intenta solicitar un turno que ya está `reservado`
- **THEN** el sistema responde `409` y no crea otra reserva sobre ese turno

#### Scenario: Turno inexistente
- **WHEN** el `turnoId` enviado no corresponde a un turno existente
- **THEN** el sistema responde `404`

#### Scenario: Cupos fuera de rango
- **WHEN** `cuposOcupados` no está entre 1 y 4
- **THEN** el sistema responde `400` y no crea la reserva

#### Scenario: Solicitud sin sesión
- **WHEN** una solicitud de reserva no incluye una cookie de sesión válida
- **THEN** el sistema responde `401`

### Requirement: Control de doble reserva por turno
El sistema SHALL garantizar que un turno `disponible` admita una sola solicitud que lo pase a `reservado`, rechazando cualquier solicitud posterior con `409` y manteniendo el historial de la solicitud aceptada.

#### Scenario: Dos solicitudes simultáneas
- **WHEN** dos jugadores solicitan el mismo turno `disponible` al mismo tiempo
- **THEN** una solicitud responde `201` y la otra responde `409`

#### Scenario: Historial conservado
- **WHEN** un turno ya tiene una solicitud aceptada
- **THEN** el sistema conserva esa reserva en DB aunque el turno ya no figure como disponible

#### Scenario: Intento del administrador de duplicar
- **WHEN** se intenta crear una segunda reserva sobre el mismo turno reservado
- **THEN** el sistema responde `409` y no modifica la reserva existente

### Requirement: Cupos de la reserva
El sistema SHALL registrar `cupoMaximo = 4` y `cuposOcupados`, informando lugares ocupados y faltantes, y SHALL considerar una reserva completa cuando `cuposOcupados` sea igual a 4.

#### Scenario: Reserva incompleta
- **WHEN** una reserva tiene `cuposOcupados` menor que 4
- **THEN** la respuesta informa los lugares ocupados y los faltantes hasta completar 4

#### Scenario: Reserva completa
- **WHEN** una reserva tiene `cuposOcupados` igual a 4
- **THEN** la respuesta la marca como completa e informa cero lugares faltantes

#### Scenario: Actualización de cupos por el administrador
- **WHEN** un administrador actualiza `cuposOcupados` de una reserva con un valor entre 1 y 4
- **THEN** el sistema persiste el nuevo valor y recalcula lugares faltantes y si la reserva está completa

### Requirement: Consulta de reservas
El sistema SHALL exponer `GET /api/reservas` y `GET /api/reservas/:id`; un jugador SHALL ver solo sus propias reservas y un administrador SHALL ver todas, con filtros de `req.query` `estado`, `turnoId`, `fecha` y paginación con `page` y `limit`.

#### Scenario: Jugador consulta sus reservas
- **WHEN** un jugador solicita `GET /api/reservas` con su sesión válida
- **THEN** el sistema responde `200` únicamente con las reservas creadas por ese jugador

#### Scenario: Administrador consulta todas
- **WHEN** un administrador solicita `GET /api/reservas` con su sesión válida
- **THEN** el sistema responde `200` con las reservas de todos los jugadores

#### Scenario: Filtros aplicados
- **WHEN** la consulta incluye `estado`, `turnoId`, `fecha`, `page` o `limit` válidos
- **THEN** el sistema devuelve solo las reservas que cumplen esos filtros

#### Scenario: Reserva ajena o inexistente para un jugador
- **WHEN** un jugador solicita por identificador una reserva que no le pertenece o no existe
- **THEN** el sistema responde `404` y no revela los datos de la otra reserva

### Requirement: Confirmación y rechazo por el administrador
El sistema SHALL permitir que un administrador confirme o rechace una reserva pendiente mediante `PATCH /api/reservas/:id/confirmar` y `PATCH /api/reservas/:id/rechazar`, devolviendo el turno a `disponible` cuando la reserva es rechazada.

#### Scenario: Confirmación de reserva
- **WHEN** un administrador confirma una reserva pendiente
- **THEN** la reserva pasa a estado confirmada y el turno permanece `reservado`

#### Scenario: Rechazo de reserva
- **WHEN** un administrador rechaza una reserva pendiente
- **THEN** la reserva pasa a estado rechazada y el turno vuelve a `disponible`

#### Scenario: Jugador intenta confirmar o rechazar
- **WHEN** un jugador solicita confirmar o rechazar una reserva
- **THEN** el sistema responde `403` y no modifica la reserva ni el turno

#### Scenario: Reserva inexistente o ya resuelta
- **WHEN** el identificador no existe o la reserva ya estaba confirmada o rechazada
- **THEN** el sistema responde `404` o `409` según corresponda

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

### Requirement: Control de acceso por rol en reservas
El sistema SHALL limitar la creación de solicitudes a usuarios autenticados con rol `jugador` y las operaciones de confirmación, rechazo, cancelación y actualización de cupos al rol `administrador`, respondiendo `401` sin sesión y `403` para roles no permitidos.

#### Scenario: Jugador crea una solicitud
- **WHEN** un jugador con sesión válida solicita una reserva sobre un turno disponible
- **THEN** el sistema procesa la solicitud según las reglas de reserva

#### Scenario: Administrador decide sobre una solicitud
- **WHEN** un administrador con sesión válida confirma, rechaza o cancela una reserva
- **THEN** el sistema procesa la decisión según las reglas de reserva

#### Scenario: Rol no permitido
- **WHEN** un usuario autenticado intenta una operación reservada al otro rol
- **THEN** el sistema responde `403` y no aplica la operación

#### Scenario: Solicitud sin sesión
- **WHEN** una solicitud de consulta o creación de reservas no incluye una cookie de sesión válida
- **THEN** el sistema responde `401`
