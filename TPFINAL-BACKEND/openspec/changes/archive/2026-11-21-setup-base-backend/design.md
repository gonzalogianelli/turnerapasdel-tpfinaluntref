# Design

## Context

Ver `proposal.md - Why`. El repositorio es un esqueleto: `src/config`, `controllers`, `docs`, `middlewares`, `models`, `routes`, `services` y `utils` existen vacíos. `package.json` ya declara `"type": "module"` y todas las dependencias necesarias están instaladas (`express` ^5, `sequelize` ^6, `mysql2`, `pino`/`pino-http`, `helmet`, `cors`, `express-rate-limit`, `cookie-parser`, `dotenv`). `.env` y `.env.example` ya definen las variables (puerto, MySQL, JWT/cookie, CORS, rate limit, SMTP).

Restricciones de `AGENTS.md` y de las skills: ESM estricto con extensión `.js`, secretos solo en `.env`, `AppError` + `next(err)` + middleware global, Pino como logger, y no exigir SMTP al arrancar.

## Goals / Non-Goals

**Goals:**
- Un único módulo de configuración del que dependan todos los módulos.
- Una única instancia de Sequelize reutilizable (`src/config/database.js`).
- Pipeline de middlewares determinista en `src/app.js` (seguridad → parseo → logging → rutas → 404 → error handler).
- Contrato de error JSON uniforme y `GET /api/health` verificable con Sequelize.
- `src/server.js` con arranque y apagado ordenado (SIGINT/SIGTERM).

**Non-Goals:**
- Autenticación/JWT, RBAC, modelos de negocio, migraciones, seeders, Swagger de negocio y envío real de correos.
- Tests automatizados formales (no hay framework configurado); la verificación será manual vía health + MySQL Workbench.
- Configuración de clustering, Docker o despliegue.

## Decisions

### 1. Configuración centralizada en `src/config/env.js`
- `env.js` importa `dotenv/config` como primer efecto y construye y exporta un objeto `config` congelado con secciones: `server`, `db`, `jwt`, `cookie`, `cors`, `rateLimit`, `smtp`.
- Valida solo variables **requeridas para arrancar** (puerto, credenciales MySQL no vacías salvo password opcional en local). Las variables SMTP se tratan como opcionales: si faltan, `smtp.enabled = false` y el arranque continúa.
- Conversión de tipos explícita (números para `PORT`, `DB_PORT`, `SMTP_PORT`, `RATE_LIMIT_*`, booleano para `SMTP_SECURE`).
- **Alternativa considerada:** leer `process.env` directamente en cada módulo, descartada por dispersión y validación duplicada.

### 2. Logger dedicado en `src/config/logger.js`
- Exporta una instancia única de `pino` con nivel por entorno (`development` → `debug`, producción → `info`, test → `silent`).
- `pino-http` se monta en `app.js` usando esa instancia, exponiendo `req.log`.
- `app.js` usa el logger para el log de arranque/errores; el error handler registra `logger.error({ err, req })`.

### 3. Base de datos en `src/config/database.js`
- Exporta una instancia de `Sequelize` creada con `new Sequelize(dbName, user, password, { host, port, dialect: 'mysql', logging: false })`.
- Exporta `connectDatabase()` (llama `sequelize.authenticate()`) y `checkDatabaseHealth()` que ejecuta `SELECT 1` con timeout y devuelve `{ ok: boolean, error? }` sin lanzar. Exporta `closeDatabase()` (`sequelize.close()`).
- **Decisión:** no usar `sequelize.sync()` en este módulo (no hay modelos); los módulos posteriores deciden migraciones/sync.
- **Alternativa considerada:** crear la conexión dentro de `server.js`, descartada porque los controladores/servicios necesitan el mismo pool.

### 4. Errores uniformes en `src/utils/`
- `AppError extends Error` con `statusCode` (default 500), `message` y flag `isOperational = true`.
- `asyncHandler(fn)` devuelve un wrapper que ejecuta `Promise.resolve(fn(...)).catch(next)`; se mantiene aunque Express 5 propague rechazos, por claridad y compatibilidad con controladores futuros.
- `notFound.js` crea un `AppError('Recurso no encontrado', 404)` y llama `next`.
- `errorHandler.js`: si `err.isOperational`, responde `err.statusCode`; si no, responde 500. Forma de respuesta: `{ status: 'error', message }` (sin stack en producción; stack solo en `development` como campo adicional).
- Debe registrarse **después** de rutas y 404; Express lo identifica por tener 4 argumentos.

### 5. Composición de `src/app.js`
Orden: `helmet()` → `cors({ origin: corsOrigin, credentials: true })` → `express.json()`/`express.urlencoded()` → `cookie-parser()` → `pino-http` → rate limiter → rutas (`/api/health`) → `notFound` → `errorHandler`.
- **Rate limit:** `express-rate-limit` con `windowMs` y `max` desde config, `standardHeaders: true`, `legacyHeaders: false`; se excluye `GET /api/health` mediante `skip` para no bloquear monitoreo.
- **CORS:** origen único desde `CLIENT_URL`; si no está definido, se permite el origen por defecto de desarrollo. `credentials: true` obligatorio para cookies HTTPOnly futuras.
- Se exporta `app` (sin `listen`) para permitir pruebas/importación.

### 6. Endpoint `GET /api/health`
- Ruta en `src/routes/health.routes.js`; controlador `src/controllers/health.controller.js`.
- Lógica: `const db = await checkDatabaseHealth()`; responde `200` con `{ status: 'ok', server: 'up', database: db.ok ? 'up' : 'down', timestamp }` si `db.ok`; si no, `503` con el mismo cuerpo y `status: 'degraded'`.
- No requiere autenticación ni pasa por guards de rol.
- **Alternativa considerada:** responder 200 siempre y usar un campo booleano, descartada porque 503 permite a balanceadores/monitoreo detectar degradación.

### 7. `src/server.js`
- Importa `app`, `connectDatabase`, `closeDatabase` y `config`.
- Secuencia: `await connectDatabase()` → `app.listen(config.server.port)`; si la conexión inicial falla, registra el error y termina con código 1 (no queda un servidor "zombi" sin DB).
- Registra handlers `SIGINT`/`SIGTERM` que cierran el HTTP server y luego la DB, con `process.exit(0)`; en error de cierre, log y `process.exit(1)`.
- Captura `unhandledRejection`/`uncaughtException` para log estructurado y cierre controlado.

## Risks / Trade-offs

- [Fallar el arranque si MySQL no responde impide levantar la app para tareas sin DB] → Se documenta que en desarrollo se puede arrancar MySQL primero; a futuro se podría añadir flag `DB_REQUIRED=false`.
- [Excluir `/api/health` del rate limit deja un endpoint sin throttling] → El endpoint solo ejecuta `SELECT 1`, es idempotente y su exposición es estándar en operaciones.
- [Usar `sequelize.authenticate()` en cada health puede presionar la DB si se consulta muy seguido] → Se usa `SELECT 1` y se documenta que el health debe consumirse con intervalos razonables; el pool limita el costo.
- [Validación de env incompleta podría permitir defaults inseguros] → Se validan explícitamente las variables requeridas y se prohíben valores por defecto para secretos.
- [Express 5 ya captura rechazos async, `asyncHandler` puede parecer redundante] → Se mantiene por consistencia con la skill y para control explícito del comportamiento.

## Migration Plan

1. Crear `src/config/env.js`, `logger.js`, `database.js`.
2. Crear `src/utils/AppError.js` y `asyncHandler.js`.
3. Crear `src/middlewares/notFound.js` y `errorHandler.js`.
4. Crear `src/routes/health.routes.js` y `src/controllers/health.controller.js`.
5. Crear `src/app.js` y `src/server.js`.
6. Verificar `npm run dev` y `GET /api/health` con MySQL arriba y abajo.
- **Rollback:** al ser archivos nuevos y aislados, basta con eliminarlos; no hay migraciones ni cambios destructivos en DB.

## Open Questions

- Ninguna que afecte specs, enfoque o desglose de tareas. El nombre exacto de las variables SMTP y su empaquetado ya están definidos en `.env.example` y se respetarán.
