---
name: auth-rbac
description: Autenticación con JWT en cookie HTTPOnly, hashing con bcryptjs y autorización por roles (administrador y jugador).
---

# Seguridad, Cookie HTTPOnly y Roles

1. **JWT en Cookie HTTPOnly:**
   - Al hacer login o registro, firmar JWT con `{ id, rol }` y enviarlo en cookie con `httpOnly: true`, `sameSite: 'lax'`, `secure: process.env.NODE_ENV === 'production'`.
   - Al hacer logout, limpiar la cookie con `res.clearCookie(...)`.
   - Nunca devolver el token en el body para que el cliente lo guarde en `localStorage`.
2. **Contraseñas:**
   - Hashear con `bcryptjs` (salt rounds >= 10) antes de persistir.
   - Excluir el campo `password` por defecto en consultas y serializaciones JSON (`defaultScope` en Sequelize).
3. **Control de Roles (`administrador` | `jugador`):**
   - Middleware `authenticate`: verifica la cookie JWT y adjunta `req.user`. Si falta o es inválida, devuelve `401`.
   - Middleware `authorize(...rolesPermitidos)`: verifica que `req.user.rol` esté permitido. Si no, devuelve `403`.
   - El endpoint público `POST /api/auth/register` fuerza `rol = 'jugador'` ignorando cualquier `rol` enviado en el body.