# Spec Delta

## Purpose

El cliente web debe ofrecer un acceso claro y seguro para jugadores y personal del complejo, con sesión persistente, permisos visibles por rol, errores comprensibles y una identidad visual azul reconocible.

## ADDED Requirements

### Requirement: Acceso inicial y persistencia de sesión
El cliente web SHALL mostrar directamente la pantalla de inicio de sesión cuando no existe una sesión válida, y SHALL conservar la sesión del usuario mientras navega o recarga la página hasta que cierre sesión o la cookie expire.

#### Scenario: Apertura sin sesión
- **WHEN** una persona abre la aplicación sin cookie de sesión válida
- **THEN** la aplicación muestra `/login` directamente sin pasar primero por una pantalla protegida

#### Scenario: Recarga con sesión de administrador
- **WHEN** un administrador con sesión válida recarga la página o navega a otra ruta
- **THEN** la aplicación mantiene su identidad, rol `administrador` y acceso a las rutas de gestión

#### Scenario: Expiración de sesión
- **WHEN** una petición autenticada responde `401` por sesión vencida
- **THEN** la aplicación limpia el estado de usuario y muestra `/login` con un mensaje de sesión vencida

### Requirement: Permisos por rol en la interfaz
El cliente web SHALL derivar todos los accesos y controles de gestión del campo `rol` devuelto por el backend: `administrador` para dueño y empleados, `jugador` para el resto.

#### Scenario: Administrador accede a gestión
- **WHEN** un usuario con rol `administrador` inicia sesión
- **THEN** ve navegación y rutas para usuarios, canchas, turnos, reservas y partidos

#### Scenario: Jugador sin controles de gestión
- **WHEN** un usuario con rol `jugador` inicia sesión
- **THEN** no ve navegación ni botones para usuarios, canchas ni administración de reservas, y una ruta protegida intentada responde `403` en backend

#### Scenario: Empleado como administrador
- **WHEN** un empleado sembrado con rol `administrador` inicia sesión
- **THEN** la aplicación le otorga los mismos accesos de gestión que al dueño

### Requirement: Formulario de acceso sin precarga
El cliente web SHALL presentar el formulario de inicio de sesión con correo y contraseña vacíos, sin botones ni secciones de autocompletado, prueba rápida o credenciales precargadas.

#### Scenario: Estado inicial del login
- **WHEN** se abre la pantalla de inicio de sesión
- **THEN** los campos Correo electrónico y Contraseña están vacíos y no aparece ninguna cuenta sugerida

#### Scenario: Sin credenciales en otras vistas
- **WHEN** se revisan todas las vistas del cliente web
- **THEN** no aparecen textos “Prueba rápida”, “Autocompletar” ni pares email/contraseña listos para copiar

#### Scenario: Visibilidad de contraseña
- **WHEN** un usuario activa el control de ojo junto al campo Contraseña
- **THEN** el texto ingresado pasa de oculto a visible, y al desactivarlo vuelve a oculto sin borrar el valor

### Requirement: Mensajes de error de acceso reales
El cliente web SHALL distinguir entre credenciales inválidas y sesión vencida, mostrando mensajes accionables y conservando la causa real devuelta por el backend.

#### Scenario: Credenciales incorrectas
- **WHEN** un usuario envía correo y contraseña incorrectos en `/login`
- **THEN** la aplicación muestra “Correo o contraseña incorrectos. Verificá los datos e intentá nuevamente.” y no atribuye el fallo a una sesión vencida

#### Scenario: Sesión vencida durante la navegación
- **WHEN** una petición protegida responde `401` con mensaje de sesión inválida o expirada
- **THEN** la aplicación muestra “Tu sesión venció. Ingresá nuevamente para continuar.”

#### Scenario: Error de permisos
- **WHEN** una petición responde `403`
- **THEN** la aplicación muestra un mensaje de permisos insuficientes acorde a la operación intentada

### Requirement: Identidad visual azul propia
El cliente web SHALL usar una identidad visual basada en azul profundo, azul cancha de acento, superficies marcadas y tipografía clara, reemplazando por completo la paleta verde/lima anterior y evitando una apariencia de plantilla genérica.

#### Scenario: Paleta aplicada
- **WHEN** se abre cualquier pantalla del cliente web
- **THEN** los colores principal y de acento son azules y no aparecen tokens ni elementos verdes o lima heredados

#### Scenario: Jerarquía visual
- **WHEN** se comparan login, dashboard y listados
- **THEN** comparten tipografía, espaciado, bordes y motif de cancha azul que las identifican como parte del mismo producto

### Requirement: Liberación de solicitud pendiente por el jugador
El cliente web SHALL permitir que un jugador cancele solo sus propias reservas `pendientes` y SHALL informar que esa acción libera el turno para otros jugadores.

#### Scenario: Botón disponible solo para pendiente propia
- **WHEN** un jugador consulta sus reservas
- **THEN** solo ve la acción “Cancelar solicitud” en las reservas `pendientes` creadas por él

#### Scenario: Confirmación de liberación
- **WHEN** un jugador confirma la cancelación de una solicitud pendiente
- **THEN** el cuadro de confirmación indica que el turno volverá a estar disponible y no menciona republicación manual

#### Scenario: Resultado visible
- **WHEN** la cancelación pendiente termina correctamente
- **THEN** la reserva se muestra como `cancelada` y el turno aparece nuevamente en el listado de turnos disponibles

#### Scenario: Reserva confirmada no liberable
- **WHEN** un jugador visualiza una reserva `confirmada`
- **THEN** no ve acción para cancelarla ni liberarla, porque esa decisión pertenece al administrador
