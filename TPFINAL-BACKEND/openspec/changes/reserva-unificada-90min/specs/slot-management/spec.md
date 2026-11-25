# Specs del cambio

## ADDED Requirements

### Requirement: Grilla horaria precargada
El sistema SHALL ofrecer diez bloques de 90 minutos por cancha activa: 08:00–09:30, 09:30–11:00, 11:00–12:30, 12:30–14:00, 14:00–15:30, 15:30–17:00, 17:00–18:30, 18:30–20:00, 20:00–21:30 y 21:30–23:00.

#### Scenario: Generación idempotente
- **WHEN** se solicita la grilla de una fecha
- **THEN** se crean solo los bloques inexistentes y no se duplican los ya creados

#### Scenario: Inicio fuera de grilla
- **WHEN** un administrador envía un `fechaHoraInicio` que no coincide con un inicio de bloque permitido
- **THEN** la API responde `400`

## MODIFIED Requirements

### Requirement: Listado de turnos libres
El listado público SHALL devolver únicamente turnos `disponible` de canchas habilitadas, sin exponer estados ocupados.

#### Scenario: Turno reservado o bloqueado
- **WHEN** un turno pasa a `reservado` o `bloqueado`
- **THEN** deja de aparecer en el listado público de libres

#### Scenario: Bloqueo múltiple
- **WHEN** un administrador bloquea uno o varios turnos de una fecha
- **THEN** esos turnos dejan de estar disponibles para los jugadores y pueden ser liberados posteriormente

### Requirement: Avisos de reserva
Cada reserva registrada SHALL generar un aviso consultable por el administrador con cancha, fecha/horario y solicitante (nombre/email) cuando esté disponible.

#### Scenario: Consulta de avisos
- **WHEN** un administrador consulta `GET /api/notificaciones`
- **THEN** recibe las reservas con los datos de la cancha, el turno y el usuario solicitante

#### Scenario: Acceso de jugador
- **WHEN** un jugador consulta `GET /api/notificaciones`
- **THEN** la API responde `403`
