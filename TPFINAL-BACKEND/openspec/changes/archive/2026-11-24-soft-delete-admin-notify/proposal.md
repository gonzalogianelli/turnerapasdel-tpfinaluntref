# Proposal: soft-delete-admin-notify

## Why

El backend todavía elimina físicamente las inscripciones y no ofrece bajas controladas para el resto de los recursos, lo que pierde historial y deja registros referenciados sin una regla uniforme. Además, los avisos al administrador dependen de usuarios con rol `administrador` en DB, con riesgo de rebotes por destinatarios obsoletos como `admin@example.com`; ahora se requiere un destinatario configurado por entorno.

## What Changes

- **BREAKING**: Agregar baja lógica (columna `deletedAt`) a `User`, `Cancha`, `Turno`, `Reserva`, `Partido` e `Inscripcion`. Ninguna operación de la API hará `force: true` ni borrado físico en MySQL.
- **BREAKING**: Convertir `DELETE /api/partidos/:id/inscripciones/:usuarioId` de baja física a baja lógica; la inscripción dada de baja deja de contarse como lugar ocupado, pero conserva su fila histórica y no admite reinscripción del mismo par partido/usuario.
- Agregar `DELETE /api/users/:id`, `DELETE /api/canchas/:id`, `DELETE /api/turnos/:id`, `DELETE /api/reservas/:id` y `DELETE /api/partidos/:id`, protegidos con `authenticate` y `requireRole('administrador')`.
- Proteger el DELETE de inscripción con `authenticate` y `requireRole('jugador', 'administrador')`, manteniendo la validación en servicio de que un jugador solo puede bajar su propia inscripción.
- Ocultar los registros con `deletedAt` no nulo en listados, detalles y operaciones; responder `404` ante IDs inexistentes o ya dados de baja y `400` para identificadores inválidos.
- Rechazar con `409` los DELETE sobre recursos con dependencias o estados activos: cancha con turnos activos, turno con reservas activas, reserva no terminal o con partido activo, partido con inscripciones activas o no terminal, usuario con reservas/inscripciones activas, y cualquier DELETE que deje al sistema sin administradores.
- No alterar estados de turno ni republicar automáticamente como consecuencia de un DELETE; las transiciones siguen siendo competencia de los endpoints de cancelación/rechazo/republicación ya existentes.
- Rechazar con `409` el reuso de emails o de pares reserva/partido que pertenecen a filas dadas de baja, para no violar los UNIQUE existentes de MySQL.
- Migrar esquemas existentes de forma idempotente durante `initModels()`, agregando `deletedAt` solo cuando falte, sin `sequelize.sync({ alter: true })`.
- **BREAKING**: Resolver el destinatario administrador desde `ADMIN_NOTIFY_EMAIL`, con fallback a `SMTP_USER` solo si es un email válido; eliminar `admin@example.com` de código, documentación y ejemplos. Si no queda ningún destinatario válido, no enviar aviso admin y continuar la operación.
- Actualizar OpenAPI, README, `.env.example`, specs y pruebas `node:test` + `supertest` para cubrir bajas lógicas, conflictos, RBAC y destinatario admin por entorno.

## Capabilities

### New Capabilities

- `soft-delete-lifecycle`: Reglas comunes de baja lógica: columna `deletedAt`, ocultamiento en consultas y operaciones, respuesta `404` para registros dados de baja, migración idempotente del esquema y conservación del historial en MySQL.

### Modified Capabilities

- `user-auth`: Un usuario dado de baja no puede iniciar sesión ni ser considerado identidad válida por `authenticate`; su email sigue reservado por el UNIQUE histórico.
- `user-management`: `DELETE /api/users/:id` para administradores, ocultamiento de usuarios bajados y conservación del último administrador activo.
- `court-management`: `DELETE /api/canchas/:id` para administradores, ocultamiento de canchas bajadas y rechazo si tienen turnos activos.
- `slot-management`: `DELETE /api/turnos/:id` para administradores, ocultamiento de turnos bajados y rechazo si tienen reservas activas.
- `reservation-management`: `DELETE /api/reservas/:id` para administradores solo en estados terminales, sin cambios automáticos de estado del turno.
- `incomplete-matches`: `DELETE /api/partidos/:id` para administradores, baja lógica de inscripciones, conteo de cupos sobre filas activas y rechazo de bajas sobre partidos activos.
- `email-notifications`: Destinatario administrador configurado por entorno, sin fallback a usuarios DB ni a `admin@example.com`.
- `app-foundation`: Documentación OpenAPI de los nuevos DELETE y de sus respuestas `400`, `401`, `403`, `404` y `409`.

## Impact

- Modelos y asociaciones: `src/models/User.js`, `Cancha.js`, `Turno.js`, `Reserva.js`, `Partido.js`, `Inscripcion.js`, `index.js`.
- Capas HTTP y negocio: `src/routes/*.js`, `src/controllers/*.js`, `src/services/*.js`, `src/middlewares/auth.js`, `src/utils/*.js`.
- Configuración y correo: `src/config/env.js`, `src/services/notification.service.js`, `src/services/mail.service.js`, `.env.example`.
- Documentación y pruebas: `src/config/swagger.js`, `README.md`, `test/*.test.js`, `test-support/setup.js`.
- Base de datos MySQL existente: se agregará la columna `deletedAt` por modelo; no se eliminarán filas de producción.
