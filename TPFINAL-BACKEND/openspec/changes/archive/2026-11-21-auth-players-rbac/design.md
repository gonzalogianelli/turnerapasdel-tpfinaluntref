# Design

## Context

Ver `proposal.md - Why`. El Módulo 0 ya entrega `src/app.js` (helmet, CORS con credenciales, cookie-parser, pino-http, rate limit, rutas, 404 y error handler), `src/config/env.js` con secciones `jwt` y `cookie`, `src/config/database.js` con la instancia única de Sequelize, `src/config/logger.js`, `AppError`/`asyncHandler` y `GET /api/health`. No existen modelos, autenticación ni Swagger. `jsonwebtoken`, `bcryptjs`, `swagger-jsdoc` y `swagger-ui-express` ya están instalados y `cookie-parser` ya está montado.

Restricciones de `AGENTS.md` y skills: ESM con extensión `.js`, secretos solo en `.env`, `AppError` + `next(err)`, JWT en cookie HTTPOnly (nunca en el body), `bcryptjs` con salt ≥ 10, contraseña excluida por defecto, `req.params`/`req.query` reales y todo endpoint anotado con `@swagger` bajo `/api-docs`.

## Goals / Non-Goals

**Goals:**
- Un modelo de usuario único y reutilizable por los módulos siguientes.
- Registro/login/logout y middleware de sesión basados en cookie HTTPOnly.
- Perfil propio y gestión de usuarios por administrador con autorización por rol.
- Contrato de respuesta consistente y documentación OpenAPI navegable.

**Non-Goals:**
- Recuperación/cambio de contraseña, verificación de email, refresh tokens, revocación de JWT o baja de usuarios.
- Migraciones formales, seeders y tests automatizados (no hay framework configurado).
- Reglas de canchas, turnos, reservas o partidos.

## Decisions

### 1. Modelo `Usuario` en `src/models/User.js`
- Tabla `usuarios`, `timestamps: true`.
- Campos: `id` (INTEGER, PK, autoIncrement), `nombre` (STRING, not null), `email` (STRING, not null, unique, validate `isEmail`), `password` (STRING, not null), `categoria` (ENUM de las 8 categorías), `posicionHabitual` (ENUM `revés`/`drive`), `manoDominante` (ENUM `zurdo`/`diestro`), `sexo` (ENUM `masculino`/`femenino`), `telefono` (STRING, not null), `rol` (ENUM `administrador`/`jugador`, default `jugador`).
- `defaultScope` excluye `password`; scope `withPassword` lo incluye para login. Además `toJSON()` elimina `password` como defensa en profundidad.
- `src/models/index.js` importa la instancia de `database.js`, registra el modelo y exporta `initModels()` que ejecuta `sequelize.sync()` (sin `alter`).
- **Alternativas:** hashear en el servicio (descartado, fácil de omitir en futuros módulos); usar `alter: true` (descartado, puede generar cambios destructivos en columnas).

### 2. Hash de contraseñas con hooks del modelo
- `beforeCreate` y `beforeUpdate` hashean `password` con `bcryptjs` (salt 10) solo cuando el campo está presente/cambiado.
- Así cualquier alta (registro público o alta por administrador) queda protegida sin duplicar lógica. `login` usa `User.scope('withPassword')` y `bcrypt.compare`.
- **Alternativa:** hashear explícitamente en cada servicio; se descarta por dispersión y riesgo de doble hash.

### 3. JWT y cookie de sesión
- `jsonwebtoken.sign({ id, rol }, config.jwt.secret, { expiresIn: config.jwt.expiresIn })`.
- Cookie: nombre `config.cookie.name` (`padel_token`), `httpOnly: true`, `sameSite: config.cookie.sameSite`, `secure: config.env === 'production'`, `path: '/'`. Sin `maxAge`: cookie de sesión; la vigencia la impone el JWT.
- El token nunca se devuelve en el body. `logout` usa `res.clearCookie` con las mismas opciones.
- `config.jwt.secret` pasa a ser **requerido** en `env.js` (falla el arranque con mensaje claro si falta), porque este módulo no puede operar sin secreto.
- **Alternativas:** token en `Authorization` (descartado por la regla de cookie HTTPOnly); `maxAge` fijo (descartado para no divergir de `JWT_EXPIRES_IN`).

### 4. Middlewares en `src/middlewares/auth.js`
- `authenticate`: lee `req.cookies[config.cookie.name]`; si falta → `AppError(401)`. Verifica el JWT (`JsonWebTokenError`/`TokenExpiredError` → `AppError(401)`); busca el usuario por `id` con el scope por defecto; si no existe → `AppError(401)`; adjunta la instancia a `req.user` y llama `next()`.
- `requireRole(...roles)`: si no hay `req.user` → `401`; si `req.user.rol` no está en `roles` → `AppError(403)`.
- Se implementa como `authorize`/`requireRole` con firma variádica; los endpoints de administración usan `requireRole('administrador')`.

### 5. Servicios y validación
- `auth.service.js`: `registerUser` (fuerza `rol: 'jugador'`, verifica email duplicado), `loginUser` (busca con `withPassword`, compara, devuelve usuario + payload JWT).
- `user.service.js`: `getUserById`, `updateOwnProfile` (lista blanca de campos; si llega `rol` → `400`), `listUsers` (filtros `rol`, `categoria`, `search` sobre `nombre`/`email`, paginación), `createUser` (permite `rol`), `updateUser` (permite `rol`).
- No se agrega librería de validación: `src/utils/userValidation.js` centraliza enums, reglas de campos y parseo de query, lanzando `AppError(400)`. El email duplicado se detecta por consulta y se refuerza con la restricción única de MySQL (`409`).
- La contraseña se valida con mínimo 8 caracteres; en actualizaciones solo se valida si viene presente.

### 6. Endpoints y contrato de respuesta
- `/api/auth`: `POST /register`, `POST /login`, `POST /logout` (públicos).
- `/api/users`: `GET /me`, `PATCH /me` (autenticados); `GET /`, `POST /`, `GET /:id`, `PATCH /:id` (autenticados + `administrador`). `/me` se declara antes de `/:id`.
- Éxito: `{ status: 'success', data: <usuario|usuarios> }`; los listados agregan `meta: { page, limit, total }`. Error: el formato existente `{ status: 'error', message }`.
- Códigos: `201` alta, `200` lecturas/ediciones, `400` validación, `401` sesión, `403` rol, `404` inexistente, `409` email duplicado.

### 7. Swagger en `src/config/swagger.js`
- `swagger-jsdoc` con OpenAPI 3.0.3, `apis: ['./src/routes/*.js']` resuelto desde la raíz del proyecto, `components.securitySchemes.cookieAuth` (`apiKey`, `in: cookie`, `name: config.cookie.name`) y esquemas `Usuario`, `ErrorResponse` y cuerpos de request.
- `app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(spec))` y `GET /api-docs.json`; se montan antes de `notFound`.
- Cada ruta lleva JSDoc `@swagger` con tag (`Auth`/`Usuarios`), `security: [{ cookieAuth: [] }]` cuando aplica, parámetros `in: path`/`in: query` y respuestas `200/201/400/401/403/404/409`.

### 8. Arranque
- `server.js` llama `initModels()` después de `connectDatabase()` y antes de `listen`, para que la tabla exista. Si `sync` falla, se registra y el proceso termina con código 1 (mismo criterio que la conexión).

## Risks / Trade-offs

- [Usar `sequelize.sync()` sin migraciones puede no reflejar cambios futuros de columnas] → Se documenta que los cambios de esquema posteriores requieren `ALTER TABLE` manual o una herramienta de migraciones; `sync` solo crea tablas faltantes.
- [Logout solo borra la cookie; un JWT copiado sigue válido hasta expirar] → Aceptado en esta etapa; se documenta y se limita la vigencia con `JWT_EXPIRES_IN`.
- [Hash en hooks puede rehashear si un update envía el hash existente] → El hook solo actúa si `password` cambió y los servicios nunca reenvían el hash; `defaultScope` lo oculta.
- [Doble petición simultánea con el mismo email puede chocar] → La restricción `unique` de MySQL es la garantía final; el servicio traduce el error de unicidad a `409`.
- [Swagger montado en producción expone el contrato] → Se acepta por requisito académico; no expone secretos.
- [Sin tests automatizados, la regresión depende de verificación manual] → Se documenta una secuencia de verificación con Swagger UI/curl y MySQL Workbench en `tasks.md`.

## Migration Plan

1. Crear `src/models/User.js` y `src/models/index.js`.
2. Crear validaciones, servicios y middlewares de auth/rol.
3. Crear controladores y rutas de auth y usuarios.
4. Configurar Swagger y montar rutas + docs en `app.js`; sincronizar modelos en `server.js`.
5. Reiniciar el servidor para crear la tabla `usuarios` y verificar los flujos.
- **Rollback:** detener el servidor, eliminar los archivos nuevos y quitar los montajes de `app.js`/`server.js`; si se desea, `DROP TABLE usuarios`. No hay datos previos que migrar.

## Open Questions

- Ninguna que afecte specs, enfoque o desglose de tareas.
