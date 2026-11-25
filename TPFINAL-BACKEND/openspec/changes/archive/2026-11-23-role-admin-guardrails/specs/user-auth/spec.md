# Spec Delta: user-auth

## MODIFIED Requirements

### Requirement: Registro público de jugadores
El sistema SHALL permitir el autorregistro público con `nombre`, `email`, `password`, `categoria`, `posicionHabitual`, `manoDominante`, `sexo` y `telefono`, creando siempre un usuario con rol `jugador` y sin exigir verificación de correo para operar. El campo `rol` NO SHALL ser aceptado en el cuerpo de esta operación.

#### Scenario: Registro exitoso
- **WHEN** una persona envía todos los campos obligatorios válidos a `POST /api/auth/register`
- **THEN** el sistema responde `201`, crea el usuario con rol `jugador` y devuelve sus datos sin la contraseña

#### Scenario: Intento de crear un administrador desde el registro público
- **WHEN** el cuerpo del registro incluye `rol: "administrador"` o cualquier otro valor de `rol`
- **THEN** el sistema responde `400` con un error JSON legible, no crea el usuario y el rol no se modifica

#### Scenario: Email ya registrado
- **WHEN** se registra un `email` que ya pertenece a otro usuario
- **THEN** el sistema responde `409` con un error JSON legible y no crea un segundo usuario

#### Scenario: Datos obligatorios ausentes o inválidos
- **WHEN** falta un campo obligatorio o un valor no pertenece a su conjunto permitido
- **THEN** el sistema responde `400` con un error JSON que describe el problema y no crea el usuario
