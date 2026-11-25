# slot-management Specification

## Purpose

Administra los turnos manuales de 90 minutos de cada cancha, sus estados, bloqueos y republicaciones, evitando que dos reservas activas ocupen la misma cancha en una misma franja horaria.

## Requirements

### Requirement: Carga manual de turnos de 90 minutos
El sistema SHALL permitir que un administrador cree turnos mediante `POST /api/turnos` indicando `canchaId` y `fechaHoraInicio`, con duración fija de 90 minutos y sin generación automática desde una grilla.

#### Scenario: Administrador crea un turno
- **WHEN** un administrador envía un `canchaId` existente y una `fechaHoraInicio` válida
- **THEN** el sistema responde `201`, calcula el fin 90 minutos después y crea el turno en estado `disponible`

#### Scenario: Jugador intenta crear un turno
- **WHEN** un usuario con rol `jugador` solicita `POST /api/turnos`
- **THEN** el sistema responde `403` y no crea el turno

#### Scenario: Cancha inexistente o fecha inválida
- **WHEN** la cancha no existe o `fechaHoraInicio` no es una fecha válida
- **THEN** el sistema responde `404` o `400` según corresponda y no crea el turno

#### Scenario: Solicitud sin sesión
- **WHEN** una solicitud de creación de turnos no incluye una cookie de sesión válida
- **THEN** el sistema responde `401`

### Requirement: Validación de superposición de turnos
El sistema SHALL rechazar con `409` la creación o edición de un turno cuya ventana de 90 minutos se superponga con otro turno activo de la misma cancha. Se consideran activos los estados `disponible`, `reservado` y `bloqueado`.

#### Scenario: Superposición parcial en la misma cancha
- **WHEN** un nuevo turno de una cancha comienza antes de que finalice otro turno activo de esa misma cancha
- **THEN** el sistema responde `409` y no persiste el nuevo turno

#### Scenario: Turno cancelado no bloquea
- **WHEN** el turno existente de la cancha está en estado `cancelado`
- **THEN** el sistema permite crear el nuevo turno en esa franja

#### Scenario: Misma hora en otra cancha
- **WHEN** otro turno activo ocupa la misma franja pero en una cancha distinta
- **THEN** el sistema permite crear el nuevo turno

#### Scenario: Edición que genera superposición
- **WHEN** un administrador edita `fechaHoraInicio` de un turno y genera una superposición con otro turno activo de la misma cancha
- **THEN** el sistema responde `409` y conserva el turno original sin cambios

### Requirement: Estados y consulta de turnos
El sistema SHALL mantener los estados `disponible`, `reservado`, `cancelado`, `jugado` y `bloqueado`, y SHALL exponer `GET /api/turnos` y `GET /api/turnos/:id` con filtros de `req.query` `fecha`, `canchaId`, `estado` y paginación con `page` y `limit`.

#### Scenario: Administrador consulta todos los turnos
- **WHEN** un administrador solicita `GET /api/turnos` con su sesión válida
- **THEN** el sistema responde `200` con turnos de todos los estados

#### Scenario: Jugador consulta solo turnos disponibles
- **WHEN** un jugador solicita `GET /api/turnos` con o sin `estado=reservado` en la consulta
- **THEN** el sistema responde `200` únicamente con turnos en estado `disponible`

#### Scenario: Filtros por fecha y cancha
- **WHEN** un usuario autenticado incluye `fecha`, `canchaId`, `page` o `limit` válidos en la consulta
- **THEN** el sistema devuelve solo los turnos que cumplen esos filtros

#### Scenario: Filtro inválido o turno inexistente
- **WHEN** los filtros no son válidos o el identificador de ruta no corresponde a un turno
- **THEN** el sistema responde `400` o `404` según corresponda

### Requirement: Bloqueo, jugado y republicación manual
El sistema SHALL permitir que un administrador marque un turno como `bloqueado`, `cancelado` o `jugado`, y SHALL permitir volver a `disponible` solo mediante una republicación explícita del administrador.

#### Scenario: Administrador bloquea un turno
- **WHEN** un administrador actualiza un turno a estado `bloqueado`
- **THEN** el turno deja de mostrarse en el listado de turnos disponibles

#### Scenario: Cancelación no republica automáticamente
- **WHEN** un turno pasa a estado `cancelado` por una cancelación confirmada
- **THEN** el sistema no lo devuelve a `disponible` sin una acción posterior del administrador

#### Scenario: Administrador republica un turno
- **WHEN** un administrador ejecuta explícitamente la republicación de un turno cancelado
- **THEN** el turno pasa a estado `disponible` y vuelve al listado de disponibles

#### Scenario: Jugador intenta cambiar el estado
- **WHEN** un jugador intenta bloquear, cancelar, marcar como jugado o republicar un turno
- **THEN** el sistema responde `403` y no modifica el turno

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

### Requirement: Baja lógica de turnos por el administrador
El sistema SHALL exponer `DELETE /api/turnos/:id` para que un administrador dé de baja un turno, respondiendo `200` con los datos públicos del turno y conservando su fila histórica en MySQL.

#### Scenario: Baja de turno sin reservas activas
- **WHEN** un administrador solicita `DELETE /api/turnos/:id` sobre un turno vigente sin reservas `pendiente` ni `confirmada`
- **THEN** el sistema responde `200` y marca el turno con `deletedAt` no nulo

#### Scenario: Turno bajado omitido en consultas
- **WHEN** un usuario consulta `GET /api/turnos` o `GET /api/turnos/:id` después de la baja
- **THEN** el turno no aparece en el listado y su detalle responde `404`

#### Scenario: Turno inexistente o ya bajado
- **WHEN** el identificador de ruta no existe o ya tenía `deletedAt` no nulo
- **THEN** el sistema responde `404`

#### Scenario: Identificador inválido
- **WHEN** el identificador de ruta no es un entero positivo
- **THEN** el sistema responde `400`

### Requirement: Restricción de baja de turnos con reservas activas
El sistema SHALL rechazar con `409` la baja de un turno que tenga reservas `pendiente` o `confirmada` vigentes, y SHALL permitir la baja cuando solo tenga reservas `rechazada`, `cancelada` o dadas de baja.

#### Scenario: Turno con reserva pendiente
- **WHEN** un administrador intenta bajar un turno con una reserva `pendiente` vigente
- **THEN** el sistema responde `409`, no aplica la baja y conserva la reserva

#### Scenario: Turno con reserva confirmada
- **WHEN** un administrador intenta bajar un turno con una reserva `confirmada` vigente
- **THEN** el sistema responde `409` y no modifica el turno ni la reserva

#### Scenario: Turno con solo historial terminal
- **WHEN** un administrador baja un turno cuyas únicas reservas son terminales o están dadas de baja
- **THEN** el sistema aplica la baja lógica sin alterar el historial de reservas

### Requirement: Baja de turno sin cambio de estado ni republicación
El sistema NO SHALL cambiar el `estado` del turno ni devolverlo a `disponible` como consecuencia de su baja lógica.

#### Scenario: Baja de turno cancelado
- **WHEN** un administrador baja un turno que estaba `cancelado`
- **THEN** el turno permanece `cancelado` en su fila histórica y no reaparece en el listado de disponibles

#### Scenario: Baja de turno jugado
- **WHEN** un administrador baja un turno que estaba `jugado`
- **THEN** el turno conserva su estado `jugado` y no se publica nuevamente

#### Scenario: Intento de crear reserva sobre turno bajado
- **WHEN** un jugador intenta solicitar una reserva sobre un turno dado de baja
- **THEN** el sistema responde `404` y no crea la reserva

### Requirement: Control de acceso para baja de turnos
El sistema SHALL exigir una cookie de sesión válida y el rol `administrador` para `DELETE /api/turnos/:id`, respondiendo `401` sin sesión y `403` para un jugador autenticado.

#### Scenario: Jugador intenta bajar un turno
- **WHEN** un usuario con rol `jugador` solicita `DELETE /api/turnos/:id`
- **THEN** el sistema responde `403` y no modifica el turno

#### Scenario: Solicitud sin sesión
- **WHEN** una solicitud de baja de turno no incluye una cookie de sesión válida
- **THEN** el sistema responde `401`

#### Scenario: Administrador autorizado
- **WHEN** un administrador solicita la baja de un turno permitido
- **THEN** el sistema procesa la operación según las reglas de baja lógica
