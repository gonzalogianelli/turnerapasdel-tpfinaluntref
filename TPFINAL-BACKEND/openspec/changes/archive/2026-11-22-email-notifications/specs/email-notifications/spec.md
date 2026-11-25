# Spec Delta

## Purpose

Define la entrega de correos transaccionales ante eventos del dominio del complejo, con destinatarios por rol, contenido sin secretos y un comportamiento tolerante a fallos que nunca bloquea operaciones ni el arranque del servidor.

## ADDED Requirements

### Requirement: Arranque sin configuración SMTP
El sistema SHALL iniciar correctamente aunque falten o estén incompletas las variables SMTP, y SHALL deshabilitar el envío de correos sin interrumpir ningún flujo de negocio.

#### Scenario: Variables SMTP ausentes
- **WHEN** faltan variables SMTP al iniciar el servidor
- **THEN** el servidor inicia y las solicitudes HTTP se atienden normalmente

#### Scenario: Configuración SMTP incompleta
- **WHEN** la configuración SMTP está incompleta
- **THEN** el sistema registra un aviso y no intenta establecer conexión

### Requirement: Envío desacoplado de operaciones
El sistema SHALL despachar los correos después de que la operación de negocio haya quedado persistida y NO SHALL modificar respuestas HTTP, estados ni transacciones cuando el envío falle.

#### Scenario: Fallo de entrega tras confirmar una reserva
- **WHEN** el proveedor de correo rechaza un envío después de confirmar una reserva
- **THEN** la respuesta sigue siendo la misma y la reserva permanece confirmada

#### Scenario: Entrega correcta
- **WHEN** un correo se entrega correctamente
- **THEN** la respuesta HTTP no incorpora campos ni códigos nuevos

### Requirement: Destinatarios de las notificaciones
El sistema SHALL enviar cada aviso al jugador afectado y a todos los usuarios con rol `administrador`, sin fallar cuando no exista ningún administrador.

#### Scenario: Evento vinculado a un jugador
- **WHEN** ocurre un evento vinculado a un jugador
- **THEN** el correo se dirige a ese jugador y a los administradores registrados

#### Scenario: Sin administradores registrados
- **WHEN** no hay usuarios con rol administrador
- **THEN** el aviso se envía solo al jugador afectado y la operación continúa

#### Scenario: Evento con varios jugadores afectados
- **WHEN** un evento afecta a varios jugadores
- **THEN** cada jugador afectado recibe su aviso y los administradores reciben el aviso del evento

### Requirement: Confirmación de registro
El sistema SHALL enviar un correo de confirmación al usuario recién creado cuando se registre por `POST /api/auth/register` o cuando un administrador lo dé de alta.

#### Scenario: Registro público
- **WHEN** se crea un jugador desde el registro público
- **THEN** recibe un correo de confirmación con sus datos públicos

#### Scenario: Alta por administrador
- **WHEN** un administrador crea un jugador
- **THEN** el nuevo usuario recibe el mismo correo de confirmación

#### Scenario: Fallo del correo de confirmación
- **WHEN** el correo de confirmación no puede entregarse
- **THEN** el usuario queda creado y la operación responde igual

### Requirement: Aviso de solicitud de reserva
El sistema SHALL enviar un aviso cuando se crea una solicitud de reserva, informando cancha, fecha y hora, cupos ocupados y cupos faltantes al jugador solicitante y a los administradores.

#### Scenario: Solicitud válida
- **WHEN** un jugador solicita un turno disponible
- **THEN** se envía el aviso de solicitud con los datos del turno y de la reserva

#### Scenario: Solicitud rechazada por validación
- **WHEN** la solicitud es rechazada por validación
- **THEN** no se envía ningún aviso de solicitud

### Requirement: Avisos de decisión sobre reservas
El sistema SHALL enviar un aviso al confirmar, rechazar o cancelar una reserva, indicando el estado resultante y si el turno permanece reservado, vuelve a disponible o queda cancelado.

#### Scenario: Reserva confirmada
- **WHEN** un administrador confirma una reserva
- **THEN** el jugador y los administradores reciben el aviso con el turno reservado

#### Scenario: Reserva rechazada
- **WHEN** un administrador rechaza una reserva
- **THEN** los destinatarios reciben el aviso indicando que el turno volvió a disponible

#### Scenario: Reserva cancelada
- **WHEN** un administrador cancela una reserva
- **THEN** los destinatarios reciben el aviso indicando que el turno quedó cancelado y no se republicó automáticamente

### Requirement: Aviso de inscripción a partido
El sistema SHALL enviar un aviso cuando un jugador se inscribe en un partido, informando categoría, fecha y hora del turno y lugares ocupados y faltantes.

#### Scenario: Inscripción válida
- **WHEN** un jugador ocupa un lugar en un partido
- **THEN** el jugador inscripto y los administradores reciben el aviso con el estado actualizado

#### Scenario: Inscripción rechazada
- **WHEN** la inscripción falla por cupo, categoría o turno inactivo
- **THEN** no se envía ningún aviso de inscripción

### Requirement: Aviso de baja de partido
El sistema SHALL enviar un aviso cuando un jugador se da de baja o es retirado de un partido, indicando que el turno no se republica automáticamente.

#### Scenario: Baja propia
- **WHEN** un jugador se da de baja de su inscripción
- **THEN** el jugador y los administradores reciben el aviso de baja

#### Scenario: Baja dispuesta por administrador
- **WHEN** un administrador retira a otro jugador
- **THEN** el jugador afectado y los administradores reciben el aviso de baja

#### Scenario: Inscripción inexistente
- **WHEN** el jugador indicado no tenía inscripción
- **THEN** no se envía ningún aviso de baja

### Requirement: Aviso de cancelación por quórum
El sistema SHALL enviar un aviso a los jugadores que estaban inscriptos y a los administradores cuando se cancela un partido por falta de quórum, aun cuando las inscripciones ya se desvincularon.

#### Scenario: Cancelación de partido incompleto
- **WHEN** un administrador cancela un partido incompleto
- **THEN** cada inscripto recibe el aviso de cancelación y los administradores reciben el aviso del evento

#### Scenario: Intento sobre partido completo
- **WHEN** un administrador intenta cancelar por quórum un partido completo
- **THEN** no se envía ningún aviso de cancelación por quórum

### Requirement: Contenido sin secretos
El sistema SHALL excluir de todos los correos contraseñas, hashes, tokens JWT, credenciales SMTP y cualquier otro secreto de configuración.

#### Scenario: Confirmación de registro sin credenciales
- **WHEN** se envía el correo de confirmación de registro
- **THEN** el mensaje no contiene la contraseña ni su hash

#### Scenario: Avisos sin secretos
- **WHEN** se envía cualquier aviso de reserva o partido
- **THEN** el mensaje no contiene tokens ni credenciales SMTP
