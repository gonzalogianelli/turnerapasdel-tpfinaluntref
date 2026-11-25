# Tasks

## 1. Modelo de usuario y validaciones

- [x] 1.1 Crear `src/models/User.js` con la tabla `usuarios`, los campos y ENUM definidos en `design.md` (`categoria`, `posicionHabitual`, `manoDominante`, `sexo`, `rol`), `email` único, `defaultScope` sin `password`, scope `withPassword`, `toJSON()` sin `password` y hooks `beforeCreate`/`beforeUpdate` que hashean con `bcryptjs`; verificar con `node -e "import('./src/models/User.js').then(m=>console.log(Object.keys(m.User.rawAttributes)))"` que los atributos existen y que el scope por defecto no incluye `password`.
- [x] 1.2 Crear `src/models/index.js` con `initModels()` que ejecuta `sequelize.sync()` y exporta los modelos; verificar con MySQL arriba que al ejecutarlo se crea la tabla `usuarios` (`SHOW TABLES LIKE 'usuarios'`) con las columnas y ENUM esperados en MySQL Workbench.
- [x] 1.3 Crear `src/utils/userValidation.js` con los conjuntos permitidos, la validación de alta/edición (nombre, email, password mínimo 8, categoria, posicionHabitual, manoDominante, sexo masculino/femenino, telefono, rol) y el parseo de `page`/`limit`/`rol`/`categoria`; verificar con un script temporal que un payload válido pasa y que `categoria` inválida, `sexo` inválido y password corto lanzan `AppError` 400.
- [x] 1.4 Hacer `jwt.secret` requerido en `src/config/env.js`; verificar que el arranque falla con un mensaje claro si `JWT_SECRET` falta y que con el `.env` actual importa `config.jwt.secret` sin error.

## 2. Autenticación y sesión

- [x] 2.1 Crear `src/services/auth.service.js` con `registerUser` (fuerza `rol = 'jugador'`, detecta email duplicado con 409) y `loginUser` (busca con `withPassword`, compara con `bcrypt.compare`, devuelve usuario y payload `{ id, rol }`); verificar registrando con `rol: 'administrador'` que en MySQL queda `jugador` y que el valor almacenado en `password` es un hash distinto del original.
- [x] 2.2 Crear `src/middlewares/auth.js` con `authenticate` (cookie → JWT → usuario en `req.user`, 401 si falta/es inválido/no existe) y `requireRole(...roles)` (403 si el rol no está permitido); verificar que una ruta de prueba responde 401 sin cookie, 401 con token inválido y 403 con un JWT de rol `jugador`.
- [x] 2.3 Crear `src/controllers/auth.controller.js` y `src/routes/auth.routes.js` con `POST /api/auth/register`, `POST /api/auth/login` y `POST /api/auth/logout`; verificar con curl/Swagger que el registro responde 201 sin `password`, el login responde 200 con `Set-Cookie` `HttpOnly` y sin token en el body, y el logout limpia la cookie.

## 3. Gestión de usuarios y roles

- [x] 3.1 Crear `src/services/user.service.js` con `getUserById`, `updateOwnProfile` (lista blanca de campos y rechazo de `rol` con 400), `listUsers` (filtros `rol`/`categoria`/`search` y paginación), `createUser` y `updateUser` (permiten asignar `rol`); verificar con datos de prueba que los filtros y la paginación devuelven lo esperado y que un email duplicado lanza 409.
- [x] 3.2 Crear `src/controllers/user.controller.js` y `src/routes/user.routes.js` con `GET /api/users/me`, `PATCH /api/users/me` autenticados y `GET /api/users`, `POST /api/users`, `GET /api/users/:id`, `PATCH /api/users/:id` con `authenticate` + `requireRole('administrador')`, declarando `/me` antes de `/:id`; verificar con curl que un jugador obtiene 200 en `/me`, 403 en `/api/users` y que un administrador puede listar, crear y editar incluyendo el cambio de rol.

## 4. Composición de la app y documentación Swagger

- [x] 4.1 Montar en `src/app.js` los routers `/api/auth` y `/api/users`, y llamar `initModels()` en `src/server.js` después de `connectDatabase()` y antes de `listen`; verificar que importar `app.js` no abre puerto y que `npm run dev` crea/usa la tabla `usuarios` sin errores.
- [x] 4.2 Crear `src/config/swagger.js` con OpenAPI 3.0.3, `components.securitySchemes.cookieAuth` (`apiKey` en cookie con el nombre de `config.cookie.name`) y esquemas de usuario/error, y montar `/api-docs` y `/api-docs.json` en `app.js` antes de `notFound`; verificar que ambas rutas responden sin sesión y que el JSON incluye `cookieAuth`.
- [x] 4.3 Anotar con JSDoc `@swagger` todas las rutas de auth y usuarios (tag `Auth`/`Usuarios`, `cookieAuth` donde aplica, parámetros `in: path`/`in: query` y respuestas 200/201/400/401/403/404/409); verificar en `/api-docs.json` que aparecen los paths y parámetros declarados.

## 5. Verificación de integración y documentación operativa

- [x] 5.1 Ejecutar el flujo completo con el servidor levantado: registro público → login (cookie) → `GET /api/users/me` → listado como administrador → `GET /api/users` como jugador (403), comprobando en cada respuesta que no aparece `password`; verificar en MySQL Workbench la fila creada y el hash almacenado.
- [x] 5.2 Actualizar `README.md` con el modelo de usuario, los endpoints de auth/usuarios, el uso de la cookie HTTPOnly y la ruta `/api-docs`; comprobar que los comandos y ejemplos documentados funcionan tal cual.
- [x] 5.3 Revisar que ningún archivo de `src/` usa `require`/`module.exports` ni imports relativos sin extensión `.js`, y que `openspec validate auth-players-rbac` pasa sin errores.

## Workflow follow-up

- Archivar el cambio con OpenSpec una vez que el usuario apruebe la verificación manual del módulo.
- Sugerir mensaje de commit en Git al cierre.
