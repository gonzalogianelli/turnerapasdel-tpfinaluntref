# Proposal

## Why

El limitador global anterior contaba todas las peticiones y bloqueaba la navegación y los filtros con `429`. Se necesita frenar solo la fuerza bruta sobre el login, sin que el resto de la aplicación tenga topes ni colas.

## What Changes

- Reincorporar `express-rate-limit` y montarlo **únicamente** en `POST /api/auth/login`; el resto de las rutas queda sin límite.
- Contar solo intentos fallidos por IP: 3 fallos dentro de 15 minutos hacen que esa IP reciba `429` en el login por el resto de la ventana.
- Un inicio de sesión exitoso limpia el contador de esa IP; si no hay éxito, el contador expira por tiempo.
- Agregar `LOGIN_RATE_LIMIT_MAX` y `LOGIN_RATE_LIMIT_WINDOW_MS` (defaults `3` y `900000`) a la configuración y a los archivos de entorno.
- Documentar el `429` en OpenAPI/README y ajustar `AGENTS.md` y las specs para dejar explícito que no hay rate limit global.
- Agregar tests del bloqueo, del reset por login exitoso, de la expiración y de que otras rutas siguen libres.
- No se modifica el frontend: el cliente ya muestra el `message` del cuerpo JSON devuelto por la API.

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities

- `user-auth`: agrega el requerimiento de límite de intentos fallidos de login por IP, con `429` temporal y reset ante login correcto.
- `app-foundation`: aclara que la app no aplica un limitador global y que el único límite permitido es el del endpoint de login.

## Impact

- Código: nuevo middleware de login, `src/routes/auth.routes.js`, `src/controllers/auth.controller.js`, `src/config/env.js` y `test-support/setup.js`.
- Dependencias: volver a instalar `express-rate-limit` (versión 8.x) y actualizar `package.json`/`package-lock.json`.
- Configuración: `.env` y `.env.example` con las nuevas variables `LOGIN_RATE_LIMIT_*`.
- API: `POST /api/auth/login` puede responder `429` con `{ "status": "error", "message": "..." }`; ningún otro endpoint cambia.
- Documentación: `README.md`, `AGENTS.md`, Swagger de login y specs `user-auth`/`app-foundation`.
- Pruebas: nueva suite de login rate limit más la suite existente (`npm test`).
