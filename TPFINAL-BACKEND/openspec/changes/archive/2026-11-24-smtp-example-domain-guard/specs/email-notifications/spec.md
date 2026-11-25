# Spec Delta: email-notifications

## MODIFIED Requirements

### Requirement: Prohibición de direcciones de ejemplo
El sistema NO SHALL usar `admin@example.com` ni ninguna otra dirección de ejemplo como destinatario, fallback o valor por defecto para avisos administrativos. Para efectos de envío, los dominios `example.com`, `example.org`, `example.net` y cualquier dominio terminado en `.example` SHALL considerarse dominios de ejemplo reservados.

#### Scenario: Configuración sin destinatario administrativo
- **WHEN** no se configura `ADMIN_NOTIFY_EMAIL` ni un `SMTP_USER` válido
- **THEN** el sistema no envía aviso administrativo y no sustituye el destinatario por una dirección de ejemplo

#### Scenario: Documentación y ejemplos
- **WHEN** se consultan `.env.example`, README o ejemplos de configuración
- **THEN** no contienen `admin@example.com` como valor sugerido para notificaciones administrativas

#### Scenario: Dominio de ejemplo en el destinatario configurado
- **WHEN** `ADMIN_NOTIFY_EMAIL` o el fallback `SMTP_USER` contiene una dirección en un dominio de ejemplo reservado
- **THEN** el sistema no la usa como destinatario real y continúa la operación

## ADDED Requirements

### Requirement: Supresión de envío SMTP a dominios de ejemplo reservados
El sistema SHALL omitir el envío SMTP real cuando el destinatario pertenezca a `example.com`, `example.org`, `example.net` o cualquier dominio terminado en `.example`, registrando un aviso estructurado y devolviendo un resultado sin entrega. El sistema SHALL seguir enviando a destinatarios de otros dominios, incluido el destinatario administrativo configurado válido.

#### Scenario: Destinatario en example.com omitido
- **WHEN** una notificación tiene como destinatario `jugador@example.com`
- **THEN** el sistema no invoca el transporte SMTP para ese destinatario y registra un aviso de omisión

#### Scenario: Dominio terminado en .example omitido
- **WHEN** una notificación tiene como destinatario `jugador@club.example`
- **THEN** el sistema no invoca el transporte SMTP y no produce un rebote externo

#### Scenario: Destinatarios mixtos
- **WHEN** una notificación incluye un destinatario en dominio de ejemplo reservado y otro con dominio válido
- **THEN** el sistema omite solo el destinatario de ejemplo y envía el correo al destinatario válido

#### Scenario: Destinatario administrativo real
- **WHEN** `ADMIN_NOTIFY_EMAIL` contiene una dirección válida fuera de los dominios de ejemplo reservados
- **THEN** el sistema envía el aviso administrativo con normalidad

#### Scenario: Sin destinatarios entregables
- **WHEN** todos los destinatarios de una notificación pertenecen a dominios de ejemplo reservados
- **THEN** el sistema no invoca el transporte SMTP, devuelve un resultado sin entrega y la operación de negocio continúa
