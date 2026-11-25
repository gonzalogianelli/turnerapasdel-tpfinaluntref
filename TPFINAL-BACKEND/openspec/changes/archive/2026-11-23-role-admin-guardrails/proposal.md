# Proposal: role-admin-guardrails

## Why

El registro público ya fuerza el rol `jugador`, pero lo hace ignorando silenciosamente un `rol` elevado enviado por el cliente; el contrato debe rechazarlo explícitamente para evitar ambigüedad. Además, `POST /api/users` y `PATCH /api/users/:id` ya permiten crear administradores y cambiar roles, pero no impiden degradar al último `administrador`, con riesgo de dejar el complejo sin gestión.

## What Changes

- **BREAKING**: `POST /api/auth/register` rechazará con `400` cualquier cuerpo que incluya el campo `rol`, en lugar de ignorarlo. El usuario creado seguirá siendo siempre `jugador`.
- Formalizar que `administrador` es el único rol de gestión (dueño y empleados comparten ese rol); no se crea un tercer rol.
- Mantener `POST /api/users` (admin) como endpoint protegido para alta de usuarios `jugador` o `administrador`, con validación de rol permitido.
- Mantener `PATCH /api/users/:id` (admin) como endpoint protegido para cambio de rol, agregando la regla de no degradar/eliminar al último `administrador`.
- Auditar los middlewares `authenticate` / `requireRole` de las rutas para confirmar que `jugador` accede solo a su flujo y `administrador` a gestión.
- Actualizar Swagger/OpenAPI de auth y usuarios con el nuevo rechazo `400`, la regla del último administrador y respuestas `401/403/409`.
- Incorporar el arnés de tests `node:test` + `supertest` y cubrir estas reglas; los cambios posteriores reutilizarán ese arnés.

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities

- `user-auth`: el registro público debe rechazar el campo `rol` con `400` y nunca crear un usuario con rol elevado.
- `user-management`: el alta/cambio de rol por administrador queda sujeta a la regla de conservar al menos un `administrador`; se refuerza el control RBAC y su documentación.

## Impact

- Código: `src/utils/userValidation.js`, `src/services/auth.service.js`, `src/services/user.service.js`, `src/routes/auth.routes.js`, `src/routes/user.routes.js`, `src/middlewares/auth.js` (auditoría), `src/app.js` (montaje, solo si hace falta).
- Tests/dependencias: `package.json`, `package-lock.json`, nueva carpeta `test/` con `node:test` + `supertest` (devDependency aprobada).
- Documentación API: anotaciones `@swagger` de auth/usuarios y `README.md` solo donde describa el registro público y roles.
- Fuera de alcance: DELETE de otros recursos, destinatario admin por variable de entorno y suite completa de emails; se harán en cambios OpenSpec posteriores.
