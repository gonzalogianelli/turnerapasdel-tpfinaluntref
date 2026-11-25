# user-management Specification

## Purpose

Permite a cada usuario consultar y actualizar su propio perfil, y al administrador consultar, crear y editar usuarios del complejo, aplicando control de acceso por rol y sin exponer datos sensibles.

## Requirements

### Requirement: Consulta del perfil propio
El sistema SHALL exponer `GET /api/users/me` para que un usuario autenticado consulte sus propios datos, incluidos `nombre`, `email`, `categoria`, `posicionHabitual`, `manoDominante`, `sexo`, `telefono` y `rol`, sin incluir la contraseña.

#### Scenario: Usuario autenticado consulta su perfil
- **WHEN** un usuario con sesión válida solicita `GET /api/users/me`
- **THEN** el sistema responde `200` con sus datos y sin el campo `password`

#### Scenario: Consulta sin sesión
- **WHEN** una solicitud a `GET /api/users/me` no incluye una cookie de sesión válida
- **THEN** el sistema responde `401`

### Requirement: Actualización del perfil propio
El sistema SHALL permitir que un usuario autenticado actualice sus propios datos de perfil mediante `PATCH /api/users/me`, validando los mismos campos que el alta y sin permitir modificar su `rol`.

#### Scenario: Actualización válida del perfil
- **WHEN** un usuario autenticado envía cambios válidos de `nombre`, `telefono` o preferencias de juego
- **THEN** el sistema responde `200` con los datos actualizados y sin la contraseña

#### Scenario: Intento de cambiar el propio rol
- **WHEN** el cuerpo de `PATCH /api/users/me` incluye `rol`
- **THEN** el sistema responde `400`, no modifica el rol y conserva el resto de los datos sin cambios

#### Scenario: Email ya utilizado por otro usuario
- **WHEN** un usuario intenta actualizar su `email` a uno que ya pertenece a otra cuenta
- **THEN** el sistema responde `409` y no aplica el cambio

#### Scenario: Datos inválidos en la actualización
- **WHEN** el cuerpo incluye un valor fuera de los conjuntos permitidos
- **THEN** el sistema responde `400` y no aplica cambios

### Requirement: Listado de usuarios para el administrador
El sistema SHALL exponer `GET /api/users` para que un administrador liste usuarios, aplicando filtros opcionales de `req.query`: `rol`, `categoria`, `search` y paginación con `page` y `limit`, sin devolver contraseñas.

#### Scenario: Administrador lista usuarios con filtros
- **WHEN** un administrador solicita `GET /api/users` con `rol`, `categoria` o `search` en la query
- **THEN** el sistema responde `200` con los usuarios que cumplen los filtros y sin el campo `password`

#### Scenario: Filtro por rol inválido
- **WHEN** la query incluye un `rol` distinto de `administrador` o `jugador`
- **THEN** el sistema responde `400`

#### Scenario: Paginación fuera de rango
- **WHEN** la query incluye `page` o `limit` no numéricos o menores que 1
- **THEN** el sistema responde `400`

### Requirement: Consulta de un usuario por identificador
El sistema SHALL exponer `GET /api/users/:id` para que un administrador consulte un usuario por su identificador de ruta, sin devolver la contraseña.

#### Scenario: Usuario encontrado
- **WHEN** un administrador solicita `GET /api/users/:id` con un identificador existente
- **THEN** el sistema responde `200` con los datos del usuario y sin el campo `password`

#### Scenario: Usuario inexistente
- **WHEN** un administrador solicita `GET /api/users/:id` con un identificador que no existe
- **THEN** el sistema responde `404`

#### Scenario: Identificador con formato inválido
- **WHEN** el identificador de ruta no es un entero positivo
- **THEN** el sistema responde `400`

### Requirement: Alta de usuarios por el administrador
El sistema SHALL permitir que un administrador cree usuarios mediante `POST /api/users`, pudiendo asignar el rol `administrador` o `jugador`, con la misma validación y hashing de contraseña que el registro público.

#### Scenario: Alta de un jugador
- **WHEN** un administrador crea un usuario con datos válidos y rol `jugador`
- **THEN** el sistema responde `201`, persiste el usuario y no devuelve la contraseña

#### Scenario: Alta de otro administrador
- **WHEN** un administrador crea un usuario con `rol: "administrador"`
- **THEN** el sistema responde `201` y persiste el usuario con rol `administrador`

#### Scenario: Email duplicado en el alta
- **WHEN** el administrador intenta crear un usuario con un `email` ya registrado
- **THEN** el sistema responde `409` y no crea el usuario

#### Scenario: Rol inválido en el alta
- **WHEN** el administrador envía un `rol` distinto de `administrador` o `jugador`
- **THEN** el sistema responde `400`

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

### Requirement: Baja lógica de usuarios por el administrador
El sistema SHALL exponer `DELETE /api/users/:id` para que un administrador dé de baja a un usuario, respondiendo `200` con los datos públicos del usuario y marcando su baja lógica sin borrar la fila.

#### Scenario: Baja de un jugador
- **WHEN** un administrador solicita `DELETE /api/users/:id` sobre un jugador vigente sin dependencias activas
- **THEN** el sistema responde `200`, conserva la fila con `deletedAt` no nulo y devuelve el usuario sin contraseña

#### Scenario: Usuario bajado omitido en listados
- **WHEN** un administrador consulta `GET /api/users` o `GET /api/users/:id` después de la baja
- **THEN** el usuario dado de baja no aparece en el listado y su detalle responde `404`

#### Scenario: Usuario inexistente o ya bajado
- **WHEN** el identificador de ruta no existe o ya tenía `deletedAt` no nulo
- **THEN** el sistema responde `404`

#### Scenario: Identificador inválido
- **WHEN** el identificador de ruta no es un entero positivo
- **THEN** el sistema responde `400`

### Requirement: Restricciones para baja de usuarios
El sistema SHALL rechazar con `409` la baja de usuarios que deje al sistema sin administradores vigentes o que tenga reservas pendientes/confirmadas o inscripciones activas en partidos vigentes.

#### Scenario: Intento de bajar al último administrador
- **WHEN** un administrador intenta bajar al único usuario con rol `administrador` vigente
- **THEN** el sistema responde `409`, no aplica la baja y conserva al menos un administrador vigente

#### Scenario: Baja concurrente de los últimos administradores
- **WHEN** dos administradores intentan bajar simultáneamente a los últimos dos administradores vigentes
- **THEN** solo se confirma la operación que conserva un administrador vigente y la otra recibe `409`

#### Scenario: Usuario con reserva activa
- **WHEN** se intenta bajar un usuario con una reserva `pendiente` o `confirmada` vigente
- **THEN** el sistema responde `409` y no aplica la baja

#### Scenario: Usuario con inscripción activa
- **WHEN** se intenta bajar un usuario con una inscripción vigente en un partido `incompleto` o `completo`
- **THEN** el sistema responde `409` y no aplica la baja

#### Scenario: Usuario con historial terminal
- **WHEN** se intenta bajar un usuario cuyas reservas e inscripciones son terminales o están dadas de baja
- **THEN** el sistema aplica la baja lógica y conserva el historial referenciado

### Requirement: Control de acceso para baja de usuarios
El sistema SHALL exigir una cookie de sesión válida y el rol `administrador` para `DELETE /api/users/:id`, respondiendo `401` sin sesión y `403` para un jugador autenticado.

#### Scenario: Jugador intenta bajar un usuario
- **WHEN** un usuario con rol `jugador` solicita `DELETE /api/users/:id`
- **THEN** el sistema responde `403` y no modifica al usuario

#### Scenario: Solicitud sin sesión
- **WHEN** una solicitud de baja de usuario no incluye una cookie de sesión válida
- **THEN** el sistema responde `401`

#### Scenario: Empleado con rol administrador
- **WHEN** un empleado del complejo autenticado con rol `administrador` baja un usuario permitido
- **THEN** el sistema aplica la baja con las mismas reglas que para cualquier administrador
