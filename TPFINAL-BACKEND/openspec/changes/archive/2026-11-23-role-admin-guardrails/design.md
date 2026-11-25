# Design: role-admin-guardrails

## Context

El código actual ya crea usuarios públicos con `rol: 'jugador'`, pero descarta silenciosamente un `rol` enviado por el cliente. Los endpoints administrativos `POST /api/users` y `PATCH /api/users/:id` ya existen y usan `requireRole('administrador')`; la validación acepta `administrador`/`jugador` porque `ROLES` solo contiene esos dos valores. No hay regla que impida degradar al último administrador, no hay framework de tests (`npm test` es un placeholder que falla) y `src/app.js` ya exporta `app` para supertest. Ver `proposal.md` para la motivación.

## Goals / Non-Goals

**Goals:**
- Hacer explícito el contrato de registro público: campo `rol` prohibido con `400`.
- Conservar al menos un `administrador` ante cambios de rol, incluso con concurrencia.
- Confirmar el RBAC de auth/usuarios y documentar el rol `administrador` como dueño/empleado.
- Dejar `npm test` en verde con `node:test` + `supertest` para este módulo.

**Non-Goals:**
- No crear un tercer rol ni un endpoint duplicado para administradores.
- No implementar DELETE de usuarios ni de otros recursos.
- No cambiar el destinatario de correos admin ni `.env.example` de SMTP.
- No cubrir con tests los módulos de canchas, turnos, reservas o partidos.

## Decisions

1. **Rechazo en la capa de validación.** `validateCreateUserPayload(payload, { allowRole: false })` fallará con `AppError(..., 400)` si `payload.rol !== undefined`. Se conserva el `User.create({ rol: 'jugador' })` como defensa en profundidad. Alternativa: ignorar el campo (comportamiento actual y redacción de la skill `auth-rbac`); se descarta por decisión del usuario, que prevalece sobre la guía.
2. **Reutilizar endpoints existentes.** `POST /api/users` cubre el alta de `jugador` o `administrador` y `PATCH /api/users/:id` el cambio de rol, ambos ya protegidos por `authenticate` + `requireRole('administrador')`. Alternativa: crear `/api/users/administradores`; se descarta por duplicar contrato y aumentar superficie RBAC.
3. **Guard del último administrador en el servicio.** Antes de aplicar un cambio que saca a un usuario de `administrador`, se cuenta/bloquea dentro de una transacción Sequelize con `Transaction.LOCK.UPDATE` a los usuarios con ese rol. Si no quedaría ninguno, se lanza `AppError(..., 409)` y no se aplica el update. Alternativa: contar fuera de la transacción; se descarta por condición de carrera.
4. **RBAC sin renombrar middlewares.** La auditoría usa `requireRole`, que es el nombre real del código; no se agrega un alias `authorize` solo por la terminología de la skill. Se corrige cualquier ruta de gestión que no lo aplique.
5. **Swagger como contrato.** Documentar `400` en registro por `rol`, `409` en cambio de rol del último administrador, `401/403` en endpoints admin y la aclaración de empleado=`administrador` en descripciones/tags.
6. **Arnés de tests.** Agregar `supertest` como devDependency, `npm test` → `node --test`, y `test/` con setup que fija variables de entorno de prueba antes de importar `app`, llama a `initModels()` y limpia datos/cierra Sequelize al final. Alternativa: `node:test` sin supertest; se descarta por decisión del usuario.

## Risks / Trade-offs

- **BREAKING**: clientes que hoy envían `rol` en registro pasarán de `201` a `400` → Mitigation: documentar en Swagger/README y cubrirlo con test.
- El bloqueo pesimista sobre usuarios admin puede generar espera breve bajo cambios concurrentes → Mitigation: es un conjunto pequeño y la operación es corta.
- Los tests requieren MySQL de prueba y variables `DB_*`/`JWT_SECRET` → Mitigation: setup aislado y limpieza explícita; no usar la DB real.
- Un futuro DELETE de usuario podría bypasear esta regla → Mitigation: el cambio siguiente de DELETE deberá reutilizar el mismo guard.

## Migration Plan

1. Esperar aprobación explícita de este `tasks.md` (puerta SDD).
2. Aplicar validación, guard transaccional, auditoría RBAC, Swagger y tests en ese orden.
3. Verificar `npm test`, `node --check` sobre archivos tocados y QA manual de registro/admin con cookie HTTPOnly.
4. Rollback: revertir el commit del cambio; no hay migración de DB ni datos a reparar.
