# Spec Delta

## Purpose

Define la base operativa de la API HTTP: arranque del servidor con configuración centralizada, middlewares de seguridad y observabilidad, y manejo uniforme de errores para que todos los módulos posteriores se construyan sobre un comportamiento consistente.

## ADDED Requirements

### Requirement: Configuración centralizada desde variables de entorno
El sistema SHALL cargar su configuración desde variables de entorno definidas en `.env` y exponer valores resueltos de puerto, entorno, base de datos, CORS, rate limit, cookies/JWT y SMTP. La ausencia o invalidez de variables SMTP NO SHALL impedir el arranque del servidor.

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
La aplicación SHALL aplicar `helmet`, CORS con credenciales habilitadas y origen configurable, rate limiting configurable, `cookie-parser` y parseo de JSON/URL-encoded. La aplicación SHALL registrar cada request y response mediante logging estructurado con Pino.

#### Scenario: Request registrado
- **WHEN** llega una solicitud HTTP a cualquier ruta
- **THEN** se emite un log estructurado con método, ruta y código de estado de la respuesta

#### Scenario: CORS con credenciales
- **WHEN** un cliente del origen permitido realiza una solicitud con credenciales
- **THEN** la respuesta incluye las cabeceras CORS correspondientes y permite el envío de cookies

#### Scenario: Límite de peticiones excedido
- **WHEN** un cliente supera el máximo de peticiones configurado en la ventana de tiempo
- **THEN** el servidor responde con estado 429 y un cuerpo de error JSON consistente

### Requirement: Manejo centralizado de errores
El sistema SHALL exponer una clase de error de aplicación con código de estado y mensaje, un wrapper para controladores asíncronos y un middleware global de errores que devuelva JSON consistente y registre el error con Pino. Los errores inesperados NO SHALL exponer detalles internos al cliente.

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
