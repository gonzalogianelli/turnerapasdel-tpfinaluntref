# Proposal

## Why

El proyecto ya declara `nodemailer` y expone configuración SMTP en `src/config/env.js`, pero ningún evento de negocio envía correos. Con los módulos de reservas y partidos incompletos ya implementados, el último módulo pendiente puede agregar confirmaciones y avisos sin alterar las reglas de dominio ni hacer que una operación dependa de la disponibilidad de SMTP.

## What Changes

- Incorporar una capability de notificaciones transaccionales con un cliente Nodemailer reutilizable, plantillas centralizadas y una política de entrega desacoplada de las transacciones y de las respuestas HTTP.
- Enviar correo de confirmación de registro al nuevo jugador creado por `POST /api/auth/register` o por el alta administrativa de jugadores.
- Enviar avisos de solicitud, confirmación, rechazo y cancelación de reservas al jugador afectado y a los usuarios con rol `administrador`.
- Enviar avisos de inscripción, baja y cancelación por quórum de partidos al jugador o jugadores afectados y a los administradores, capturando los inscriptos antes de desvincularlos en la cancelación.
- Mantener el arranque del servidor funcional cuando falten variables SMTP o falle el envío: registrar un aviso estructurado con Pino y continuar, sin cambiar códigos de estado, mensajes ni estados de turno/reserva/partido.
- Documentar en README y Swagger las variables SMTP, los eventos notificados y el comportamiento tolerante a fallos, sin incluir secretos.
- Sin cambios rupturistas: no se agregan endpoints, tablas, estados ni reglas de negocio nuevas.

## Capabilities

### New Capabilities

- `email-notifications`: entrega de correos transaccionales del dominio (registro, reservas y partidos), configuración SMTP tolerante a fallos y política de no bloqueo.

### Modified Capabilities

- Ninguna: `user-auth`, `reservation-management` e `incomplete-matches` conservan sus requisitos; el efecto de notificación se describe en la nueva capability.

## Impact

- **Código:** nuevo cliente/servicio de correo y plantillas; cableado en los flujos de registro de usuarios, reservas y partidos. `config.smtp` ya existe en `src/config/env.js`.
- **API:** no se modifican rutas, parámetros ni respuestas; Swagger solo documenta los efectos de notificación y la configuración necesaria.
- **Dependencias:** `nodemailer` ya está declarado en `package.json`; no se incorporan librerías nuevas.
- **Datos:** sin migraciones. Los destinatarios administradores se obtienen consultando usuarios con `rol: 'administrador'`.
- **Operaciones:** variables `.env` `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` y `SMTP_FROM`; los valores sensibles nunca se versionan.
- **Fuera de alcance por decisión del usuario:** recuperación de contraseña y sus endpoints/tokens, envío diferido con cola externa, historial persistente de correos, multi-complejo y torneos.
