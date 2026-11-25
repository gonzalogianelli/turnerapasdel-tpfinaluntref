# Design

## Context

Ver `proposal.md` para la motivación y `specs/email-notifications/spec.md` para el contrato. El proyecto ya usa ESM, capas `routes/controllers/services/models`, `sequelize` con MySQL, Pino y `config.smtp` derivado de variables `.env`. Las operaciones de registro, reservas y partidos ya son transaccionales y devuelven objetos serializados; ninguna expone correo de administrador ni datos previos a una baja/cancelación por quórum.

## Goals / Non-Goals

**Goals:**

- Centralizar el envío de correos en un componente reutilizable que no conozca reglas de negocio.
- Dispatch de eventos después de que la transacción correspondiente haya confirmado, sin alterar la respuesta HTTP.
- Resolver destinatarios por rol desde la base de datos y deduplicarlos.
- Capturar el contexto necesario para cada mensaje (turno, cancha, cupos, inscriptos previos) sin ensuciar las respuestas de la API.
- Documentar operación y variables SMTP sin publicar secretos.

**Non-Goals:**

- No agregar endpoints, tablas, migraciones ni estados.
- No implementar recuperación de contraseña, tokens ni flujos de verificación de email.
- No introducir colas externas, reintentos persistentes ni historial de correos.
- No modificar reglas de dominio de turnos, reservas ni partidos.

## Decisions

### 1. Cableado en la capa de servicios, después del commit

Cada servicio mutador invocará al servicio de notificaciones una vez que `sequelize.transaction(...)` haya resuelto, pasando el objeto serializado que ya devuelve hoy. Los controladores siguen devolviendo exactamente la misma respuesta.

- **Rationale:** los servicios ya tienen el resultado persistido y, en el caso de cancelación por quórum, pueden capturar los inscriptos antes de `Inscripcion.destroy`. Si se hiciera desde controladores, ese dato previo se perdería o habría que filtrarlo de la respuesta.
- **Alternative considered:** despachar desde controladores. Se descarta por acoplamiento HTTP y pérdida del snapshot de inscriptos.
- **Alternative considered:** despachar dentro de la transacción. Se descarta porque un fallo de red SMTP podría retrasar o confundir el commit.

### 2. Separar transporte, orquestación y plantillas

- Un módulo de transporte construye el cliente SMTP a partir de `config.smtp` y expone un único envío protegido.
- Un módulo de notificaciones resuelve destinatarios, arma el contexto y elige plantilla.
- Las plantillas viven en un directorio propio y devuelven `{ subject, text, html }`.

- **Rationale:** Nodemailer queda confinado al transporte; las reglas de "a quién" y "qué decir" quedan testeables sin SMTP.
- **Alternative considered:** importar Nodemailer directamente en cada servicio. Se descarta por duplicación y riesgo de filtrar credenciales en logs.

### 3. Entrega best-effort sin `await` en la request

Las funciones de notificación capturan internamente cualquier error y registran un warning con Pino. Los servicios las invocan sin `await`; la promesa nunca se rechaza hacia afuera.

- **Rationale:** cumple el requisito de no bloquear ni romper transacciones/respuestas. No requiere dependencias ni infraestructura nueva.
- **Alternative considered:** `await sendMail` con `try/catch`. Se descarta porque agrega latencia de red al camino crítico.
- **Alternative considered:** cola/reintentos en tabla. Se descarta por alcance fuera de este módulo.

### 4. Destinatarios consultados en DB

Para cada evento se consultan los usuarios con `rol: 'administrador'` (`id`, `nombre`, `email`) y se combinan con el jugador o jugadores afectados. Se deduplica por email en minúsculas.

- **Rationale:** es la decisión confirmada por el usuario y evita otra variable de entorno.
- **Alternative considered:** `ADMIN_EMAIL` en `.env`. Se descarta por decisión del usuario.
- **Alternative considered:** cachear administradores en memoria. Se descarta porque un alta reciente de administrador debe reflejarse de inmediato.

### 5. SMTP deshabilitado de forma graceful

El transporte solo se crea cuando `config.smtp.enabled` es verdadero. No se ejecuta `verify()` al arrancar. Si faltan `SMTP_HOST` o `SMTP_FROM`, el módulo registra un aviso y las llamadas de envío se convierten en no-op.

- **Rationale:** `env.js` ya calcula `enabled` sin lanzar error; el servidor debe arrancar igual en desarrollo.
- **Alternative considered:** validar SMTP en `server.js`. Se descarta porque rompería el arranque sin credenciales.

### 6. Documentación como efecto colateral, no como endpoint nuevo

Se amplían las descripciones Swagger existentes de registro/alta de jugador, reservas y partidos para indicar el aviso enviado. README incorpora la matriz de eventos y la tabla de variables SMTP.

- **Rationale:** no hay nuevos paths ni parámetros; respetar los tags ya definidos evita inventar documentación.
- **Alternative considered:** crear un tag `Notificaciones`. Se descarta porque no existe ningún endpoint de notificaciones.

## Risks / Trade-offs

- **[Fallo SMTP] → Mitigation:** el transporte nunca lanza hacia la request; se registra `{ event, recipientCount, error }` con Pino. Correo perdido sin reintento es una limitación aceptada.
- **[Contexto insuficiente en objetos serializados] → Mitigation:** el servicio de notificaciones consulta solo los datos mínimos faltantes (Turno, Cancha, User) después del commit; si falla esa consulta, se omite el correo y se registra el evento.
- **[Cancelación por quórum] → Mitigation:** capturar `inscriptos` antes de `Inscripcion.destroy` y pasar ese snapshot al notificador; el resultado HTTP sigue siendo el partido serializado actual.
- **[Emails duplicados] → Mitigation:** deduplicar destinatarios por email normalizado; el jugador que también es administrador recibe un solo mensaje.
- **[Inyección HTML en plantillas] → Mitigation:** escapar valores interpolados y mantener también una versión `text`.
- **[Logs con datos sensibles] → Mitigation:** no registrar passwords, hashes, JWT, `SMTP_PASS` ni direcciones completas; solo cantidad de destinatarios y mensaje de error sanitizado.

## Migration Plan

Sin migraciones de base de datos ni cambios de esquema. El despliegue consiste en revisar/agregar las variables SMTP en `.env`; si están ausentes, el sistema sigue operando con correos deshabilitados. Rollback: revertir el commit del módulo y dejar las variables en `.env` sin efecto; no hay datos que limpiar.
