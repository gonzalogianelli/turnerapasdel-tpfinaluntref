# Spec Delta

## Purpose

Expone un endpoint público mínimo que permite verificar si el servidor está operativo y si la conexión con MySQL está activa, usado por operaciones, pruebas y el frontend.

## ADDED Requirements

### Requirement: Endpoint de estado del servidor
El sistema SHALL exponer `GET /api/health` sin requerir autenticación, devolviendo un cuerpo JSON con el estado del servidor y el estado de la conexión a la base de datos.

#### Scenario: Servidor y base de datos operativos
- **WHEN** un cliente solicita `GET /api/health` y MySQL responde correctamente
- **THEN** el servidor responde con estado HTTP 200 y un JSON que indica servidor activo y base de datos disponible

#### Scenario: Servidor activo y base de datos no disponible
- **WHEN** un cliente solicita `GET /api/health` y MySQL no responde
- **THEN** el servidor responde con estado HTTP 503 y un JSON que indica servidor activo y base de datos no disponible

#### Scenario: Endpoint sin autenticación
- **WHEN** un cliente sin sesión ni cookie solicita `GET /api/health`
- **THEN** el endpoint responde sin exigir credenciales
