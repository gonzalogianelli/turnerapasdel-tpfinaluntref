# Tasks: role-admin-guardrails

## 1. Arnés de tests

- [x] 1.1 Agregar `supertest` como devDependency y cambiar `scripts.test` a `node --test`; verificar que `npm test` ejecuta el runner y que `package-lock.json` queda actualizado.
- [x] 1.2 Crear `test/` con setup que fija `DB_*`, `JWT_SECRET` y SMTP deshabilitado antes de importar `app`, llama a `initModels()` y limpia/cierra Sequelize al final; verificar con un smoke test que `GET /api/health` responde `200`.

## 2. Registro público sin rol elevado

- [x] 2.1 Modificar `validateCreateUserPayload` para rechazar con `400` la presencia de `rol` cuando `allowRole` es `false`, manteniendo el force `jugador` en `auth.service.js`; verificar con test unitario que `rol: 'administrador'` y `rol: 'jugador'` fallan.
- [x] 2.2 Actualizar el bloque `@swagger` de `POST /api/auth/register` con descripción del rechazo y respuesta `400`; verificar que `/api-docs.json` expone esa respuesta y que el test de contrato OpenAPI pasa.
- [x] 2.3 Agregar tests HTTP de registro válido (sin `rol`, `201`, rol `jugador`) y con `rol` elevado (`400`, sin usuario creado); verificar `npm test` en verde.

## 3. Alta/cambio de rol administrativo y último administrador

- [x] 3.1 Implementar en `user.service.js` el guard transaccional con `Transaction.LOCK.UPDATE` que impide degradar al último `administrador`, devolviendo `409` sin aplicar cambios; verificar con tests de degradación del único admin, degradación con otro admin disponible y cambios concurrentes.
- [x] 3.2 Auditar `auth.routes.js` y `user.routes.js`: `POST /api/users` y `PATCH /api/users/:id` deben mantener `authenticate` + `requireRole('administrador')`, y `/api/users/me` debe seguir permitiendo solo `jugador`/admin autenticado sin rol; verificar con tests HTTP `401`, `403` y `200` para cada flujo.
- [x] 3.3 Documentar en Swagger el `409` del último administrador, la nota dueño/empleado=`administrador` y las respuestas `401/403` de gestión; verificar que `/api-docs.json` contiene las respuestas y descripciones.
- [x] 3.4 Actualizar `README.md` con el rechazo de `rol` en registro y la regla del último administrador; verificar que las secciones de registro/roles reflejan el nuevo contrato.

## 4. Verificación integral

- [x] 4.1 Ejecutar `npm test`, `node --check` sobre los archivos tocados y `openspec validate --all --strict`; verificar todo en verde y sin secretos/tokens en la salida.
- [x] 4.2 Confirmar con la skill `padel-backend-qa` que los flujos de registro y gestión de usuarios funcionan con cookie HTTPOnly y que no quedan artifacts temporales; verificar `git status --short` solo con cambios esperados.

## Workflow follow-up

- Esperar revisión y aprobación explícita de este `tasks.md` antes de tocar `src/`.
- Archivar el cambio con `openspec archive role-admin-guardrails --yes` después de la verificación y del cierre aprobado por el usuario.
- Sugerir mensaje de commit; no hacer commit salvo solicitud explícita.
