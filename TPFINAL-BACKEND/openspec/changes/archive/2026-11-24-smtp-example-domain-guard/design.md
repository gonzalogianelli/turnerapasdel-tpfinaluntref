# Design

## Context

`notification.service.js` normaliza destinatarios y llama a `sendEmail` por cada uno; `mail.service.js` envía mediante el transporter de Nodemailer cuando SMTP está configurado. Hoy cualquier email con formato válido llega al transporte, incluidos dominios de ejemplo reservados que nunca son entregables. La documentación OpenAPI expone `ana@example.com` en los esquemas de email.

## Goals / Non-Goals

**Goals:**
- Centralizar la detección de dominios de ejemplo reservados en la capa de correo.
- Evitar cualquier llamada al transporte SMTP para esos destinatarios, tanto en envío directo como en notificaciones con transporte inyectado.
- Preservar el envío a direcciones válidas y al destinatario administrativo configurado.
- Dejar constancia observable en logs estructurados sin exponer secretos.
- Eliminar ejemplos de email no entregables de OpenAPI.

**Non-Goals:**
- Rechazar dominios de ejemplo en registro, alta de usuarios ni validación de payloads.
- Cambiar la resolución de `ADMIN_NOTIFY_EMAIL`/`SMTP_USER` ni agregar variables de entorno.
- Reescribir ejemplos de README ni modificar endpoints HTTP.
- Agregar dependencias ni migraciones de base de datos.

## Decisions

1. **Helper único en `mail.service.js`.** Exportar una función pura que reciba un email y devuelva si su dominio es reservado. Se consideran reservados `example.com`, `example.org`, `example.net`, cualquier subdominio de esos dominios y cualquier dominio terminado en `.example` (por ejemplo `club.example`). La comparación normaliza mayúsculas, espacios y punto final.
   - Alternativa: repetir la comprobación en cada servicio. Se descarta por duplicación y riesgo de divergencia.

2. **Filtrado por destinatario antes de `transporter.sendMail`.** `sendEmail` conserva el tipo de `message.to` (string o array) y solo envía a los destinatarios no reservados. Si no queda ninguno, no crea ni invoca el transporte, registra un aviso con Pino y devuelve `{ delivered: false, reason: 'example-domain' }`.
   - Alternativa: lanzar un `AppError`. Se descarta porque las notificaciones son desacopladas y no deben alterar la operación de negocio.

3. **Filtrado adicional en `notification.service.js`.** `dispatchEvent` omite destinatarios reservados antes de invocar el `sendMail` inyectado, registra un aviso con el evento y la cantidad omitida, y solo cuenta como enviados los entregables.
   - Alternativa: filtrar únicamente en `mail.service.js`. Se descarta porque los tests y futuros transportes inyectados podrían intentar el envío.

4. **OpenAPI sin valores de email copiables.** Quitar `example: 'ana@example.com'` de los esquemas de email y reemplazarlo por una descripción que indique usar una dirección real válida.
   - Alternativa: usar otro dominio ficticio. Se descarta porque cualquier dominio no entregable puede provocar el mismo rebote si se copia.

5. **Pruebas con transporte espía.** Agregar un test que pase un transporter falso a `sendEmail` y verifique que `sendMail` no se llama para dominios reservados, sí se llama para direcciones válidas y solo recibe los válidos en listas mixtas. Actualizar los tests de notificaciones que afirman entrega para usar dominios no reservados (`*.test`) con transporte inyectado.

## Risks / Trade-offs

- [Usuarios con emails `@example.com` no recibirán avisos] → Se registra un aviso estructurado; el comportamiento es intencional y evita rebotes.
- [Dominios `.test`, `.invalid` o `localhost` podrían seguir intentándose] → No están en la lista acordada; quedarían para un cambio futuro si se observa ruido.
- [Filtrar en dos capas puede parecer redundante] → Es defensivo: cubre envío directo y transportes inyectados; ambos usan el mismo helper.
- [Cambiar ejemplos de OpenAPI puede romper tests que buscan el valor anterior] → Se actualizan las aserciones de OpenAPI en la misma change.

## Migration Plan

Sin migración de esquema ni datos. Desplegar el código y verificar con `npm test`. Rollback: revertir el commit de la change; no hay efectos persistidos.

## Open Questions

Ninguna.
