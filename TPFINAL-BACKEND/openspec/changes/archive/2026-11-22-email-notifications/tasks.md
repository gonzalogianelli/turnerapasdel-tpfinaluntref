# Tasks

## 1. Infraestructura de correo y plantillas

- [x] 1.1 Crear el módulo de transporte SMTP desde `config.smtp` sin `verify()` ni conexión obligatoria al arrancar; verificar que `GET /api/health` responde `200` con `SMTP_HOST` y `SMTP_FROM` ausentes y que el log registra el aviso de correos deshabilitados.
- [x] 1.2 Crear las plantillas de los eventos de registro, reservas y partidos con `subject`, `text` y `html`, escapando valores interpolados; verificar con un script Node que todas renderizan sin incluir passwords, hashes, JWT ni credenciales SMTP.
- [x] 1.3 Crear el servicio de notificaciones que resuelve administradores desde DB, combina al jugador afectado, deduplica emails y nunca rechaza hacia el llamador; verificar con un transporte falso que un evento con administrador duplicado entrega un solo mensaje y que con SMTP deshabilitado no entrega ninguno.
- [x] 1.4 Documentar en `README.md` las variables `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` y `SMTP_FROM`, la matriz de eventos y el modo sin SMTP; verificar que la tabla existe y que no aparece ningún valor real de credenciales.

## 2. Notificación de registro de usuarios

- [x] 2.1 Invocar la notificación de confirmación al finalizar `registerUser` y `createUser` sin `await` y sin alterar el valor devuelto; verificar que `POST /api/auth/register` y `POST /api/users` conservan sus status/body y que el transporte falso recibe el correo del nuevo jugador.
- [x] 2.2 Actualizar las descripciones Swagger de `POST /api/auth/register` y `POST /api/users` para indicar el correo de confirmación; verificar que `/api-docs.json` incluye ambos textos y no contiene secretos.

## 3. Notificaciones de reservas

- [x] 3.1 Enviar el aviso de solicitud al resolver `crearReserva`, incluyendo cancha, fecha/hora, cupos ocupados y faltantes; verificar con transporte falso que solo una solicitud `201` genera correo y que una solicitud `409` no lo genera.
- [x] 3.2 Enviar los avisos de confirmación, rechazo y cancelación al resolver `confirmarReserva`, `rechazarReserva` y `cancelarReserva`, indicando el estado resultante del turno; verificar que los estados `reservado`, `disponible` y `cancelado` siguen siendo los definidos en la spec y que cada transición genera su correo.
- [x] 3.3 Actualizar las descripciones Swagger de los endpoints de reservas para declarar los avisos enviados; verificar que `/api-docs.json` conserva los cinco paths de reservas sin nuevos parámetros ni códigos de respuesta.

## 4. Notificaciones de partidos incompletos

- [x] 4.1 Enviar el aviso de inscripción al resolver `inscribirJugador` con categoría, fecha/hora y lugares ocupados/faltantes; verificar que una inscripción `201` notifica al jugador y administradores, mientras que un intento `409` no envía correo.
- [x] 4.2 Enviar el aviso de baja al resolver `darDeBaja` para baja propia y retiro por administrador; verificar que ambos casos `200` notifican al jugador afectado y que los casos `403`/`404` no envían correo.
- [x] 4.3 Capturar los inscriptos antes de `Inscripcion.destroy` en `cancelarPorQuorum` y notificarlos junto a los administradores después del commit; verificar que las inscripciones quedan borradas, partido y turno quedan `cancelado`, el cuerpo HTTP es idéntico y todos los inscriptos previos reciben el aviso.
- [x] 4.4 Actualizar las descripciones Swagger de los endpoints de partidos para declarar inscripción, baja y cancelación por quórum; verificar que `/api-docs.json` mantiene los cinco paths de partidos sin cambiar respuestas.

## 5. Verificación integrada y cierre

- [x] 5.1 Ejecutar `node --check` sobre todos los archivos `.js` de `src/` y una pasada curl con SMTP deshabilitado sobre `/api/health`, `/api/users/me`, `/api/canchas`, `/api/turnos`, `/api/reservas`, `/api/partidos` y `/api-docs.json`; verificar 200 en todos y ausencia de errores inesperados en logs.
- [x] 5.2 Verificar con un transporte que falla que registro, solicitud/confirmación/rechazo/cancelación de reservas e inscripción/baja/cancelación por quórum mantienen sus status y estados, y registran warnings con Pino sin exponer secretos.
- [x] 5.3 Ejecutar `openspec validate "email-notifications" --strict` y `openspec status --change "email-notifications"`; verificar que el cambio es válido y que todos los artefactos de planificación figuran completos antes de solicitar aprobación para apply.

## Workflow follow-up

- Esperar la revisión y aprobación explícita de `proposal.md`, `specs/`, `design.md` y `tasks.md` antes de iniciar la implementación.
- Al cerrar el módulo, archivar el cambio y sincronizar las specs main, luego proponer el mensaje de commit.
