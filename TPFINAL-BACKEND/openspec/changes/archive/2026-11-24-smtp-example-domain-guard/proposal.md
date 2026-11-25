# Proposal

## Why

Las cuentas con dominios de ejemplo reservados (`example.com`, `example.org`, `example.net`, `*.example`) no son entregables: intentar despacharlas por SMTP externo genera rebotes `Mail Delivery Subsystem` y ruido innecesario. Además, los ejemplos de OpenAPI usan `ana@example.com`, lo que invita a copiar una dirección no entregable en pruebas reales.

## What Changes

- Agregar una comprobación de dominio reservado de ejemplo antes de invocar el transporte SMTP real.
- Omitir el envío SMTP para destinatarios de dominios de ejemplo y registrar un aviso con Pino, sin fallar la operación de negocio.
- Mantener el envío normal para direcciones válidas, incluido el destinatario administrativo configurado mediante `ADMIN_NOTIFY_EMAIL` o fallback válido `SMTP_USER`.
- Aplicar la omisión también en el despacho de `notification.service.js` para que un `sendMail` inyectado no reciba destinatarios de ejemplo.
- Reemplazar los ejemplos de email en Swagger/OpenAPI por una aclaración de usar una dirección real válida.
- Agregar pruebas `node:test` para dominios de ejemplo omitidos y direcciones válidas entregadas.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `email-notifications`: nueva regla de supresión de envío SMTP a dominios de ejemplo reservados y extensión de la prohibición de direcciones de ejemplo a todos los destinatarios.
- `app-foundation`: la documentación OpenAPI no debe sugerir direcciones de ejemplo no entregables como valores de email.

## Impact

- Código: `src/services/mail.service.js`, `src/services/notification.service.js`, `src/config/swagger.js`.
- Pruebas: `test/adminNotifyEmail.test.js` y un nuevo archivo de pruebas de transporte SMTP.
- Sin cambios en endpoints, contratos HTTP, modelos ni variables de entorno.
- Sin dependencias nuevas; no es un cambio breaking.
