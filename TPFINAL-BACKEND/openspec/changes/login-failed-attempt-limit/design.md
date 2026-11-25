# Design

## Context

La app no tiene limitador global desde el cambio anterior. `src/app.js` conserva `app.set('trust proxy', config.server.trustProxy)`, `POST /api/auth/login` está definido en `src/routes/auth.routes.js` y delega en `loginUser` de `src/services/auth.service.js`, que lanza `AppError(..., 401)` para credenciales inválidas. El frontend ya muestra el `message` del JSON de error, por lo que no requiere cambios. Ver `proposal.md` para la motivación y los deltas de specs para el contrato observable.

## Goals / Non-Goals

**Goals:**
- Limitar solo intentos fallidos de login por IP con una ventana configurable.
- Permitir que un login correcto limpie por completo el historial de esa IP.
- Mantener todas las demás rutas sin contadores ni `429`.

**Non-Goals:**
- No reintroducir un limitador global ni manejo de `429` en el frontend.
- No bloquear registro, logout, consultas, filtros ni escrituras.
- No persistir contadores en MySQL ni compartirlos entre procesos (fuera de alcance académico).

## Decisions

1. **Montaje del limitador solo en la ruta de login.** Se aplica como middleware de `router.post('/login', loginLimiter, login)` en `src/routes/auth.routes.js`, no con `app.use(limiter)`.
   - Alternativa descartada: filtrar por ruta desde `app.js`; deja el middleware global montado y es fácil volver a bloquear otras rutas por error.

2. **Usar `express-rate-limit` v8 con `skipSuccessfulRequests: true`, `limit` desde config y un `handler` propio** que responde `{ status: 'error', message: 'Demasiados intentos fallidos. Esperá 15 minutos e intentá nuevamente.' }` con `429`.
   - Alternativa descartada: un `Map` casero; la dependencia ya figuraba en el stack del proyecto y resuelve ventanas y cabeceras estándar sin código adicional.

3. **Clave estable por IP.** `keyGenerator` usa `req.ip || req.socket.remoteAddress || 'unknown'`. Se expone una única función `resetLoginAttempts(req)` que calcula la misma clave y llama a `limiter.resetKey(key)`; el controlador la invoca después de un login exitoso.
   - Alternativa descartada: apoyarse solo en `skipSuccessfulRequests`, que descuenta un hit pero no limpia el contador completo.
   - Nota: se conserva `trust proxy` tal cual; en producción solo debe activarse detrás de un proxy confiable para evitar IP falsificada.

4. **Configuración centralizada.** `config.loginRateLimit` expone `windowMs` y `max` desde `LOGIN_RATE_LIMIT_WINDOW_MS` (default `900000`) y `LOGIN_RATE_LIMIT_MAX` (default `3`), agregadas a `.env`/`.env.example`.
   - Alternativa descartada: números hardcodeados; rompe el patrón de `src/config/env.js`.

5. **Pruebas con IP simulada y ventana corta.** `test-support/setup.js` define `TRUST_PROXY=true` y un `LOGIN_RATE_LIMIT_WINDOW_MS` corto antes de importar la app; cada caso usa un `X-Forwarded-For` distinto para no compartir contadores. La suite cubre 3×`401`, cuarto intento `429` (incluso con credenciales correctas), reset tras login válido, expiración de ventana y que `/api/health` siga respondiendo sin límite.
   - Alternativa descartada: tests con la ventana real de 15 minutos; serían lentos y frágiles.

6. **Sin cambios en el frontend.** El mensaje del `handler` llega en `payload.message` y `ApiError` lo muestra; el título genérico existente es suficiente.

## Risks / Trade-offs

- [Varios usuarios detrás de la misma IP pueden compartir el contador] → la ventana es corta, solo cuentan fallos y un login correcto resetea; los valores son configurables.
- [El store en memoria se pierde al reiniciar o no se comparte entre instancias] → aceptado en el alcance de un único complejo y una sola instancia.
- [Si `trust proxy` está mal configurado, un cliente puede fingir `X-Forwarded-For`] → se mantiene el default `false` y la documentación existente sobre proxy confiable.
- [Un usuario frustrado puede quedar sin login por 15 minutos] → es el comportamiento pedido; el mensaje del `429` indica la espera y el reset por login correcto reduce el impacto.

## Migration Plan

Reinstalar `express-rate-limit`, agregar las variables de entorno, crear el middleware, montarlo en la ruta de login, invocar el reset desde el controlador, documentar OpenAPI/README/AGENTS/specs y ejecutar `npm test`. No hay migración de datos. Rollback: quitar el middleware de la ruta, el reset, las variables y la dependencia, volviendo al estado sin límite en login.

## Open Questions

(ninguna)
