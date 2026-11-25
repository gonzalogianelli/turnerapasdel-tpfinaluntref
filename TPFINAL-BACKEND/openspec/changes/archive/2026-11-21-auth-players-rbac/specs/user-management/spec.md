# Spec Delta

## Purpose

Permite a cada usuario consultar y actualizar su propio perfil, y al administrador consultar, crear y editar usuarios del complejo, aplicando control de acceso por rol y sin exponer datos sensibles.

## ADDED Requirements

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
El sistema SHALL permitir que un administrador actualice los datos de cualquier usuario mediante `PATCH /api/users/:id`, incluido su `rol`, validando los campos y sin devolver la contraseña.

#### Scenario: Actualización válida por el administrador
- **WHEN** un administrador envía cambios válidos a `PATCH /api/users/:id`
- **THEN** el sistema responde `200` con los datos actualizados y sin el campo `password`

#### Scenario: Cambio de rol por el administrador
- **WHEN** un administrador envía `rol: "administrador"` o `rol: "jugador"` en `PATCH /api/users/:id`
- **THEN** el sistema persiste el nuevo rol y responde `200`

#### Scenario: Usuario inexistente en la edición
- **WHEN** un administrador intenta editar un identificador que no existe
- **THEN** el sistema responde `404`

#### Scenario: Datos inválidos en la edición
- **WHEN** el cuerpo incluye un valor fuera de los conjuntos permitidos
- **THEN** el sistema responde `400` y no aplica cambios

### Requirement: Control de acceso por rol en la gestión de usuarios
El sistema SHALL restringir el listado, la consulta por identificador, el alta y la edición de usuarios al rol `administrador`, y NO SHALL permitir que un `jugador` acceda a datos de otros usuarios.

#### Scenario: Jugador intenta acceder a la gestión de usuarios
- **WHEN** un usuario autenticado con rol `jugador` solicita cualquier endpoint de gestión de usuarios
- **THEN** el sistema responde `403`

#### Scenario: Administrador accede a la gestión de usuarios
- **WHEN** un usuario autenticado con rol `administrador` solicita un endpoint de gestión de usuarios
- **THEN** el sistema permite procesar la solicitud según las demás reglas

#### Scenario: Solicitud sin sesión a la gestión de usuarios
- **WHEN** una solicitud a un endpoint de gestión de usuarios no incluye una cookie de sesión válida
- **THEN** el sistema responde `401`
