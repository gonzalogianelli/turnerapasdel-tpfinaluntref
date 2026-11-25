# Proposal

## Why

El Módulo 0 dejó una base ejecutable (Express, MySQL, errores, health) pero sin identidad de usuario. Para operar canchas, turnos y reservas en los módulos siguientes se necesita saber quién es cada persona, distinguir `administrador` de `jugador` y proteger los endpoints según el rol. Este cambio introduce el modelo de usuario, el registro/login/logout con JWT en cookie HTTPOnly y la gestión de jugadores, respetando las reglas de `AGENTS.md`.

## What Changes

- Modelo Sequelize `Usuario` en MySQL con `nombre`, `email` (único), `password` (hash), `categoria`, `posicionHabitual`, `manoDominante`, `sexo`, `telefono` y `rol`; contraseña excluida por defecto de consultas y serializaciones.
- Registro público `POST /api/auth/register` que **siempre** persiste `rol = 'jugador'`, ignora cualquier `rol` enviado y no exige verificación de correo para operar.
- Login `POST /api/auth/login` que valida credenciales y emite un JWT firmado (`{ id, rol }`) en cookie HTTPOnly; logout `POST /api/auth/logout` que limpia la cookie.
- Middleware `authenticate` (lee la cookie, verifica el JWT y adjunta `req.user`) y middleware `requireRole(...roles)` que responde `403` cuando el rol no está permitido.
- Perfil propio: `GET /api/users/me` y `PATCH /api/users/me` (sin poder cambiar `rol`).
- Gestión por administrador: `GET /api/users` con filtros de `req.query` (`rol`, `categoria`, `search`, paginación), `GET /api/users/:id` con `req.params`, `POST /api/users` y `PATCH /api/users/:id`. El administrador **puede** crear usuarios y asignar/cambiar el rol `administrador` o `jugador`. No se incluye baja/eliminación de usuarios en este módulo.
- Validación de campos: `categoria` (`octava`…`primera`), `posicionHabitual` (`revés`/`drive`), `manoDominante` (`zurdo`/`diestro`), `sexo` (`masculino`/`femenino`), `telefono` obligatorio y `email` con formato y unicidad. `password` se hashea con `bcryptjs`.
- Documentación OpenAPI con `swagger-jsdoc` + `swagger-ui-express` en `/api-docs` (JSON en `/api-docs.json`) y esquema de seguridad `cookieAuth`; todos los endpoints nuevos anotados con JSDoc `@swagger`.
- Creación de las tablas mediante `sequelize.sync()` al iniciar el servidor (no hay herramienta de migraciones en el proyecto), manteniendo compatibilidad con MySQL Workbench.

**Fuera de alcance:** recuperación de contraseña y envío real de correos, verificación de email, refresh tokens, revocación de JWT en servidor, baja de usuarios, torneos, canchas, turnos, reservas y partidos incompletos.

## Capabilities

### New Capabilities

- `user-auth`: registro público, login/logout con JWT en cookie HTTPOnly, hash de contraseñas y verificación de sesión mediante middleware de autenticación.
- `user-management`: perfil propio del usuario autenticado, consulta y gestión de usuarios por parte del administrador, y control de acceso por rol en esos endpoints.

### Modified Capabilities

- `app-foundation`: se agrega la documentación interactiva de la API (`/api-docs`, `/api-docs.json`) con esquema de seguridad de cookie, como parte de la base operativa.

## Impact

- **Código nuevo:** `src/models/User.js` y `src/models/index.js`; `src/services/auth.service.js` y `src/services/user.service.js`; `src/controllers/auth.controller.js` y `src/controllers/user.controller.js`; `src/routes/auth.routes.js` y `src/routes/user.routes.js`; `src/middlewares/auth.js`; `src/config/swagger.js` y `src/docs/`.
- **Código modificado:** `src/app.js` (montar rutas, Swagger UI y JSON), `src/server.js` (sincronizar modelos tras conectar a MySQL), `src/config/env.js` solo si se requiere algún valor adicional (no se agregan secretos).
- **Base de datos:** nueva tabla de usuarios (creada por `sequelize.sync()`), con `email` único y `rol` restringido a `administrador`/`jugador`.
- **Dependencias ya instaladas:** `jsonwebtoken`, `bcryptjs`, `swagger-jsdoc`, `swagger-ui-express`; no se agregan paquetes.
- **APIs:** se introducen `/api/auth/*` y `/api/users/*`, además de `/api-docs` y `/api-docs.json`.
- **Módulos posteriores:** reservas y partidos usarán `req.user`, los roles y el modelo de usuario definidos aquí.
