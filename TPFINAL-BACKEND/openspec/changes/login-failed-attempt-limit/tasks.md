# Tasks

## 1. Dependencia y configuración

- [ ] 1.1 Reincorporar `express-rate-limit` ^8.7.5 en `package.json` y `package-lock.json` con `npm install`; verificar con `npm ls express-rate-limit` que quedó instalado y que `src/app.js` no tiene `app.use(limiter)`.
- [ ] 1.2 Agregar `LOGIN_RATE_LIMIT_MAX=3` y `LOGIN_RATE_LIMIT_WINDOW_MS=900000` a `.env.example` y `.env`, y la sección `config.loginRateLimit` a `src/config/env.js`; verificar importando `config` que expone ambos valores y que faltan las variables `RATE_LIMIT_*`.

## 2. Limitador exclusivo del login

- [ ] 2.1 Crear `src/middlewares/loginRateLimit.js` con `loginLimiter` y `resetLoginAttempts(req)` compartiendo la misma clave por IP, `skipSuccessfulRequests: true` y `handler` de `429` con mensaje en español; verificar que ambos exports se importen con ESM y que el handler responde `{ status: 'error', message }`.
- [ ] 2.2 Montar `loginLimiter` solo en `router.post('/login', loginLimiter, login)` en `src/routes/auth.routes.js` y documentar la respuesta `429` en el JSDoc de Swagger; verificar que `/api-docs.json` incluye el `429` en `/api/auth/login` y que `register`/`logout` no lo incluyen.
- [ ] 2.3 Llamar a `resetLoginAttempts(req)` en `src/controllers/auth.controller.js` después de un `loginUser` exitoso y antes de responder `200`; verificar con la suite de la sección 3 que un login correcto limpia el contador de esa IP.

## 3. Pruebas del comportamiento

- [ ] 3.1 Ajustar `test-support/setup.js` con `TRUST_PROXY=true` y una ventana corta antes de importar la app, y crear `test/loginRateLimit.test.js` con IPs simuladas por `X-Forwarded-For`; verificar tres `401` y un cuarto intento `429` sin cookie aunque las credenciales sean correctas.
- [ ] 3.2 Cubrir el reset por login correcto, la expiración de la ventana, una IP distinta y una ruta no protegida en la misma suite; verificar que pasen sin afectar las pruebas existentes.

## 4. Documentación y verificación final

- [ ] 4.1 Actualizar `README.md` y `AGENTS.md` con las nuevas variables y la regla de "solo login", y reflejar los deltas en `openspec/specs/user-auth/spec.md` y `openspec/specs/app-foundation/spec.md`; verificar que no queden referencias activas a `RATE_LIMIT_*` ni a un limitador global.
- [ ] 4.2 Ejecutar `npm test` completo y verificar que toda la suite quede en verde, incluida la nueva; ejecutar `npm run build` en `4toset-padel-front` y verificar que compile sin errores.
