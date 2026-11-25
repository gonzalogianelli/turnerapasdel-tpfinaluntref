# user-auth Specification

## Purpose

Permite que una persona se registre como jugador, inicie y cierre sesión con credenciales seguras, y que el sistema identifique al usuario autenticado en cada solicitud mediante un JWT almacenado en una cookie HTTPOnly.

## Requirements

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

### Requirement: Validación de datos de usuario
El sistema SHALL validar `email` con formato válido y único, `password` de al menos 8 caracteres, `categoria` dentro de `octava`, `séptima`, `sexta`, `quinta`, `cuarta`, `tercera`, `segunda`, `primera`, `posicionHabitual` en `revés` o `drive`, `manoDominante` en `zurdo` o `diestro`, `sexo` en `masculino` o `femenino`, y `telefono` y `nombre` no vacíos.

#### Scenario: Categoría fuera del conjunto permitido
- **WHEN** se envía una `categoria` distinta de las ocho categorías definidas
- **THEN** el sistema rechaza la solicitud con `400`

#### Scenario: Sexo fuera del conjunto permitido
- **WHEN** se envía un `sexo` distinto de `masculino` o `femenino`
- **THEN** el sistema rechaza la solicitud con `400`

#### Scenario: Contraseña demasiado corta
- **WHEN** se envía un `password` con menos de 8 caracteres
- **THEN** el sistema rechaza la solicitud con `400` y no persiste el usuario

### Requirement: Almacenamiento seguro de contraseñas
El sistema SHALL almacenar únicamente un hash de la contraseña generado con `bcryptjs` y NO SHALL incluir la contraseña ni su hash en ninguna respuesta de la API.

#### Scenario: Contraseña hasheada al persistir
- **WHEN** se registra o crea un usuario con contraseña
- **THEN** el valor almacenado es un hash distinto de la contraseña original

#### Scenario: Contraseña excluida de las respuestas
- **WHEN** cualquier endpoint devuelve datos de un usuario
- **THEN** la respuesta no contiene los campos `password` ni su hash

### Requirement: Inicio de sesión con JWT en cookie HTTPOnly
El sistema SHALL validar `email` y `password` en `POST /api/auth/login` y, si son correctos, emitir un JWT firmado con `{ id, rol }` enviado en una cookie HTTPOnly; NO SHALL devolver el token en el cuerpo de la respuesta.

#### Scenario: Credenciales válidas
- **WHEN** un usuario existente envía su `email` y `password` correctos
- **THEN** el sistema responde `200`, establece la cookie HTTPOnly con el JWT y devuelve los datos públicos del usuario sin el token

#### Scenario: Contraseña incorrecta
- **WHEN** el `password` no coincide con el hash almacenado
- **THEN** el sistema responde `401` con un mensaje genérico de credenciales inválidas

#### Scenario: Email no registrado
- **WHEN** el `email` no corresponde a ningún usuario
- **THEN** el sistema responde `401` con el mismo mensaje genérico de credenciales inválidas

### Requirement: Cierre de sesión
El sistema SHALL exponer `POST /api/auth/logout` para eliminar la cookie de sesión del cliente.

#### Scenario: Logout limpia la cookie
- **WHEN** un cliente autenticado solicita `POST /api/auth/logout`
- **THEN** el sistema responde `200` y la cookie de sesión deja de estar presente en el cliente

#### Scenario: Acceso posterior al logout
- **WHEN** un cliente que cerró sesión intenta acceder a un endpoint protegido
- **THEN** el sistema responde `401`

### Requirement: Verificación de sesión autenticada
El sistema SHALL leer la cookie HTTPOnly, verificar la firma y vigencia del JWT y adjuntar la identidad del usuario a la solicitud en los endpoints protegidos, rechazando con `401` cuando la cookie falta, es inválida o está vencida.

#### Scenario: Cookie ausente
- **WHEN** una solicitud a un endpoint protegido no incluye la cookie de sesión
- **THEN** el sistema responde `401`

#### Scenario: Token inválido o vencido
- **WHEN** la cookie contiene un JWT con firma inválida o expirado
- **THEN** el sistema responde `401` y no procesa la operación

#### Scenario: Token válido
- **WHEN** la cookie contiene un JWT válido de un usuario existente
- **THEN** el sistema identifica al usuario y permite procesar la solicitud

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
