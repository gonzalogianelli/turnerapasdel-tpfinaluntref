# AGENTS.md — Reglas del Proyecto (Sistema de Gestión de Pádel)

## 1. Principio de Control y Workflow SDD (Anti-Improvisación)
- **Prohibido improvisar:** Nunca inventes funcionalidades, endpoints, tablas o reglas que no estén en este archivo, en las skills de `.opencode/skills/` o en la spec aprobada del módulo activo.
- **Orden estricto (Spec -> Plan -> Código):** Nunca escribas código de aplicación (`src/`) sin haber generado primero `proposal.md`, `design.md`, `specs/` y `tasks.md` mediante OpenSpec y haber recibido aprobación explícita del usuario.
- **Aislamiento por módulo:** Trabajar estrictamente **un módulo a la vez** (Módulo 0 -> Módulo 1 -> Módulo 2 -> Módulo 3 -> Módulo 4 -> Módulo 5). No modifiques ni adelantes código de módulos futuros.
- **Uso obligatorio de Skills:** Antes de escribir código, aplicar siempre las reglas definidas en `.opencode/skills/` (`express-esm-mysql`, `auth-rbac`, `padel-domain`, `swagger-docs`, `padel-backend-qa`).

## 2. Stack Tecnológico Obligatorio
- **Runtime:** Node.js con JavaScript puro y **módulos ESM** (`import` / `export`, `"type": "module"` en `package.json`). Prohibido `require` o `module.exports`.
- **Base de datos:** MySQL (compatible con **MySQL Workbench**) usando `mysql2` y ORM **Sequelize**.
- **Autenticación y Seguridad:** JWT firmado almacenado en **cookie `HTTPOnly`**, contraseñas hasheadas con `bcryptjs`, secretos en `.env` (nunca hardcodeados), `helmet` y `cors` configurado con credenciales (`credentials: true`). No se aplica ningún límite de tasa a las peticiones HTTP.
- **Notificaciones:** `nodemailer` vía SMTP configurado en `.env` (no exigir conexión SMTP obligatoria al iniciar el servidor si las variables están pendientes).
- **Observabilidad y Docs:** Logger estructurado (`pino` y `pino-http`), **Swagger** (`swagger-jsdoc` + `swagger-ui-express`), manejador `404` y manejador global de errores estándar de Express/Node.
- **Requisitos académicos:** Uso explícito de `req.params` y `req.query` en endpoints reales, middlewares de autorización por rol y `README.md` completo.

## 3. Reglas de Negocio (Primera Etapa — Un Único Complejo)
- **Fuera de alcance:** Torneos, cuadros, resultados, rankings, ascensos, multi-complejo y recuperación de contraseña (decisión registrada en la spec `email-notifications`).
- **Roles (2):**
  - `administrador` (engloba a dueño o empleado del complejo): gestiona canchas, turnos, bloqueos, solicitudes/reservas, cancelaciones, republicaciones, partidos incompletos y jugadores.
  - `jugador`: consulta turnos disponibles, solicita reservas, consulta/anota en partidos incompletos y gestiona su perfil.
  - *Regla crítica:* El registro público siempre crea rol `jugador`. Nunca permite crear `administrador`.
- **Registro de jugadores:** Autorregistro o alta por administrador sin aprobación previa ni verificación obligatoria de correo para iniciar sesión/operar.
  - Campos obligatorios: `nombre`, `email`, `password`, `categoria` (`octava`, `séptima`, `sexta`, `quinta`, `cuarta`, `tercera`, `segunda`, `primera`), `posicionHabitual` (`revés` o `drive`), `manoDominante` (`zurdo` o `diestro`), `sexo` y `telefono` (obligatorio).
- **Canchas y turnos:**
  - Turnos de **90 minutos** cargados manualmente por el administrador (sin generación automática desde grilla).
  - Canchas/turnos pueden marcarse como `bloqueado` (mantenimiento, clima, etc.).
  - Estados en DB: `disponible`, `reservado`, `cancelado`, `jugado`, `bloqueado`.
- **Reservas, solicitudes y cancelaciones:**
  - Al ingresar la primera solicitud sobre un turno `disponible`, pasa a `reservado` y desaparece del listado de disponibles para otros jugadores, manteniendo su registro histórico en DB.
  - El administrador confirma, rechaza o cancela turnos.
  - Tras una cancelación confirmada, el turno NO vuelve a `disponible` automáticamente: el administrador debe republicarlo manualmente.
  - Si un jugador anotado se baja a último momento, el turno mantiene su estado ocupado/`jugado` y no se vuelve a publicar como disponible.
- **Partidos incompletos:**
  - Siempre asociados a un turno ya `reservado`.
  - Máximo **4 jugadores** (informar lugares ocupados y faltantes).
  - Categorías compatibles: categoría del partido y hasta **1 categoría de diferencia** (ej. en `octava` entran `octava` y `séptima`).
  - Concurrencia: ante inscripciones simultáneas al último lugar, gana la primera procesada con transacción y bloqueo en MySQL (`Transaction.LOCK.UPDATE`).
  - Si no se completan los 4 jugadores con **1 hora de anticipación**, el administrador cancela el turno y los jugadores quedan desvinculados.
- **Emails (Nodemailer):** Confirmación de registro, aviso de solicitud de reserva, confirmación o rechazo de solicitud, y aviso de cancelación de turno. La recuperación de contraseña está fuera de alcance según la decisión registrada en `email-notifications`.