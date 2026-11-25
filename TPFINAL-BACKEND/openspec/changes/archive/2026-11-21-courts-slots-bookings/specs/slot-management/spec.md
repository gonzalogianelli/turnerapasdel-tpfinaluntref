# Spec Delta

## Purpose

Administra los turnos manuales de 90 minutos de cada cancha, sus estados, bloqueos y republicaciones, evitando que dos reservas activas ocupen la misma cancha en una misma franja horaria.

## ADDED Requirements

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
