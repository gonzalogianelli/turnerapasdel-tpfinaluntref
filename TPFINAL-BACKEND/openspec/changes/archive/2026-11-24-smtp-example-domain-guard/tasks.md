# Tasks

## 1. Guard SMTP central

- [x] 1.1 Implementar el helper exportado `isReservedExampleRecipient` en `src/services/mail.service.js` con normalización de mayúsculas, espacios y punto final, y dominios reservados `example.com`, `example.org`, `example.net`, subdominios y cualquier dominio terminado en `.example`; verificado por `test/mailExampleDomain.test.js`.
- [x] 1.2 Filtrar destinatarios en `sendEmail` antes de `transporter.sendMail`, preservando el tipo de `message.to` (string o array) y devolviendo `{ delivered: false, reason: 'example-domain' }` sin invocar transporte cuando no haya entregables; verificado con transporter falso en `test/mailExampleDomain.test.js`.
- [x] 1.3 Registrar un aviso estructurado sin secretos al omitir destinatarios reservados; verificado por aserción de log en `test/mailExampleDomain.test.js`.

## 2. Notificaciones

- [x] 2.1 Omitir destinatarios reservados en `src/services/notification.service.js` antes de invocar el `sendMail` inyectado y contar solo entregables como enviados; verificado por test de notificación con transporte inyectado que afirma cero llamadas para `@example.com`.
- [x] 2.2 Actualizar los correos de aserciones de entrega en `test/adminNotifyEmail.test.js` a dominios no reservados (`*.test`), manteniendo el destinatario administrativo configurado válido; verificado con `npm test`.

## 3. Documentación OpenAPI

- [x] 3.1 Reemplazar `example: 'ana@example.com'` en `src/config/swagger.js` por una descripción que indique usar una dirección real válida; verificado por aserción sobre `/api-docs.json` que no contiene `ana@example.com` ni dominios `example.com`, `example.org` o `example.net` en esquemas de email.

## 4. Verificación integral

- [x] 4.1 Ejecutar `npm test` y verificar que la suite completa quede verde.
- [x] 4.2 Ejecutar `openspec validate "smtp-example-domain-guard" --strict` y verificar que pase sin errores.
- [x] 4.3 Ejecutar `git diff --check` y verificar que no haya errores de whitespace.

## Workflow follow-up

- No commitear ni pushear salvo pedido explícito del usuario.
- Archivar el change recién después de la revisión/aprobación correspondiente.
