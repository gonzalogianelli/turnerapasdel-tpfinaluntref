---
name: express-esm-mysql
description: Convenciones de arquitectura Express ESM, Sequelize con MySQL, transacciones y manejo centralizado de errores. Usar en todos los módulos del backend.
---

# Convenciones Técnicas Express + ESM + MySQL

1. **ESM estricto:** Usar siempre `import` y `export`. Incluir extensión `.js` en todos los imports relativos locales (ej. `import { User } from '../models/User.js'`).
2. **Arquitectura en capas:**
   - `routes/`: definición de rutas, middlewares de validación/auth/rol y anotaciones Swagger.
   - `controllers/`: extraen `req.params`, `req.query`, `req.body` y `req.user`, delegan en `services/` y devuelven respuestas HTTP claras.
   - `services/`: contienen la lógica de negocio, validaciones de dominio y transacciones de Sequelize.
   - `models/`: definiciones de modelos Sequelize y asociaciones (`index.js` centralizado).
3. **Concurrencia en MySQL:** Para operaciones críticas (reservar un turno o tomar el último cupo de un partido), usar `sequelize.transaction()` con bloqueo pesimista (`lock: Transaction.LOCK.UPDATE`) para evitar condiciones de carrera.
4. **Manejo de errores:**
   - No dejar promesas sin capturar. En Express 4 usar `try/catch` llamando a `next(error)` o wrapper `asyncHandler`.
   - Usar una clase `AppError` con `statusCode` y `message` para errores de negocio controlados (400, 401, 403, 404, 409).
   - Toda respuesta de error pasa por el middleware global de errores y registra log estructurado con Pino.