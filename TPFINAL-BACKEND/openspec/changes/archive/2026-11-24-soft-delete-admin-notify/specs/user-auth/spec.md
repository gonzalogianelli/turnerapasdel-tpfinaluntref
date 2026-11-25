# Spec Delta: user-auth

## ADDED Requirements

### Requirement: Inicio de sesión de usuario dado de baja
El sistema SHALL rechazar con `401` el inicio de sesión de un usuario que tenga `deletedAt` no nulo, usando el mismo mensaje genérico de credenciales inválidas.

#### Scenario: Login con cuenta bajada
- **WHEN** un usuario dado de baja envía su email y contraseña correctos a `POST /api/auth/login`
- **THEN** el sistema responde `401` con el mensaje genérico de credenciales inválidas y no emite cookie

#### Scenario: Login de otro usuario con el mismo email
- **WHEN** existe una cuenta bajada con ese email y otra cuenta vigente con distinto email
- **THEN** solo la cuenta vigente puede iniciar sesión

### Requirement: Sesión de usuario dado de baja
El sistema SHALL rechazar con `401` cualquier solicitud protegida cuyo JWT corresponda a un usuario dado de baja lógicamente.

#### Scenario: Cookie válida de usuario bajado
- **WHEN** un cliente envía una cookie con un JWT firmado y vigente de un usuario dado de baja
- **THEN** el sistema responde `401` y no procesa la operación

#### Scenario: Endpoint protegido posterior
- **WHEN** un usuario es dado de baja mientras conserva una cookie válida en el cliente
- **THEN** su próxima solicitud a un endpoint protegido responde `401`

### Requirement: Email reservado tras baja lógica
El sistema SHALL responder `409` cuando el registro público o el alta por administrador intenten usar el email de un usuario dado de baja.

#### Scenario: Registro público con email bajado
- **WHEN** una persona intenta registrarse con el email de una cuenta dada de baja
- **THEN** el sistema responde `409` y no crea el usuario

#### Scenario: Alta administrativa con email bajado
- **WHEN** un administrador intenta crear un usuario con el email de una cuenta dada de baja
- **THEN** el sistema responde `409` y no crea el usuario
