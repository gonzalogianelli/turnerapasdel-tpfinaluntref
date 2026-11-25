# reservation-management Specification

## Purpose

Gestiona las solicitudes de reserva sobre turnos disponibles, registrando cupos y estados de solicitud, con confirmación, rechazo o cancelación por parte del administrador y sin inscripciones individuales de jugadores.

## Requirements

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

#### Scenario: Cancelación por falta de quórum de un partido asociado
- **WHEN** un administrador cancela por quórum el partido asociado a una reserva confirmada
- **THEN** la reserva pasa a `cancelada`, el turno a `cancelado` y ninguno vuelve a `disponible` sin una republicación manual explícita

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

### Requirement: Baja lógica de reservas por el administrador
El sistema SHALL exponer `DELETE /api/reservas/:id` para que un administrador dé de baja una reserva, respondiendo `200` con la reserva serializada y conservando su fila histórica en MySQL.

#### Scenario: Baja de reserva terminal
- **WHEN** un administrador solicita `DELETE /api/reservas/:id` sobre una reserva `rechazada` o `cancelada` vigente sin partido activo
- **THEN** el sistema responde `200` y marca la reserva con `deletedAt` no nulo

#### Scenario: Reserva bajada omitida en consultas
- **WHEN** un jugador o administrador consulta `GET /api/reservas` o `GET /api/reservas/:id` después de la baja
- **THEN** la reserva no aparece en el listado y su detalle responde `404`

#### Scenario: Reserva inexistente o ya bajada
- **WHEN** el identificador de ruta no existe o ya tenía `deletedAt` no nulo
- **THEN** el sistema responde `404`

#### Scenario: Identificador inválido
- **WHEN** el identificador de ruta no es un entero positivo
- **THEN** el sistema responde `400`

### Requirement: Baja de reservas solo en estados terminales
El sistema SHALL rechazar con `409` la baja de reservas `pendiente` o `confirmada`, y también la baja de una reserva terminal que tenga un partido vigente en estado `incompleto` o `completo`.

#### Scenario: Baja de reserva pendiente
- **WHEN** un administrador intenta bajar una reserva `pendiente`
- **THEN** el sistema responde `409`, no aplica la baja y conserva la reserva y su turno

#### Scenario: Baja de reserva confirmada
- **WHEN** un administrador intenta bajar una reserva `confirmada`
- **THEN** el sistema responde `409` y requiere cancelarla primero mediante el endpoint de cancelación existente

#### Scenario: Reserva terminal con partido activo
- **WHEN** un administrador intenta bajar una reserva `cancelada` cuyo partido asociado sigue `incompleto` o `completo`
- **THEN** el sistema responde `409` y no modifica la reserva ni el partido

#### Scenario: Reserva terminal con partido cerrado o bajado
- **WHEN** un administrador baja una reserva terminal cuyo partido está `jugado`, `cancelado` o dado de baja
- **THEN** el sistema aplica la baja lógica sin alterar el partido histórico

### Requirement: Baja de reserva sin cambios de turno
El sistema NO SHALL modificar el `estado` del turno asociado ni devolverlo a `disponible` como consecuencia de la baja lógica de una reserva.

#### Scenario: Reserva cancelada con turno cancelado
- **WHEN** un administrador baja una reserva `cancelada` cuyo turno está `cancelado`
- **THEN** el turno permanece `cancelado` y no reaparece en el listado de disponibles

#### Scenario: Reserva rechazada con turno disponible
- **WHEN** un administrador baja una reserva `rechazada` cuyo turno volvió a `disponible`
- **THEN** el turno permanece `disponible` y sigue pudiendo reservarse por separado

#### Scenario: Intento de republicar como efecto de la baja
- **WHEN** se ejecuta `DELETE /api/reservas/:id` sobre una reserva permitida
- **THEN** la respuesta no incluye cambios de estado de turno y no se ejecuta ninguna republicación automática

### Requirement: Control de acceso para baja de reservas
El sistema SHALL exigir una cookie de sesión válida y el rol `administrador` para `DELETE /api/reservas/:id`, respondiendo `401` sin sesión y `403` para un jugador autenticado.

#### Scenario: Jugador intenta bajar una reserva propia
- **WHEN** un jugador solicita `DELETE /api/reservas/:id` incluso sobre una reserva de su propiedad
- **THEN** el sistema responde `403` y no modifica la reserva

#### Scenario: Solicitud sin sesión
- **WHEN** una solicitud de baja de reserva no incluye una cookie de sesión válida
- **THEN** el sistema responde `401`

#### Scenario: Administrador autorizado
- **WHEN** un administrador solicita la baja de una reserva permitida
- **THEN** el sistema procesa la operación según las reglas de baja lógica
