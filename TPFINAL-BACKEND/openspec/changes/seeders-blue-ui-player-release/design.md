# Design

## Context

El backend es ESM con Express 5, Sequelize/MySQL, JWT en cookie HTTPOnly y dos roles (`jugador`, `administrador`). El modelo `User` ya hashea contraseñas con `bcryptjs` mediante hooks, `config/env.js` exige variables DB y JWT, y el guard SMTP omite dominios `example` reservados. Hoy no existe comando de seed ni cuentas iniciales.

La cancelación de reservas está en `PATCH /api/reservas/:id/cancelar`: la ruta exige `administrador` y el servicio solo acepta reservas `confirmada`, dejando el turno en `cancelado`. El frontend React + Vite vive en el repositorio hermano `../4toset-padel-front` y queda incluido por la solicitud explícita del usuario. Usa paleta verde, componentes `QuickFill`/`QUICK_ACCOUNTS`, redirige `/` a `/dashboard`, y traduce cualquier `401` a “sesión vencida”, incluso durante login.

## Goals / Non-Goals

**Goals:**

- Cargar cuentas base de forma repetible sin duplicados ni correos reales.
- Permitir la liberación atómica de solicitudes pendientes propias sin debilitar la cancelación administrativa.
- Hacer que el cliente web respete roles, sesión, errores y mensajes del backend con una identidad azul propia.
- Cubrir cambios con tests backend, OpenAPI, build frontend y verificación manual acotada a 2 canchas.

**Non-Goals:**

- No crear rol `empleado`; los empleados se siembran como `administrador`.
- No modificar registro público: sigue forzando `jugador` y rechazando `rol` con `400`.
- No cambiar la cancelación confirmada del administrador ni republicar turnos cancelados por esa vía.
- No sembrar turnos ni reservas; solo cuentas y las dos canchas iniciales. Las canchas adicionales que cree el administrador no se eliminan ni se limitan.
- No recuperación de contraseña, torneos, ranking ni multi-complejo.
- No cambiar stack, framework ni patrón de capas del backend o frontend.

## Decisions

### 1. Seeder como script ESM con `npm run seed`

Agregar `scripts/seed.js` y el script `seed` en `package.json`. El script reutiliza `sequelize`, `connectDatabase`, `closeDatabase`, `logger` y los modelos existentes, por lo que respeta la misma configuración `.env` y el hook de hash de `User`.

La idempotencia se resuelve buscando por email con `paranoid: false`: si el usuario está vigente se actualizan sus campos sembrados sin tocar la contraseña y se omite cuando ya coinciden; si existe dado de baja se restaura con `deletedAt: null` y credenciales documentadas; si no existe se crea. Se ejecuta dentro de una transacción y se registran resúmenes por acción (`creado`, `actualizado`, `omitido`, `restaurado`). No se invoca ningún servicio de notificación.

Cuentas sembradas:

| Rol | Nombre | Email | Contraseña |
| --- | --- | --- | --- |
| administrador (dueño) | Gonzalo Gianelli | `dueno@padel.example` | `Dueno123!` |
| administrador (empleado) | Camila Rodríguez | `empleado1@padel.example` | `Empleado123!` |
| administrador (empleado) | Martín Ferreyra | `empleado2@padel.example` | `Empleado456!` |
| jugador | Lucía Fernández | `jugador1@padel.example` | `Jugador123!` |
| jugador | Nicolás Aguirre | `jugador2@padel.example` | `Jugador456!` |
| jugadora | Valeria Gómez | `jugador3@padel.example` | `Jugador789!` |
| jugador | Facundo Martínez | `jugador4@padel.example` | `Jugador101!` |
| jugadora | Sofía Castillo | `jugador5@padel.example` | `Jugador202!` |
| jugador | Tomás Beltrán | `jugador6@padel.example` | `Jugador303!` |

Categorías y datos deportivos se distribuyen entre `octava`, `séptima`, `sexta`, `quinta`, `cuarta` y `tercera`, con `posicionHabitual`, `manoDominante`, `sexo` y `telefono` válidos. El dominio `padel.example` ya está cubierto por el guard de correos de ejemplo, por lo que no genera SMTP real.

Alternativas descartadas: inserción SQL cruda (saltaría validaciones/hooks), reutilizar `POST /api/auth/register` (fuerza `jugador` y envía correo) y reutilizar `POST /api/users` (requeriría cookie y notificaría).

### 1b. Canchas iniciales del complejo

El seeder siembra dos canchas con nombres del complejo: `Cancha 1 — Central` y `Cancha 2 — Blindex`. La idempotencia usa búsqueda por `nombre` con `paranoid: false` dentro de la misma transacción: crea la que falta, restaura la que está dada de baja y omite la vigente. No hay límite de canchas: el administrador puede crear más vía `POST /api/canchas` y dar de baja las que no tengan turnos activos vía `DELETE /api/canchas/:id`, y el seeder respeta esos cambios sin borrar canchas adicionales.

Alternativa descartada: borrar todas las canchas y recrearlas en cada ejecución, porque destruiría las altas manuales y el historial.

### 2. Una sola ruta de cancelación con comportamiento por estado y rol

Mantener `PATCH /api/reservas/:id/cancelar` y ampliar su middleware a `requireRole('jugador', 'administrador')`. El servicio recibe `req.user` y decide:

- `administrador`: conserva el flujo actual sobre reserva `confirmada`; turno queda `cancelado`; requiere republicación manual.
- `jugador`: solo reserva `pendiente` propia; pasa reserva a `cancelada` y turno a `disponible`.

Los perfiles de error quedan definidos: `401` sin sesión, `403` para roles no permitidos, `404` para reserva inexistente o ajena al jugador, `409` para estado inválido, turno no `reservado` o doble cancelación. El mensaje para reserva confirmada intentada por jugador indica explícitamente que solo el administrador puede cancelarla.

La transacción bloquea reserva y turno con `Transaction.LOCK.UPDATE`, marca primero la reserva como `cancelada` y recién después actualiza el turno a `disponible`. Así la validación de “sin reservas activas” no contradice la liberación. No se crea ni modifica `Partido`.

Alternativa descartada: nuevo endpoint `/liberar`. Evita duplicar Swagger, tests y mensajes, pero hace que el mismo endpoint tenga dos semánticas; se mitiga con documentación y tests por rol/estado.

### 3. Notificación de cancelación con contexto explícito

Reutilizar el evento `reserva.cancelada`, pero pasar un contexto que distinga `estadoTurno = 'disponible'` y `motivo = 'liberada por el jugador'`. La plantilla existente sigue mostrando “no se republicó automáticamente” por defecto para cancelaciones confirmadas; ese texto se omite cuando el motivo es liberación pendiente.

Alternativa descartada: crear una plantilla nueva. Se descarta para no duplicar subject, destinatarios y lógica de safe-notify; el riesgo de estado incorrecto se cubre con test de contexto.

### 4. Cliente web: sesión, errores y roles

`api/client.js` sigue lanzando `ApiError` con `status` y `message`. Se agrega un evento interno de unauthorized que `AuthContext` escucha para limpiar usuario y redirigir a `/login`, excluyendo `/api/auth/login` y `/api/auth/register` para no confundir credenciales inválidas con expiración.

`LoginPage` traduce específicamente `401` de login a “Correo o contraseña incorrectos. Verificá los datos e intentá nuevamente.” y deja el mensaje de “sesión vencida” para peticiones protegidas. La ruta `/` pasa a `<Navigate to="/login" replace />`; el estado `loading` solo muestra carga mientras se valida la cookie.

`isAdmin` continúa siendo `user?.rol === 'administrador'`, por lo que dueño y empleados sembrados comparten accesos. Los guards de rutas y botones se refuerzan con el mismo valor, sin introducir un tercer rol.

### 5. Rediseño azul y quita de autocompletado

Los tokens verdes/lima se reemplazan por azul profundo (`#071a33`, `#0b2a4a`), azul cancha (`#2f80ed`, `#4fb3ff`) y superficies `#f4f8ff`/`#ffffff`, con bordes y sombras azuladas. Se conserva la arquitectura de componentes y se aplica un motif de líneas de cancha en login/dashboard para evitar una estética genérica.

Se eliminan `QuickFill`, `QUICK_ACCOUNTS`, la sección “Prueba rápida”, el texto de cuentas `.padel.example`, los estilos `.quick-fill` y los botones de sugerencia rápida de otras vistas. El login queda con `form = { email: '', password: '' }`, `autoComplete="off"` y un botón de ojo con `aria-label` que alterna `type="password"`/`type="text"`.

### 6. Cancelación pendiente en la UI

`ReservationsPage` agrega el botón “Cancelar solicitud” cuando `!isAdmin && reserva.estado === 'pendiente'`. Reutiliza la acción `cancelar` sobre `/api/reservas/:id/cancelar`, con texto de confirmación distinto: para el jugador indica que el turno volverá a disponible; para el administrador se mantiene el aviso de republicación manual. Tras la respuesta se recargan reservas y turnos para que el cambio sea visible en ambas vistas.

## Risks / Trade-offs

- [Seeder restaura cuentas bajadas] → Puede revivir accesos que se querían inactivos. Mitigación: solo actúa por email exacto sembrado, deja constancia en logs y no altera otros usuarios.
- [Misma ruta con dos semánticas] → Riesgo de mensajes o Swagger confusos. Mitigación: descripción actualizada, tests por rol/estado y mensajes `409` explícitos.
- [Plantilla de correo condicional] → Podría decir “disponible” en una cancelación administrativa. Mitigación: valor por defecto sigue siendo `cancelado` y la excepción se pasa solo desde la rama de jugador pendiente.
- [401 global] → Podría deslogear durante un login fallido. Mitigación: exclusión de endpoints de autenticación en el evento; test de mensaje de credenciales.
- [Cambio visual amplio] → Regresiones de responsive o contraste. Mitigación: cambiar tokens primero, revisar login/dashboard/listados y ejecutar build + smoke.
- [Tests con MySQL] → Dependencia de esquema de prueba. Mitigación: usar la misma estrategia de los tests actuales, emails `padel.example` y SMTP deshabilitado.

## Migration Plan

1. Respaldar el esquema de MySQL actual y confirmar que las tablas existen vía `sequelize.sync()` del arranque.
2. Desplegar backend con nuevo script, servicio de cancelación, Swagger y tests.
3. Ejecutar `npm run seed` una vez; verificar 9 usuarios, 2 canchas iniciales, roles y login con `dueno@padel.example`.
4. Verificar en Swagger que `PATCH /api/reservas/{id}/cancelar` documenta ambos roles y estados resultantes.
5. Desplegar frontend, ejecutar `npm run build` y revisar login, dashboard, turnos, reservas y partidos.
6. Rollback: revertir el commit de aplicación; las cuentas creadas por el seeder permanecen y pueden darse de baja manualmente desde `/api/users/:id` si se decide así, conservando historial.
