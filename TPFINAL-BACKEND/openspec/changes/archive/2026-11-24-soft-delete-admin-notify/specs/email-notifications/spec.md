# Spec Delta: email-notifications

## MODIFIED Requirements

### Requirement: Destinatarios de las notificaciones
El sistema SHALL enviar cada aviso al jugador afectado y a un destinatario administrador resuelto desde `ADMIN_NOTIFY_EMAIL`, con fallback a `SMTP_USER` solo cuando ese valor sea un email válido. Si no hay destinatario administrador válido, el sistema SHALL omitir ese envío, continuar la operación y no usar direcciones de ejemplo ni cuentas de administrador en DB.

#### Scenario: Evento vinculado a un jugador
- **WHEN** ocurre un evento vinculado a un jugador y hay un destinatario administrador válido
- **THEN** el correo se dirige a ese jugador y al destinatario administrador configurado

#### Scenario: Sin administradores registrados
- **WHEN** no hay destinatario administrador configurado ni fallback `SMTP_USER` válido
- **THEN** el aviso se envía solo al jugador afectado y la operación continúa

#### Scenario: Evento con varios jugadores afectados
- **WHEN** un evento afecta a varios jugadores y hay destinatario administrador válido
- **THEN** cada jugador afectado recibe su aviso y el destinatario administrador recibe el aviso del evento

#### Scenario: Fallback válido a SMTP_USER
- **WHEN** `ADMIN_NOTIFY_EMAIL` está vacío y `SMTP_USER` contiene un email válido
- **THEN** el aviso administrativo se dirige a `SMTP_USER`

## ADDED Requirements

### Requirement: Prohibición de direcciones de ejemplo
El sistema NO SHALL usar `admin@example.com` ni ninguna otra dirección de ejemplo como destinatario, fallback o valor por defecto para avisos administrativos.

#### Scenario: Configuración sin destinatario administrativo
- **WHEN** no se configura `ADMIN_NOTIFY_EMAIL` ni un `SMTP_USER` válido
- **THEN** el sistema no envía aviso administrativo y no sustituye el destinatario por una dirección de ejemplo

#### Scenario: Documentación y ejemplos
- **WHEN** se consultan `.env.example`, README o ejemplos de configuración
- **THEN** no contienen `admin@example.com` como valor sugerido para notificaciones administrativas

### Requirement: Destinatarios históricos de eventos ya persistidos
El sistema SHALL poder resolver el email de un jugador afectado por un evento ya confirmado aunque ese usuario haya sido dado de baja lógicamente después del evento.

#### Scenario: Baja posterior a una cancelación
- **WHEN** un partido cancelado notifica a un jugador que después fue dado de baja lógicamente
- **THEN** el sistema conserva el destinatario histórico del evento y continúa el despacho sin fallar

#### Scenario: Usuario bajado sin evento asociado
- **WHEN** no existe ningún evento pendiente vinculado a un usuario dado de baja
- **THEN** el sistema no le envía notificaciones nuevas
