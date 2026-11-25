# Spec Delta

## MODIFIED Requirements

### Requirement: Middlewares de seguridad y observabilidad
La aplicación SHALL aplicar `helmet`, CORS con credenciales habilitadas y origen configurable, `cookie-parser` y parseo de JSON/URL-encoded. La aplicación NO SHALL aplicar un limitador global ni rechazar peticiones por frecuencia; el único límite admitido es el de intentos fallidos de login definido en `user-auth`. La aplicación SHALL registrar cada request y response mediante logging estructurado con Pino, redactando las cabeceras `cookie`, `set-cookie` y `authorization` para que nunca se registre un JWT crudo.

#### Scenario: Request registrado
- **WHEN** llega una solicitud HTTP a cualquier ruta
- **THEN** se emite un log estructurado con método, ruta y código de estado de la respuesta

#### Scenario: CORS con credenciales
- **WHEN** un cliente del origen permitido realiza una solicitud con credenciales
- **THEN** la respuesta incluye las cabeceras CORS correspondientes y permite el envío de cookies

#### Scenario: Cabeceras de sesión redactadas
- **WHEN** una solicitud autenticada incluye una cookie de sesión o una respuesta emite `set-cookie`
- **THEN** el log HTTP muestra `[REDACTED]` en `cookie`, `set-cookie` y `authorization`, sin exponer `padel_token=...`

#### Scenario: Sin limitador global
- **WHEN** un cliente realiza muchas peticiones a rutas distintas de `POST /api/auth/login`
- **THEN** ninguna respuesta es rechazada con `429` por frecuencia de peticiones
