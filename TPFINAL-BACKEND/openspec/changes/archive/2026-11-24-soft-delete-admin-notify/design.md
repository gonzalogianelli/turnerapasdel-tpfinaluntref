# Design: soft-delete-admin-notify

## Context

Los modelos actuales usan `timestamps: true` pero no `paranoid`, y `initModels()` solo ejecuta `sequelize.sync()`, que no agrega columnas a tablas ya creadas. La baja de inscripción hoy llama a `destroy()` y por eso borra la fila. Los DELETE de usuarios, canchas, turnos, reservas y partidos no existen. El destinatario administrativo se resuelve hoy con `User.findAll({ where: { rol: 'administrador' } })`, y la documentación contiene ejemplos con `admin@example.com`. Ver `proposal.md` para la motivación y los deltas de specs para el contrato observable.

## Goals / Non-Goals

**Goals:**

- Uniformizar la baja lógica en los seis recursos con conservación del historial en MySQL.
- Evitar que un registro bajado siga apareciendo en listados, detalles o flujos de negocio.
- Rechazar con Conflictos (`409`) las bajas que dejarían dependencias activas o sin administradores.
- Resolver el aviso administrativo desde configuración de entorno, sin direcciones de ejemplo.
- Mantener compatibilidad con MySQL Workbench y con el arnés `node:test` + `supertest`.

**Non-Goals:**

- No cambiar las reglas de duración de turnos, compatibilidad de categorías ni cupos.
- No agregar rollers, torneos, multi-complejo ni recuperación de contraseña.
- No republicar turnos ni cancelar reservas como efecto colateral de un DELETE.
- No crear nuevos endpoints fuera de los ya identificados en el proposal.

## Decisions

### 1. Sequelize `paranoid: true` con columna `deletedAt` explícita

Declarar `deletedAt: DataTypes.DATE` nullable y `paranoid: true` en los seis modelos. El scope por defecto de `User` ya excluye `password`; `paranoid` se compone con ese scope sin cambiar la serialización.

Alternativas consideradas:

- Usar un campo propio `activo` con filtros manuales en cada servicio: se descartó porque es fácil olvidar un query y porque Sequelize ya provee el patrón paranoid.
- Borrado físico con auditoría separada: se descartó porque rompe FK históricas y contradice el requisito de conservar el registro.

### 2. Migración idempotente en `initModels()`

Mantener `sequelize.sync()` para crear tablas nuevas y, a continuación, recorrer los modelos con `queryInterface.describeTable(tableName)`; si `deletedAt` no existe, ejecutar `addColumn(tableName, 'deletedAt', { type: DataTypes.DATE, allowNull: true })`. Registrar cada columna agregada con Pino.

Alternativas consideradas:

- `sequelize.sync({ alter: true })`: se descartó porque puede reescribir índices, ENUMs y restricciones existentes en MySQL sin control.
- Script manual externo: se descartó porque el proyecto no tiene framework de migraciones y el arranque debe dejar la DB lista automáticamente.

### 3. Consultas históricas controladas con `paranoid: false`

Los UNIQUE de MySQL (`usuarios.email`, `partidos.reservaId`, `inscripciones_partido_usuario_unique`) siguen ocupados por filas bajadas. Antes de crear o inscribir, los servicios deben consultar con `paranoid: false` solo para detectar colisiones históricas y responder `409` con mensaje legible. Lo mismo se aplica al resolver usuarios de eventos ya confirmados, para no perder el destinatario de una baja o cancelación ocurrida antes de la baja del usuario.

Ninguna respuesta HTTP devolverá un registro dado de baja como vigente.

### 4. DELETE en capas con transacción y bloqueo

Cada baja se implementará en servicio con `sequelize.transaction()` y `Transaction.LOCK.UPDATE` sobre el recurso y las dependencias que se validan, siguiendo el patrón actual de `turno.service.js`, `reserva.service.js` y `partido.service.js`. Los controladores seguirán extrayendo `req.params`, delegando al servicio y devolviendo `{ status: 'success', data }` con `200`.

Errores: ID no entero positivo → `400`; recurso inexistente o bajado → `404`; dependencia activa, último administrador o UNIQUE histórico → `409`; sesión ausente → `401`; rol inválido → `403`.

### 5. Reglas de conflicto por recurso

- Usuario: `409` si es el último administrador vigente o si tiene reservas `pendiente`/`confirmada` o inscripciones vigentes en partidos `incompleto`/`completo`.
- Cancha: `409` si tiene turnos vigentes `disponible`, `reservado` o `bloqueado`.
- Turno: `409` si tiene reservas vigentes `pendiente` o `confirmada`.
- Reserva: solo `rechazada` o `cancelada`, y sin partido vigente `incompleto`/`completo`; `409` en caso contrario.
- Partido: solo `jugado` o `cancelado`, y sin inscripciones vigentes; `409` en caso contrario.
- Inscripción: mantiene la regla actual de no bajar partidos `jugado`/`cancelado`; la fila se marca con `deletedAt` en lugar de borrarse.

Ninguna de estas operaciones cambia estados de turno ni republica.

### 6. RBAC explícito en rutas

Todos los DELETE nuevos llevan `authenticate, requireRole('administrador')`. El DELETE de inscripción lleva `authenticate, requireRole('jugador', 'administrador')` y el servicio conserva la validación de titular para jugadores. Así, el middleware expresa el contrato y el servicio protege la posesión del recurso.

### 7. Destinatario administrativo por entorno

`config.smtp` expondrá `adminNotifyEmail` desde `ADMIN_NOTIFY_EMAIL`, con fallback a `SMTP_USER` solo si pasa el mismo regex de email ya usado en `notification.service.js`. `resolveAdmins()` se sustituye por un resolvedor sin consulta a DB. Si no hay valor válido, `dispatchEvent()` omite ese destinatario y continúa; no hay fallback a `admin@example.com`. `.env.example`, README y ejemplos de curl dejarán de usar esa dirección; en su lugar se usará una variable de shell como `$ADMIN_EMAIL`.

### 8. Pruebas y limpieza

Agregar tests `node:test` + `supertest` para cada DELETE, RBAC, 404/400/409, ocultamiento, migración idempotente y destinatario admin. La limpieza de `test-support/setup.js` usará `destroy({ where: {}, force: true })` en orden de FK únicamente sobre `*_test`, porque `paranoid` impediría limpiar filas bajadas y los UNIQUE provocarían fallos entre tests. `force: true` NO SHALL usarse en código de aplicación.

## Risks / Trade-offs

- [Los UNIQUE siguen reservados por filas bajadas] → Validar con `paranoid: false` y devolver `409` antes de llegar a MySQL; documentar que emails y reinscripciones históricas no se reutilizan.
- [Una cookie emitida antes de la baja sigue vigente hasta expirar] → `authenticate` y `loginUser` consultan con paranoid activo, por lo que el usuario bajado recibe `401` en la siguiente solicitud.
- [La migración toca tablas con datos] → `describeTable` + `addColumn` es idempotente y no altera otras columnas; verificar en un backup antes de desplegar.
- [Bajas concurrentes sobre el último administrador o último cupo] → Misma transacción con `LOCK.UPDATE` ya usada para roles e inscripciones.
- [Notificaciones de eventos pasados hacia usuarios bajados] → Resolver destinatarios afectados con `paranoid: false` solo dentro del evento ya persistido.
- [El test cleanup necesita borrado físico] → Queda aislado en `test-support/setup.js` sobre la DB de test; nunca en servicios de aplicación.

## Migration Plan

1. Respaldar la DB MySQL y confirmar que `DB_*` apunta al entorno correcto.
2. Desplegar el código; `initModels()` agregará `deletedAt` a las seis tablas que aún no lo tengan y dejará las demás intactas.
3. Verificar en MySQL Workbench que las seis tablas tienen `deletedAt` nullable y que no se eliminó ninguna fila.
4. Ejecutar `npm test` y la smoke QA sobre DB de prueba; comprobar `/api-docs.json` incluye los nuevos DELETE.
5. Configurar `ADMIN_NOTIFY_EMAIL` (o un `SMTP_USER` válido) en `.env`; si se deja vacío, el sistema seguirá operando sin aviso admin.
6. Rollback: restaurar el backup de DB y desplegar la versión anterior del código; no intentar eliminar la columna sin backup porque las filas bajadas dejarían de estar marcadas.
