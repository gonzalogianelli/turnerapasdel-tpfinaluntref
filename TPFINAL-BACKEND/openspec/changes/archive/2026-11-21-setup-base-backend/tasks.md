# Tasks

## 1. Configuración y logger

- [x] 1.1 Crear `src/config/env.js` que importe `dotenv/config`, lea y tipifique las variables de `.env`, valide las requeridas y exporte un objeto `config` con secciones `server`, `db`, `jwt`, `cookie`, `cors`, `rateLimit` y `smtp`; verificar importándolo con `node -e "import('./src/config/env.js').then(m=>console.log(m.config.server.port))"` sobre el `.env` actual.
- [x] 1.2 Implementar en `env.js` el comportamiento SMTP opcional (`smtp.enabled = false` si faltan variables) y verificar arrancando con las variables SMTP vacías sin error.
- [x] 1.3 Crear `src/config/logger.js` exportando una instancia única de `pino` con nivel según `NODE_ENV`; verificar con `node -e "import('./src/config/logger.js').then(m=>m.logger.info('ok'))"` que imprime log estructurado.

## 2. Conexión a MySQL/Sequelize

- [x] 2.1 Crear `src/config/database.js` con la instancia `Sequelize` usando `mysql2` y las credenciales de `env.js`; verificar que la instancia se crea sin credenciales hardcodeadas.
- [x] 2.2 Implementar `connectDatabase()`, `checkDatabaseHealth()` (SELECT 1 con timeout, sin lanzar) y `closeDatabase()`; verificar con MySQL arriba que `connectDatabase()` resuelve y con MySQL abajo que `checkDatabaseHealth()` devuelve `{ ok: false }` sin excepción.

## 3. Errores y middlewares

- [x] 3.1 Crear `src/utils/AppError.js` (statusCode, message, isOperational) y `src/utils/asyncHandler.js` (captura rechazos y llama `next`); verificar con un controlador de prueba temporal que un throw controlado llega al handler con su statusCode.
- [x] 3.2 Crear `src/middlewares/notFound.js` que genere un `AppError` 404; verificar que una ruta inexistente en la app responde 404 JSON.
- [x] 3.3 Crear `src/middlewares/errorHandler.js` que responda `{ status: 'error', message }`, oculte detalles internos en producción y registre con Pino; verificar respuestas 400 controlada y 500 de excepción inesperada.

## 4. Endpoint de health

- [x] 4.1 Crear `src/controllers/health.controller.js` que use `checkDatabaseHealth()` y responda 200 (`status: 'ok'`) o 503 (`status: 'degraded'`); verificar ambos casos con MySQL arriba y abajo.
- [x] 4.2 Crear `src/routes/health.routes.js` con `GET /api/health` sin autenticación; verificar con `curl http://localhost:<PORT>/api/health` que responde el JSON esperado.

## 5. Composición de la app y arranque

- [x] 5.1 Crear `src/app.js` montando en orden `helmet`, `cors` con `credentials: true`, parseo JSON/urlencoded, `cookie-parser`, `pino-http`, rate limit (excluyendo `/api/health`), rutas, `notFound` y `errorHandler`; exportar `app` y verificar que importarlo no abre puerto.
- [x] 5.2 Verificar que el rate limit responde 429 tras exceder `RATE_LIMIT_MAX` y que un cliente del origen `CLIENT_URL` recibe cabeceras CORS con credenciales.
- [x] 5.3 Crear `src/server.js` que conecte a la DB, haga `listen` en `PORT` y maneje `SIGINT`/`SIGTERM` cerrando HTTP y Sequelize; verificar `npm run dev` y que `Ctrl+C` cierra sin conexiones abiertas.

## 6. Verificación de integración y documentación operativa

- [x] 6.1 Ejecutar `npm run dev` con MySQL arriba y verificar con `GET /api/health` estado 200 y `database: "up"`; detener MySQL y verificar 503 con `database: "down"`.
- [x] 6.2 Verificar en MySQL Workbench que el usuario configurado en `.env` puede conectar al esquema definido en `DB_NAME`.
- [x] 6.3 Añadir al `README.md` las instrucciones de variables de entorno, arranque (`npm run dev`) y verificación de `/api/health`; comprobar que los comandos documentados funcionan tal cual.
- [x] 6.4 Revisar que ningún archivo de `src/` usa `require`/`module.exports` ni imports relativos sin extensión `.js`; verificar con una búsqueda en `src/`.

## Workflow follow-up

- Archivar el cambio con OpenSpec una vez que el usuario apruebe la verificación manual del módulo.
- Sugerir mensaje de commit en Git al cierre.
