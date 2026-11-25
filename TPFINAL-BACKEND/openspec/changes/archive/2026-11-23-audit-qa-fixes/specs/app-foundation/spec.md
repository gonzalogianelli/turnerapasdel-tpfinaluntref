# Spec Delta

## MODIFIED Requirements

### Requirement: Middlewares de seguridad y observabilidad
La aplicación SHALL aplicar `helmet`, CORS con credenciales habilitadas y origen configurable, rate limiting configurable, `cookie-parser` y parseo de JSON/URL-encoded. La aplicación SHALL registrar cada request y response mediante logging estructurado con Pino, redactando las cabeceras `cookie`, `set-cookie` y `authorization` para que nunca se registre un JWT crudo.

#### Scenario: Request registrado
- **WHEN** llega una solicitud HTTP a cualquier ruta
- **THEN** se emite un log estructurado con método, ruta y código de estado de la respuesta

#### Scenario: CORS con credenciales
- **WHEN** un cliente del origen permitido realiza una solicitud con credenciales
- **THEN** la respuesta incluye las cabeceras CORS correspondientes y permite el envío de cookies

#### Scenario: Límite de peticiones excedido
- **WHEN** un cliente supera el máximo de peticiones configurado en la ventana de tiempo
- **THEN** el servidor responde con estado 429 y un cuerpo de error JSON consistente

#### Scenario: Cabeceras de sesión redactadas
- **WHEN** una solicitud autenticada incluye una cookie de sesión o una respuesta emite `set-cookie`
- **THEN** el log HTTP muestra `[REDACTED]` en `cookie`, `set-cookie` y `authorization`, sin exponer `padel_token=...`

### Requirement: Manejo centralizado de errores
El sistema SHALL exponer una clase de error de aplicación con código de estado y mensaje, un wrapper para controladores asíncronos y un middleware global de errores que devuelva JSON consistente y registre el error con Pino. Los errores de Sequelize SHALL mapearse a `409` para restricciones únicas y a `400` para validaciones y claves foráneas. Los errores inesperados NO SHALL exponer detalles internos al cliente.

#### Scenario: Error de negocio controlado
- **WHEN** un controlador lanza un error de aplicación con estado 400, 401, 403, 404 o 409
- **THEN** el cliente recibe ese código de estado y un mensaje JSON legible

#### Scenario: Error inesperado
- **WHEN** ocurre una excepción no controlada durante el procesamiento de una solicitud
- **THEN** el cliente recibe una respuesta JSON con estado 500 sin stack trace ni detalles internos, y el error se registra en el log

#### Scenario: Ruta inexistente
- **WHEN** un cliente solicita una ruta no registrada
- **THEN** el servidor responde con estado 404 y un cuerpo de error JSON consistente

#### Scenario: Rechazo de promesa asíncrona
- **WHEN** un controlador asíncrono rechaza su promesa
- **THEN** el error se propaga al middleware global de errores sin dejar la petición sin respuesta

#### Scenario: Restricción única de Sequelize
- **WHEN** Sequelize lanza `SequelizeUniqueConstraintError`
- **THEN** el cliente recibe `409` con `{ status: 'error', message }` y un mensaje legible

#### Scenario: Validación o clave foránea de Sequelize
- **WHEN** Sequelize lanza `SequelizeValidationError` o `SequelizeForeignKeyConstraintError`
- **THEN** el cliente recibe `400` con `{ status: 'error', message }` y un mensaje legible
