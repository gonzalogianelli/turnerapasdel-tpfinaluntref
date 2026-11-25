# Proposal

## Why

El proyecto parte de un esqueleto vacío (`src/` sin archivos) y el Módulo 0 debe entregar una base ejecutable, segura y observable antes de implementar autenticación, canchas, turnos o reservas. Sin esta base, cualquier módulo posterior duplicaría configuración, conexión a MySQL y manejo de errores, y quedaría sin un punto único de verificación del estado del servidor.

## What Changes

- Configuración centralizada en `src/config/` que carga variables desde `.env` con `dotenv` y expone puerto, entorno, credenciales de MySQL, parámetros de seguridad (JWT/cookies, CORS, rate limit) y SMTP **sin exigir conexión SMTP al iniciar**.
- Módulo de conexión a MySQL con `mysql2` + `sequelize` en `src/config/database.js`, con función de conexión/verificación reutilizable.
- Aplicación Express en ESM puro (`import`/`export`, extensión `.js` en imports relativos locales) en `src/app.js`, con:
  - `helmet`.
  - `cors` con `credentials: true` y origen desde configuración.
  - `express-rate-limit` configurable.
  - `cookie-parser`.
  - Logger estructurado con `pino` y `pino-http`.
  - `express.json()` y `express.urlencoded()`.
- Utilidades de error compartidas: clase `AppError` con `statusCode`, wrapper `asyncHandler` y middleware global de errores que responde JSON consistente y registra con Pino.
- Middleware `404` para rutas no encontradas.
- Endpoint `GET /api/health` que reporta estado del servidor y verificación activa de la conexión Sequelize/MySQL.
- Punto de entrada `src/server.js` que arranca el servidor, verifica la base de datos y maneja cierre ordenado (SIGINT/SIGTERM).

**Fuera de alcance:** autenticación/JWT efectivo, modelos de negocio, rutas de canchas/turnos/reservas, Swagger de endpoints de negocio, envío real de correos y cualquier módulo posterior. Este cambio no implementa código; solo define la planificación.

## Capabilities

### New Capabilities

- `app-foundation`: bootstrap del servidor Express ESM, carga de configuración desde `.env`, middlewares de seguridad/observabilidad (`helmet`, `cors`, rate limit, cookie-parser, Pino), manejo centralizado de errores (`AppError`, `asyncHandler`, 404 y error handler global).
- `database-connection`: conexión MySQL mediante `mysql2`/Sequelize, verificación de conectividad y cierre de conexión reutilizables por los módulos siguientes.
- `health-check`: endpoint `GET /api/health` que expone el estado del servidor y de la conexión activa a la base de datos.

### Modified Capabilities

<!-- Ninguna: el proyecto aún no tiene specs principales. -->

## Impact

- **Código nuevo:** `src/config/` (`env.js`, `database.js`, `logger.js`), `src/app.js`, `src/server.js`, `src/utils/` (`AppError.js`, `asyncHandler.js`), `src/middlewares/` (`notFound.js`, `errorHandler.js`), `src/routes/` (`health.routes.js`) y controlador de health.
- **Dependencias ya instaladas:** `express`, `helmet`, `cors`, `express-rate-limit`, `cookie-parser`, `pino`, `pino-http`, `mysql2`, `sequelize`, `dotenv`.
- **Configuración:** `.env` / `.env.example` (variables ya declaradas; se valida su lectura, no se agregan secretos).
- **APIs:** se introduce `GET /api/health` como contrato público mínimo de operación.
- **Módulos posteriores:** todos dependerán de `env.js`, `database.js`, logger y manejo de errores definidos aquí.
