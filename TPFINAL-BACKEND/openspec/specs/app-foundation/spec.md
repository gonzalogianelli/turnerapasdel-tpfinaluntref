# app-foundation Specification

## Purpose

Define la base operativa de la API HTTP: arranque del servidor con configuración centralizada, middlewares de seguridad y observabilidad, y manejo uniforme de errores para que todos los módulos posteriores se construyan sobre un comportamiento consistente.

## Requirements

### Requirement: Configuración centralizada desde variables de entorno
El sistema SHALL cargar su configuración desde variables de entorno definidas en `.env` y exponer valores resueltos de puerto, entorno, base de datos, CORS, cookies/JWT y SMTP. La ausencia o invalidez de variables SMTP NO SHALL impedir el arranque del servidor.

#### Scenario: Arranque con configuración válida
- **WHEN** el servidor inicia con las variables de entorno requeridas definidas
- **THEN** la configuración queda disponible para la app y la conexión a MySQL sin valores hardcodeados

#### Scenario: SMTP pendiente no bloquea el arranque
- **WHEN** las variables SMTP están vacías o incompletas
- **THEN** el servidor inicia correctamente y las notificaciones por correo quedan deshabilitadas sin lanzar un error fatal

#### Scenario: Variable requerida ausente
- **WHEN** falta una variable requerida para operar la app o la base de datos
- **THEN** el arranque falla con un mensaje de error claro que identifica la variable faltante

### Requirement: Aplicación Express con módulos ESM
La aplicación SHALL construirse con Node.js en modo ESM, usando `import`/`export` y extensión `.js` en los imports relativos locales. La app SHALL separar el punto de entrada del servidor de la definición de la aplicación para permitir pruebas.

#### Scenario: Importación de módulos locales
- **WHEN** un módulo importa otro archivo local
- **THEN** la importación usa `import` con la extensión `.js` y ejecuta sin errores de resolución

#### Scenario: App y servidor desacoplados
- **WHEN** se importa la aplicación Express sin iniciar el servidor HTTP
- **THEN** la app se construye y configura correctamente sin abrir un puerto

### Requirement: Middlewares de seguridad y observabilidad
La aplicación SHALL aplicar `helmet`, CORS con credenciales habilitadas y origen configurable, `cookie-parser` y parseo de JSON/URL-encoded. La aplicación NO SHALL aplicar límites de tasa ni rechazar peticiones por frecuencia. La aplicación SHALL registrar cada request y response mediante logging estructurado con Pino, redactando las cabeceras `cookie`, `set-cookie` y `authorization` para que nunca se registre un JWT crudo.

#### Scenario: Request registrado
- **WHEN** llega una solicitud HTTP a cualquier ruta
- **THEN** se emite un log estructurado con método, ruta y código de estado de la respuesta

#### Scenario: CORS con credenciales
- **WHEN** un cliente del origen permitido realiza una solicitud con credenciales
- **THEN** la respuesta incluye las cabeceras CORS correspondientes y permite el envío de cookies

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

### Requirement: Documentación interactiva de la API
El sistema SHALL exponer la documentación OpenAPI de la API en `/api-docs` (interfaz interactiva) y `/api-docs.json` (documento OpenAPI), incluyendo el esquema de seguridad `cookieAuth` para la cookie de sesión, y NO SHALL exigir autenticación para consultar la documentación. La documentación SHALL incluir todos los endpoints de baja lógica con sus parámetros de ruta y sus respuestas `400`, `401`, `403`, `404` y `409` cuando correspondan.

#### Scenario: Interfaz de documentación disponible
- **WHEN** un cliente solicita `GET /api-docs` sin sesión
- **THEN** el sistema responde con la interfaz interactiva de Swagger UI

#### Scenario: Documento OpenAPI disponible
- **WHEN** un cliente solicita `GET /api-docs.json`
- **THEN** el sistema responde `200` con un documento OpenAPI que describe los endpoints y el esquema de seguridad `cookieAuth`

#### Scenario: Endpoints documentados con parámetros y respuestas
- **WHEN** se consulta el documento OpenAPI
- **THEN** los endpoints de autenticación, usuarios, canchas, turnos y reservas incluyen sus parámetros de ruta y consulta y las respuestas de éxito y error correspondientes

#### Scenario: Endpoints de baja documentados
- **WHEN** se consulta el documento OpenAPI
- **THEN** los DELETE de usuarios, canchas, turnos, reservas, partidos e inscripciones incluyen `cookieAuth`, parámetros de ruta y respuestas `200`, `400`, `401`, `403`, `404` y `409` según corresponda

### Requirement: Ejemplos de correo en OpenAPI
Los ejemplos de campos de email en la documentación OpenAPI NO SHALL usar dominios de ejemplo reservados y SHALL indicar que se debe usar una dirección real válida.

#### Scenario: Ejemplos de email no entregables
- **WHEN** se consulta el documento OpenAPI
- **THEN** los esquemas de email no contienen `ana@example.com` ni dominios de ejemplo reservados e indican usar una dirección real válida
