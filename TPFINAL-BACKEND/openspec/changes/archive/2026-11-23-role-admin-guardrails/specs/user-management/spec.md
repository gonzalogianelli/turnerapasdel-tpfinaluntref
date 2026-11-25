# Spec Delta: user-management

## MODIFIED Requirements

### Requirement: Edición de usuarios por el administrador
El sistema SHALL permitir que un administrador actualice los datos de cualquier usuario mediante `PATCH /api/users/:id`, incluido su `rol`, validando los campos y sin devolver la contraseña. El cambio de rol SHALL conservar al menos un usuario con rol `administrador` en el sistema.

#### Scenario: Actualización válida por el administrador
- **WHEN** un administrador envía cambios válidos a `PATCH /api/users/:id`
- **THEN** el sistema responde `200` con los datos actualizados y sin el campo `password`

#### Scenario: Cambio de rol por el administrador
- **WHEN** un administrador envía `rol: "administrador"` o `rol: "jugador"` en `PATCH /api/users/:id` sin dejar el sistema sin administradores
- **THEN** el sistema persiste el nuevo rol y responde `200`

#### Scenario: Usuario inexistente en la edición
- **WHEN** un administrador intenta editar un identificador que no existe
- **THEN** el sistema responde `404`

#### Scenario: Datos inválidos en la edición
- **WHEN** el cuerpo incluye un valor fuera de los conjuntos permitidos
- **THEN** el sistema responde `400` y no aplica cambios

#### Scenario: Intento de degradar al último administrador
- **WHEN** un administrador intenta cambiar a `jugador` al único usuario con rol `administrador`
- **THEN** el sistema responde `409`, no modifica el rol y conserva al menos un administrador

#### Scenario: Cambios concurrentes de roles
- **WHEN** dos administradores intentan degradar simultáneamente a los últimos dos administradores
- **THEN** solo se confirma la operación que conserva al menos un administrador y la otra recibe `409`

### Requirement: Control de acceso por rol en la gestión de usuarios
El sistema SHALL restringir el listado, la consulta por identificador, el alta y la edición de usuarios al rol `administrador` —que cubre a dueños y empleados del complejo—, y NO SHALL permitir que un `jugador` acceda a datos de otros usuarios.

#### Scenario: Jugador intenta acceder a la gestión de usuarios
- **WHEN** un usuario autenticado con rol `jugador` solicita cualquier endpoint de gestión de usuarios
- **THEN** el sistema responde `403`

#### Scenario: Administrador accede a la gestión de usuarios
- **WHEN** un usuario autenticado con rol `administrador` solicita un endpoint de gestión de usuarios
- **THEN** el sistema permite procesar la solicitud según las demás reglas

#### Scenario: Empleado con rol administrador gestiona usuarios
- **WHEN** un empleado del complejo autenticado con rol `administrador` crea o edita usuarios
- **THEN** el sistema permite la operación con las mismas reglas que para cualquier administrador

#### Scenario: Solicitud sin sesión a la gestión de usuarios
- **WHEN** una solicitud a un endpoint de gestión de usuarios no incluye una cookie de sesión válida
- **THEN** el sistema responde `401`
