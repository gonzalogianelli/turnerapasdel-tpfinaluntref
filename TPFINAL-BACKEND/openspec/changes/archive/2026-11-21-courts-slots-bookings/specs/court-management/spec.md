# Spec Delta

## Purpose

Gestiona el inventario de canchas del complejo, permitiendo al administrador darlas de alta, editarlas y bloquearlas, y a los usuarios autenticados consultarlas antes de solicitar un turno.

## ADDED Requirements

### Requirement: Alta y edición de canchas por el administrador
El sistema SHALL permitir que un administrador cree y actualice canchas mediante `POST /api/canchas` y `PATCH /api/canchas/:id`, validando `nombre` no vacío y los campos de disponibilidad cuando se envíen.

#### Scenario: Administrador crea una cancha
- **WHEN** un administrador envía un `nombre` válido a `POST /api/canchas`
- **THEN** el sistema responde `201` y persiste la cancha con identificador propio

#### Scenario: Administrador edita una cancha
- **WHEN** un administrador envía cambios válidos a `PATCH /api/canchas/:id` con un identificador existente
- **THEN** el sistema responde `200` y devuelve la cancha actualizada

#### Scenario: Jugador intenta crear una cancha
- **WHEN** un usuario con rol `jugador` solicita `POST /api/canchas`
- **THEN** el sistema responde `403` y no crea la cancha

#### Scenario: Solicitud sin sesión
- **WHEN** una solicitud de alta o edición de canchas no incluye una cookie de sesión válida
- **THEN** el sistema responde `401`

#### Scenario: Datos inválidos o cancha inexistente
- **WHEN** el `nombre` está vacío o el identificador de ruta no corresponde a una cancha
- **THEN** el sistema responde `400` o `404` según corresponda y no aplica cambios

### Requirement: Consulta de canchas
El sistema SHALL exponer `GET /api/canchas` y `GET /api/canchas/:id` para usuarios autenticados, aplicando filtros opcionales de `req.query` `nombre`, `bloqueada` y paginación con `page` y `limit`.

#### Scenario: Usuario autenticado lista canchas
- **WHEN** un jugador o administrador solicita `GET /api/canchas` con su sesión válida
- **THEN** el sistema responde `200` con el listado de canchas

#### Scenario: Filtros y paginación aplicados
- **WHEN** la consulta incluye `nombre`, `bloqueada`, `page` o `limit` válidos
- **THEN** el sistema devuelve solo las canchas que cumplen los filtros con la paginación solicitada

#### Scenario: Filtro inválido
- **WHEN** `bloqueada`, `page` o `limit` no tienen un valor válido
- **THEN** el sistema responde `400`

#### Scenario: Consulta por identificador inexistente
- **WHEN** un usuario autenticado solicita `GET /api/canchas/:id` con un identificador que no existe
- **THEN** el sistema responde `404`

### Requirement: Bloqueo de canchas
El sistema SHALL permitir marcar una cancha como `bloqueada` y NO SHALL incluir canchas bloqueadas en el listado de canchas habilitadas para reservar.

#### Scenario: Administrador bloquea una cancha
- **WHEN** un administrador actualiza una cancha con `bloqueada: true`
- **THEN** la cancha queda marcada como bloqueada y no puede usarse para nuevos turnos reservables

#### Scenario: Listado habilitado excluye bloqueadas
- **WHEN** un jugador consulta el listado de canchas habilitadas
- **THEN** las canchas bloqueadas no aparecen en la respuesta

#### Scenario: Administrador desbloquea una cancha
- **WHEN** un administrador actualiza una cancha con `bloqueada: false`
- **THEN** la cancha vuelve a aparecer como habilitada para nuevos turnos
