# Sistema de Gestión de Complejo de Pádel — Backend

API REST para un complejo de pádel. Estado actual: base del backend (Módulo 0), autenticación/roles/usuarios (Módulo 1), gestión de canchas, turnos de 90 minutos y reservas (Módulo 2), partidos incompletos (Módulo 3) y notificaciones por correo (Módulo 4).

## Stack

- Node.js con JavaScript puro y módulos **ESM** (`import` / `export`).
- **Express 5**.
- **MySQL** mediante `mysql2` y **Sequelize** (compatible con MySQL Workbench).
- Autenticación con **JWT** en cookie **HTTPOnly** y contraseñas hasheadas con **bcryptjs**.
- Seguridad y observabilidad: `helmet`, `cors` con credenciales, `cookie-parser`, `pino` y `pino-http`.
- Documentación OpenAPI con `swagger-jsdoc` + `swagger-ui-express`.
- Correos transaccionales con `nodemailer` sobre SMTP configurable.
- Variables de entorno con `dotenv`.

## Requisitos

- Node.js 18 o superior.
- MySQL en ejecución y un esquema creado (por defecto `sistema_padel`).

## Instalación

```bash
npm install
```

## Variables de entorno

Copiar `.env.example` a `.env` y completar los valores:

```bash
cp .env.example .env
```

| Variable | Descripción | Requerida |
| --- | --- | --- |
| `PORT` | Puerto HTTP del servidor | No (default `3000`) |
| `NODE_ENV` | Entorno (`development`, `production`, `test`) | No (default `development`) |
| `DB_HOST` | Host de MySQL | Sí |
| `DB_PORT` | Puerto de MySQL | No (default `3306`) |
| `DB_NAME` | Nombre del esquema | Sí |
| `DB_USER` | Usuario de MySQL | Sí |
| `DB_PASSWORD` | Contraseña de MySQL | No (puede ser vacía en local) |
| `JWT_SECRET` | Secreto para firmar JWT | **Sí** |
| `JWT_EXPIRES_IN` | Vigencia del JWT | No (default `1d`) |
| `COOKIE_NAME` | Nombre de la cookie HTTPOnly | No (default `padel_token`) |
| `COOKIE_SAME_SITE` | Política SameSite de la cookie | No (default `lax`) |
| `CLIENT_URL` | Origen permitido por CORS | No (default `http://localhost:5173`) |
| `TRUST_PROXY` | Confía en `X-Forwarded-For` detrás de proxy (`false`/`0` o `true`/`1`) | No (default `false`) |
| `ADMIN_NOTIFY_EMAIL` | Destinatario administrativo de avisos; si está vacío se usa `SMTP_USER` solo cuando es un email válido | No |
| `SMTP_HOST` | Host del servidor SMTP | No (si falta, el correo queda deshabilitado) |
| `SMTP_PORT` | Puerto SMTP | No (default `587`) |
| `SMTP_SECURE` | `true` para SMTPS; `false` para STARTTLS | No (default `false`) |
| `SMTP_USER` | Usuario SMTP | No |
| `SMTP_PASS` | Contraseña SMTP | No |
| `SMTP_FROM` | Remitente de los correos | No (si falta, el correo queda deshabilitado) |

> `.env` está ignorado por Git. Nunca se deben versionar secretos reales. Si `JWT_SECRET` falta, el arranque falla con `Falta la variable de entorno requerida: JWT_SECRET`.

## Arranque

Modo desarrollo (reinicio automático):

```bash
npm run dev
```

Modo producción:

```bash
npm start
```

El servidor valida la configuración, se conecta a MySQL, sincroniza los modelos (creando las tablas `usuarios`, `canchas`, `turnos`, `reservas`, `partidos` e `inscripciones` si no existen) y recién entonces escucha en `PORT`. Si la conexión inicial a MySQL o la sincronización fallan, el proceso termina con código 1. Las variables SMTP incompletas no impiden el arranque: se registra un aviso y el envío de correos queda deshabilitado, sin ejecutar `verify()` contra el proveedor.

## Carga inicial de cuentas

Con el `.env` configurado y MySQL disponible, ejecutar:

```bash
npm run seed
```

El comando es **idempotente**: busca por email (usuarios) y por nombre (canchas) con `paranoid: false`, crea lo que falta, actualiza los campos sembrados de las cuentas vigentes sin cambiar sus contraseñas, omite lo que ya coincide y restaura con las credenciales documentadas las cuentas sembradas que estén dadas de baja. No envía correos, no requiere SMTP configurado y siembra únicamente nueve usuarios y dos canchas: no crea turnos ni reservas. Las canchas adicionales creadas por el administrador no se eliminan ni limitan.

Todas las cuentas usan el dominio reservado `padel.example`, cubierto por el guard de correos de ejemplo, por lo que no generan envíos SMTP reales.

| Rol | Nombre | Email | Contraseña |
| --- | --- | --- | --- |
| `administrador` (dueño) | Gonzalo Gianelli | `dueno@padel.example` | `Dueno123!` |
| `administrador` (empleado) | Camila Rodríguez | `empleado1@padel.example` | `Empleado123!` |
| `administrador` (empleado) | Martín Ferreyra | `empleado2@padel.example` | `Empleado456!` |
| `jugador` | Lucía Fernández | `jugador1@padel.example` | `Jugador123!` |
| `jugador` | Nicolás Aguirre | `jugador2@padel.example` | `Jugador456!` |
| `jugador` | Valeria Gómez | `jugador3@padel.example` | `Jugador789!` |
| `jugador` | Facundo Martínez | `jugador4@padel.example` | `Jugador101!` |
| `jugador` | Sofía Castillo | `jugador5@padel.example` | `Jugador202!` |
| `jugador` | Tomás Beltrán | `jugador6@padel.example` | `Jugador303!` |

Las dos canchas iniciales son `Cancha 1 — Central` y `Cancha 2 — Blindex`. El administrador puede crear más canchas con `POST /api/canchas` y dar de baja cualquier cancha sin turnos activos con `DELETE /api/canchas/:id`; no hay un tope artificial de canchas.

Los empleados se crean con rol `administrador`; no existe el rol `empleado`. El registro público sigue sin aceptar `rol` y siempre crea `jugador`.

```bash
curl -i -c cookies.txt -H "Content-Type: application/json" \
  -d '{"email":"dueno@padel.example","password":"Dueno123!"}' \
  http://localhost:3000/api/auth/login
```

## Verificación del estado

```bash
curl http://localhost:3000/api/health
```

- MySQL disponible:

```json
{
  "status": "ok",
  "server": "up",
  "database": "up",
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

- MySQL no disponible (HTTP `503`):

```json
{
  "status": "degraded",
  "server": "up",
  "database": "down",
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

El endpoint no requiere autenticación y no aplica ningún límite de peticiones.

## Documentación interactiva (Swagger)

- Interfaz: `http://localhost:3000/api-docs` (redirige a `/api-docs/`).
- Documento OpenAPI: `http://localhost:3000/api-docs.json`.

```bash
curl -i http://localhost:3000/api-docs.json
```

Ambas rutas son públicas. El documento declara el esquema de seguridad `cookieAuth` (`apiKey` en cookie, con el nombre configurado en `COOKIE_NAME`, por defecto `padel_token`), los tags `Usuarios`, `Canchas`, `Turnos`, `Reservas` y `Partidos`, y describe los parámetros de ruta/consulta y las respuestas de todos los endpoints.

## Modelo de usuario

Tabla `usuarios`, creada por `sequelize.sync()` al iniciar. Restricciones y valores permitidos:

| Campo | Tipo / regla |
| --- | --- |
| `id` | INTEGER, PK, autoincremental |
| `nombre` | STRING, obligatorio |
| `email` | STRING, obligatorio, único, con formato de email; se normaliza a minúsculas |
| `password` | STRING, obligatorio; se almacena como hash `bcryptjs` (salt 10) y **nunca** se devuelve en la API |
| `categoria` | ENUM: `octava`, `séptima`, `sexta`, `quinta`, `cuarta`, `tercera`, `segunda`, `primera` |
| `posicionHabitual` | ENUM: `revés`, `drive` |
| `manoDominante` | ENUM: `zurdo`, `diestro` |
| `sexo` | ENUM: `masculino`, `femenino` |
| `telefono` | STRING, obligatorio |
| `rol` | ENUM: `administrador`, `jugador` (default `jugador`) |
| `createdAt` / `updatedAt` | Timestamps de Sequelize |

La contraseña se excluye por defecto de las consultas (`defaultScope`) y de la serialización JSON. `password` debe tener al menos 8 caracteres.

**Roles.** Solo existen `jugador` y `administrador`. El rol `administrador` representa al dueño o empleado del complejo y es el único con acceso a la gestión de usuarios. El registro público no acepta el campo `rol`: enviarlo con cualquier valor responde `400` y no crea el usuario. `POST /api/users` (protegido) es la vía para crear administradores. No se puede degradar al último `administrador`: `PATCH /api/users/:id` responde `409` y conserva el rol si no quedaría ninguno, incluso ante cambios concurrentes.

## Autenticación y cookie de sesión

- `POST /api/auth/register` es público y **siempre** crea un usuario con rol `jugador`; el body no debe incluir `rol` y hacerlo responde `400`.
- `POST /api/auth/login` valida credenciales y emite un JWT con `{ id, rol }`.
- El JWT se envía únicamente en una cookie HTTPOnly (`padel_token` por defecto), con `SameSite` configurable, `Secure` en producción y `Path=/`. **No se devuelve el token en el body**.
- El cliente debe conservar y reenviar la cookie (los `curl` de abajo usan `-c`/`-b`). CORS está configurado con `credentials: true`.
- `POST /api/auth/logout` limpia la cookie. No hay revocación del JWT en servidor: sigue vigente hasta `JWT_EXPIRES_IN` si se copiara fuera de la cookie.

### Endpoints

| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | Público | Alta pública de jugador; responde `201` y deja la sesión iniciada |
| `POST` | `/api/auth/login` | Público | Inicia sesión; responde `200` y establece la cookie |
| `POST` | `/api/auth/logout` | Público | Limpia la cookie; responde `200` |
| `GET` | `/api/users/me` | Cookie | Devuelve el perfil propio; `401` sin sesión |
| `PATCH` | `/api/users/me` | Cookie | Edita el perfil propio; rechaza `rol` con `400` |
| `GET` | `/api/users` | Administrador | Lista con filtros `rol`, `categoria`, `search`, `page`, `limit` |
| `POST` | `/api/users` | Administrador | Crea usuario; permite asignar `rol` |
| `GET` | `/api/users/:id` | Administrador | Consulta por id de ruta; `400` si no es entero positivo, `404` si no existe |
| `PATCH` | `/api/users/:id` | Administrador | Edita usuario y permite cambiar `rol`; `409` si se degrade al último administrador |
| `DELETE` | `/api/users/:id` | Administrador | Baja lógica del usuario; conserva la fila con `deletedAt` y la oculta de listados y detalles |

La baja de usuarios rechaza al último `administrador` y a quienes tengan reservas o inscripciones activas; devuelve `409` en esos casos. Un usuario dado de baja no puede iniciar sesión, su cookie deja de ser válida y su email sigue reservado. Un `jugador` recibe `403` en los endpoints de gestión; una solicitud sin cookie recibe `401`.

Respuestas: éxito `{ "status": "success", "data": ... }`; los listados agregan `meta: { "page", "limit", "total" }`. Error: `{ "status": "error", "message": "..." }` con códigos `400`, `401`, `403`, `404`, `409` o `500`.

## Verificación rápida

Con el servidor levantado, definí las cuentas reales a usar y un email aún no registrado:

```bash
: "${ADMIN_EMAIL:?Definí ADMIN_EMAIL con el email de un administrador existente}"
: "${PLAYER_EMAIL:?Definí PLAYER_EMAIL con el email de un jugador existente}"

curl -i -c cookies.txt -H "Content-Type: application/json" -d '{"nombre":"Ana Perez","email":"ana.perez@example.com","password":"secreto123","categoria":"sexta","posicionHabitual":"drive","manoDominante":"diestro","sexo":"femenino","telefono":"1123456789"}' http://localhost:3000/api/auth/register

curl -i -b cookies.txt http://localhost:3000/api/users/me

curl -i -X PATCH -b cookies.txt -H "Content-Type: application/json" -d '{"nombre":"Ana Perezactual"}' http://localhost:3000/api/users/me

curl -i http://localhost:3000/api-docs.json
```

El registro y el login devuelven un header `Set-Cookie: padel_token=...; HttpOnly; Path=/; SameSite=Lax` y un body sin `password` ni token. Si el email ya existe, el registro responde `409`; usá otro email.

Para los endpoints de administración, iniciá sesión con un administrador y reutilizá su cookie:

```bash
curl -i -c admin-cookies.txt -H "Content-Type: application/json" -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"secreto123\"}" http://localhost:3000/api/auth/login

curl -i -b admin-cookies.txt "http://localhost:3000/api/users?rol=jugador&page=1&limit=10"

curl -i -b admin-cookies.txt http://localhost:3000/api/users/<id>

curl -i -b admin-cookies.txt -H "Content-Type: application/json" -d '{"nombre":"Nuevo Jugador","email":"nuevo@example.com","password":"secreto123","categoria":"octava","posicionHabitual":"drive","manoDominante":"diestro","sexo":"masculino","telefono":"1133333333","rol":"jugador"}' http://localhost:3000/api/users

curl -i -X PATCH -b admin-cookies.txt -H "Content-Type: application/json" -d '{"rol":"administrador"}' http://localhost:3000/api/users/<id>
```

Reemplazá `<id>` por un id devuelto por el listado. Para verificar en MySQL Workbench, revisá la tabla `usuarios`: el campo `password` debe contener un hash que empieza con `$2`, nunca el texto original.

## Módulo 2: canchas, turnos y reservas

Los modelos nuevos se crean con `sequelize.sync()` al iniciar y se asocian en `src/models/index.js`:

| Tabla | Campos principales | Reglas |
| --- | --- | --- |
| `canchas` | `id`, `nombre`, `bloqueada` | `nombre` no vacío; `bloqueada` default `false` |
| `turnos` | `id`, `canchaId`, `fechaHoraInicio`, `fechaHoraFin`, `estado` | Duración fija de 90 minutos; estados `disponible`, `reservado`, `cancelado`, `jugado`, `bloqueado` |
| `reservas` | `id`, `turnoId`, `usuarioId`, `estado`, `cupoMaximo`, `cuposOcupados` | `cupoMaximo = 4`; `cuposOcupados` entre 1 y 4; estados `pendiente`, `confirmada`, `rechazada`, `cancelada` |

Las respuestas de reserva informan además `lugaresOcupados`, `lugaresFaltantes` y `esCompleta`. `Reserva.cuposOcupados` se conserva como dato histórico agregado; desde el Módulo 3 las inscripciones individuales se gestionan en la tabla `inscripciones` del partido asociado.

### Endpoints

| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| `GET` | `/api/canchas` | Cookie | Lista canchas con filtros `nombre`, `bloqueada`, `page`, `limit` (por defecto excluye bloqueadas) |
| `POST` | `/api/canchas` | Administrador | Crea cancha |
| `GET` | `/api/canchas/:id` | Cookie | Consulta por id de ruta |
| `PATCH` | `/api/canchas/:id` | Administrador | Edita nombre o bloqueo |
| `DELETE` | `/api/canchas/:id` | Administrador | Baja lógica; `409` si tiene turnos `disponible`, `reservado` o `bloqueado` |
| `GET` | `/api/turnos` | Cookie | Lista turnos con filtros `fecha`, `canchaId`, `estado`, `page`, `limit`; el jugador siempre ve solo `disponible` |
| `POST` | `/api/turnos` | Administrador | Carga manual de turno de 90 minutos desde `canchaId` y `fechaHoraInicio` |
| `GET` | `/api/turnos/:id` | Cookie | Consulta por id de ruta |
| `PATCH` | `/api/turnos/:id` | Administrador | Cambia fecha/estado, bloquea, cancela, marca `jugado` o republica desde `cancelado` |
| `DELETE` | `/api/turnos/:id` | Administrador | Baja lógica sin cambiar `estado`; `409` si tiene reservas `pendiente` o `confirmada` |
| `GET` | `/api/reservas` | Cookie | Jugador ve solo las suyas; administrador ve todas. Filtros `estado`, `turnoId`, `fecha`, `page`, `limit` |
| `POST` | `/api/reservas` | Jugador | Solicita turno indicando `turnoId` y `cuposOcupados`; el turno pasa a `reservado` |
| `GET` | `/api/reservas/:id` | Cookie | Consulta por id de ruta; reserva ajena da `404` para jugador |
| `PATCH` | `/api/reservas/:id` | Administrador | Actualiza `cuposOcupados` |
| `PATCH` | `/api/reservas/:id/confirmar` | Administrador | `pendiente` → `confirmada`; el turno sigue `reservado` |
| `PATCH` | `/api/reservas/:id/rechazar` | Administrador | `pendiente` → `rechazada`; el turno vuelve a `disponible` |
| `PATCH` | `/api/reservas/:id/cancelar` | Administrador o jugador titular | Administrador: `confirmada` → `cancelada`, turno `cancelado` y republicación manual. Jugador: solo su `pendiente` → `cancelada`, turno `disponible` |
| `DELETE` | `/api/reservas/:id` | Administrador | Baja lógica solo de reservas `rechazada`/`cancelada` sin partido vigente; no cambia el turno |

### Reglas de reserva y cupos

- Una sola solicitud `pendiente`/`confirmada` por turno. La creación usa una transacción con `Transaction.LOCK.UPDATE` sobre el turno: una de dos solicitudes concurrentes responde `201` y la otra `409`.
- Solapar turnos activos (`disponible`, `reservado`, `bloqueado`) de una misma cancha responde `409`. Se comparan intervalos semiabiertos `[inicio, fin)`.
- Un turno no se ofrece en el listado de disponibles cuando está `reservado`, `bloqueado`, `cancelado` o `jugado`, ni cuando su cancha está bloqueada.
- Rechazar devuelve el turno a `disponible`; cancelar por administrador no. Para republicar, el administrador ejecuta `PATCH /api/turnos/:id` con `{"estado":"disponible"}` sobre un turno cancelado.
- Un jugador puede liberar su propia reserva `pendiente` con `PATCH /api/reservas/:id/cancelar`: la reserva pasa a `cancelada` y el turno vuelve a `disponible` en la misma transacción, sin intervención del administrador. Si la reserva ya está `confirmada`, recibe `409`; solo el administrador puede cancelarla.
- No se bloquea un turno con reserva `pendiente`/`confirmada`: primero debe cancelarse o liberarse la reserva.
- Las escrituras de reservas por parte de un jugador devuelven `403`; las consultas sin cookie devuelven `401`.

### Flujo completo con curl

Los ejemplos usan `$ADMIN_EMAIL` y `$PLAYER_EMAIL`, definidos antes con cuentas reales de tu base, y la contraseña de prueba `secreto123`. No se incluyen secretos de entorno ni direcciones de administrador hardcodeadas.

```bash
curl -s -c admin-cookies.txt -H "Content-Type: application/json" -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"secreto123\"}" http://localhost:3000/api/auth/login

curl -s -c jugador-cookies.txt -H "Content-Type: application/json" -d "{\"email\":\"$PLAYER_EMAIL\",\"password\":\"secreto123\"}" http://localhost:3000/api/auth/login

FECHA=$(node -e "process.stdout.write(new Date(Date.now() + 7*24*60*60*1000).toISOString())")

CANCHA_ID=$(curl -s -b admin-cookies.txt -H "Content-Type: application/json" -d '{"nombre":"Cancha 1"}' http://localhost:3000/api/canchas | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>process.stdout.write(String(JSON.parse(s).data.id)))")

TURNO_ID=$(curl -s -b admin-cookies.txt -H "Content-Type: application/json" -d "{\"canchaId\":$CANCHA_ID,\"fechaHoraInicio\":\"$FECHA\"}" http://localhost:3000/api/turnos | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>process.stdout.write(String(JSON.parse(s).data.id)))")

curl -s -b jugador-cookies.txt "http://localhost:3000/api/turnos?canchaId=$CANCHA_ID"

RESERVA_ID=$(curl -s -b jugador-cookies.txt -H "Content-Type: application/json" -d "{\"turnoId\":$TURNO_ID,\"cuposOcupados\":2}" http://localhost:3000/api/reservas | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>process.stdout.write(String(JSON.parse(s).data.id)))")

curl -s -b admin-cookies.txt -X PATCH -H "Content-Type: application/json" -d '{"cuposOcupados":4}' "http://localhost:3000/api/reservas/$RESERVA_ID"

curl -s -b admin-cookies.txt -X PATCH "http://localhost:3000/api/reservas/$RESERVA_ID/confirmar"

curl -s -b admin-cookies.txt -X PATCH "http://localhost:3000/api/reservas/$RESERVA_ID/cancelar"

curl -s -b jugador-cookies.txt "http://localhost:3000/api/turnos?canchaId=$CANCHA_ID"

curl -s -b admin-cookies.txt -X PATCH -H "Content-Type: application/json" -d '{"estado":"disponible"}' "http://localhost:3000/api/turnos/$TURNO_ID"

curl -s -b jugador-cookies.txt "http://localhost:3000/api/turnos?canchaId=$CANCHA_ID"
```

El primer listado de turnos incluye el turno nuevo; luego de la cancelación no lo incluye; después de la republicación vuelve a incluirlo. Cada transición exitosa dispara su aviso por correo según el Módulo 4.

## Módulo 3: partidos incompletos

El administrador crea un `Partido` sobre una reserva confirmada. Los jugadores consultan huecos y se inscriben; las bajas y la cancelación por falta de quórum nunca republican el turno automáticamente.

| Tabla | Campos principales | Reglas |
| --- | --- | --- |
| `partidos` | `id`, `reservaId`, `categoria`, `estado` | `reservaId` único; un solo partido por reserva; estados `incompleto`, `completo`, `cancelado`, `jugado` |
| `inscripciones` | `id`, `partidoId`, `usuarioId` | Única compuesta `(partidoId, usuarioId)`; máximo 4 filas por partido |

`cupoMaximo` es siempre 4. `lugaresOcupados` es la cantidad real de inscripciones y `lugaresFaltantes = 4 - lugaresOcupados`. Un partido pasa a `completo` al alcanzar 4 inscriptos.

### Reglas de categoría, cupo y concurrencia

- Categorías válidas: `octava`, `séptima`, `sexta`, `quinta`, `cuarta`, `tercera`, `segunda`, `primera` (la misma que en `usuarios`).
- Un jugador puede inscribirse si la diferencia absoluta entre el índice de su categoría y el de la categoría del partido es como máximo **1** (por ejemplo, en `octava` entran `octava` y `séptima`; en `sexta` entran `sexta`, `quinta` y `séptima`).
- El turno asociado debe estar `reservado`. El alta rechaza reservas no confirmadas o duplicadas con `409`.
- La inscripción usa `sequelize.transaction()` con `Transaction.LOCK.UPDATE` sobre el partido: ante dos inscripciones simultáneas al último lugar, una responde `201` y la otra `409`.
- Cambiar `categoria` revalida a todos los inscriptos; si alguno queda fuera de rango, responde `409`. Solo un partido `completo` puede cerrarse como `jugado`.
- Dar de baja un inscripto no modifica el turno. El administrador puede bajar cualquier inscripción; un jugador solo la propia (`403` si intenta borrar otra). La fila queda con `deletedAt` y no se puede reinscribir: un intento responde `409`.
- Cancelar por quórum marca las inscripciones con `deletedAt`, deja de contarlas como lugares ocupados y marca `partido`, `reserva` y `turno` como `cancelados`. El turno no reaparece en `GET /api/turnos` hasta una republicación manual del administrador.
- `Reserva.cuposOcupados` queda como dato histórico: no se sincroniza con el nuevo listado de inscriptos.

### Endpoints

| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| `GET` | `/api/partidos` | Cookie | Lista con filtros `categoria`, `estado`, `fecha`, `page`, `limit`; el jugador solo ve `incompleto` |
| `POST` | `/api/partidos` | Administrador | Alta sobre `reservaId` confirmada y turno `reservado` |
| `GET` | `/api/partidos/:id` | Cookie | Detalle con inscriptos y huecos; jugador ve el suyo aunque esté completo, `404` si es ajeno |
| `PATCH` | `/api/partidos/:id` | Administrador | Cambia `categoria` o cierra a `jugado` (solo si está `completo`) |
| `POST` | `/api/partidos/:id/inscripciones` | Jugador | Inscripción al hueco con bloqueo transaccional |
| `DELETE` | `/api/partidos/:id/inscripciones/:usuarioId` | Jugador titular o administrador | Baja lógica de la inscripción; `409` en partidos terminales o reinscripción histórica |
| `PATCH` | `/api/partidos/:id/cancelar` | Administrador | Cancelación por falta de quórum; `409` si está `completo` |
| `DELETE` | `/api/partidos/:id` | Administrador | Baja lógica de partidos `jugado`/`cancelado` sin inscripciones vigentes |

### Flujo completo con curl

```bash
curl -s -c admin-cookies.txt -H "Content-Type: application/json" -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"secreto123\"}" http://localhost:3000/api/auth/login

curl -s -c jugador-cookies.txt -H "Content-Type: application/json" -d "{\"email\":\"$PLAYER_EMAIL\",\"password\":\"secreto123\"}" http://localhost:3000/api/auth/login

J2_EMAIL="sexta-$(date +%s)@example.com"
curl -s -b admin-cookies.txt -H "Content-Type: application/json" -d "{\"nombre\":\"Jugador Ejemplo\",\"email\":\"$J2_EMAIL\",\"password\":\"secreto123\",\"categoria\":\"quinta\",\"posicionHabitual\":\"drive\",\"manoDominante\":\"diestro\",\"sexo\":\"masculino\",\"telefono\":\"1144444444\",\"rol\":\"jugador\"}" http://localhost:3000/api/users
curl -s -c jugador2-cookies.txt -H "Content-Type: application/json" -d "{\"email\":\"$J2_EMAIL\",\"password\":\"secreto123\"}" http://localhost:3000/api/auth/login

CANCHA_ID=$(curl -s -b admin-cookies.txt -H "Content-Type: application/json" -d '{"nombre":"Cancha Partido 1"}' http://localhost:3000/api/canchas | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>process.stdout.write(String(JSON.parse(s).data.id)))")
FECHA=$(node -e "process.stdout.write(new Date(Date.now() + 8*24*60*60*1000).toISOString())")
TURNO_ID=$(curl -s -b admin-cookies.txt -H "Content-Type: application/json" -d "{\"canchaId\":$CANCHA_ID,\"fechaHoraInicio\":\"$FECHA\"}" http://localhost:3000/api/turnos | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>process.stdout.write(String(JSON.parse(s).data.id)))")

RESERVA_ID=$(curl -s -b jugador-cookies.txt -H "Content-Type: application/json" -d "{\"turnoId\":$TURNO_ID,\"cuposOcupados\":1}" http://localhost:3000/api/reservas | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>process.stdout.write(String(JSON.parse(s).data.id)))")
curl -s -b admin-cookies.txt -X PATCH "http://localhost:3000/api/reservas/$RESERVA_ID/confirmar"

PARTIDO_ID=$(curl -s -b admin-cookies.txt -H "Content-Type: application/json" -d "{\"reservaId\":$RESERVA_ID,\"categoria\":\"sexta\"}" http://localhost:3000/api/partidos | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>process.stdout.write(String(JSON.parse(s).data.id)))")

curl -s -b jugador-cookies.txt "http://localhost:3000/api/partidos?categoria=sexta&estado=incompleto"
curl -s -b jugador-cookies.txt "http://localhost:3000/api/partidos/$PARTIDO_ID"

curl -s -b jugador-cookies.txt -X POST "http://localhost:3000/api/partidos/$PARTIDO_ID/inscripciones"
curl -s -b jugador2-cookies.txt -X POST "http://localhost:3000/api/partidos/$PARTIDO_ID/inscripciones"
curl -s -b jugador2-cookies.txt -X DELETE "http://localhost:3000/api/partidos/$PARTIDO_ID/inscripciones/$(curl -s -b jugador2-cookies.txt http://localhost:3000/api/users/me | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>process.stdout.write(String(JSON.parse(s).data.id)))")"

curl -s -b admin-cookies.txt -X PATCH "http://localhost:3000/api/partidos/$PARTIDO_ID/cancelar"
curl -s -b jugador-cookies.txt "http://localhost:3000/api/turnos?canchaId=$CANCHA_ID"
```

El detalle del partido informa `lugaresOcupados`/`lugaresFaltantes` en cada paso. Después de la cancelación, `partidos`, `reservas` y `turnos` quedan con estado `cancelado`/`cancelada` y el turno no aparece en el último listado.

## Módulo 4: notificaciones por correo

Los eventos de negocio exitosos envían correos transaccionales con `nodemailer`. No se agregaron endpoints: los avisos son efectos colaterales de las operaciones ya documentadas. Cada mensaje se arma con plantillas propias (`subject`, `text`, `html`), escapa valores interpolados y nunca incluye passwords, hashes, JWT ni credenciales SMTP.

| Evento | Operación que lo dispara | Destinatarios |
| --- | --- | --- |
| Confirmación de registro | `POST /api/auth/register` o `POST /api/users` | Usuario creado y destinatario administrativo configurado |
| Solicitud de reserva | `POST /api/reservas` | Jugador solicitante y destinatario administrativo configurado |
| Confirmación, rechazo, cancelación o liberación de reserva | `PATCH /api/reservas/:id/confirmar`, `/rechazar` o `/cancelar` | Jugador titular y destinatario administrativo configurado |
| Inscripción a partido | `POST /api/partidos/:id/inscripciones` | Jugador inscripto y destinatario administrativo configurado |
| Baja de partido | `DELETE /api/partidos/:id/inscripciones/:usuarioId` | Jugador afectado y destinatario administrativo configurado |
| Cancelación por quórum | `PATCH /api/partidos/:id/cancelar` | Inscriptos previos y destinatario administrativo configurado |

En `/cancelar`, el aviso de cancelación administrativa indica que el turno quedó cancelado y requiere republicación manual. Cuando el jugador libera una solicitud pendiente, el mismo evento indica que la reserva fue cancelada por el jugador y que el turno volvió a `disponible`, sin mencionar republicación manual.

El envío se despacha después de confirmar la transacción y sin `await` en el camino de la request. Si SMTP falla o no está configurado, se registra un aviso con Pino (evento, cantidad de destinatarios y mensaje de error) y la respuesta HTTP, los estados y las transacciones no cambian. No hay reintentos ni historial persistente.

Modo sin SMTP: dejar `SMTP_HOST` o `SMTP_FROM` vacíos. El servidor inicia normalmente, `/api/health` responde `200` y los eventos omiten el envío. El destinatario administrativo se resuelve desde `ADMIN_NOTIFY_EMAIL`, con fallback a `SMTP_USER` solo si es un email válido; si no hay ninguno, el aviso llega solo al jugador involucrado y la operación continúa. No se consulta la DB para resolverlo y no se usan direcciones de ejemplo. Los jugadores dados de baja conservan su email como destinatario histórico de eventos ya confirmados.

## Baja lógica, historial y unicidad

Todas las bajas son lógicas: marcan `deletedAt` en la fila, no la eliminan y la ocultan de listados y detalles (`404`). Un identificador de ruta no entero positivo responde `400`. Ninguna baja cambia el `estado` del turno ni lo devuelve a `disponible`.

| DELETE | Acceso | Baja permitida | `409` cuando |
| --- | --- | --- | --- |
| `/api/users/:id` | Administrador | Cualquier jugador o administrador que no sea el último | Es el último administrador, o tiene reservas/inscripciones activas |
| `/api/canchas/:id` | Administrador | Sin turnos vigentes | Tiene turnos `disponible`, `reservado` o `bloqueado` |
| `/api/turnos/:id` | Administrador | Sin reservas vigentes | Tiene reservas `pendiente` o `confirmada` |
| `/api/reservas/:id` | Administrador | `rechazada` o `cancelada` | Es `pendiente`/`confirmada` o tiene partido `incompleto`/`completo` |
| `/api/partidos/:id` | Administrador | `jugado` o `cancelado` | Es `incompleto`/`completo` o tiene inscripciones vigentes |
| `/api/partidos/:id/inscripciones/:usuarioId` | Jugador titular o administrador | Partido `incompleto` o `completo` | Partido `jugado`/`cancelado`, inscripción inexistente o baja de un tercero (`403`) |

La unicidad también respeta el historial: el email de un usuario dado de baja sigue reservado para registro público y alta administrativa, y un jugador dado de baja de un partido no puede reinscribirse (`409`). Las consultas de unicidad usan `paranoid: false`; las operaciones normales siguen ocultando las filas bajadas.

El destinatario administrativo de los avisos se configura con `ADMIN_NOTIFY_EMAIL` (o `SMTP_USER` válido como fallback). Si no hay valor válido, se omite ese envío sin fallar la operación.

## Estructura

```
src/
├── app.js                    # Definición de la app Express (sin abrir puerto)
├── server.js                 # Punto de entrada: MySQL, sync de modelos, listen y apagado ordenado
├── config/
│   ├── env.js                # Carga y validación de variables de entorno
│   ├── database.js           # Instancia Sequelize y health de la base
│   ├── logger.js             # Logger Pino
│   └── swagger.js            # Documento OpenAPI y esquema cookieAuth
├── controllers/
│   ├── health.controller.js
│   ├── auth.controller.js
│   ├── user.controller.js
│   ├── cancha.controller.js
│   ├── turno.controller.js
│   ├── reserva.controller.js
│   └── partido.controller.js
├── middlewares/
│   ├── notFound.js           # 404 JSON
│   ├── errorHandler.js       # Manejo global de errores
│   └── auth.js               # authenticate y requireRole
├── models/
│   ├── index.js              # initModels(), asociaciones y sequelize.sync()
│   ├── User.js               # Modelo Usuario (tabla usuarios)
│   ├── Cancha.js             # Modelo Cancha (tabla canchas)
│   ├── Turno.js              # Modelo Turno (tabla turnos)
│   ├── Reserva.js            # Modelo Reserva (tabla reservas)
│   ├── Partido.js            # Modelo Partido (tabla partidos)
│   └── Inscripcion.js        # Modelo Inscripcion (tabla inscripciones)
├── routes/
│   ├── health.routes.js
│   ├── auth.routes.js
│   ├── user.routes.js
│   ├── cancha.routes.js
│   ├── turno.routes.js
│   ├── reserva.routes.js
│   └── partido.routes.js
├── services/
│   ├── auth.service.js
│   ├── user.service.js
│   ├── cancha.service.js
│   ├── turno.service.js
│   ├── reserva.service.js
│   ├── partido.service.js
│   ├── mail.service.js
│   └── notification.service.js
├── templates/
│   └── email/
│       └── index.js        # Plantillas de correo con escape HTML
└── utils/
    ├── AppError.js           # Error de aplicación con statusCode
    ├── asyncHandler.js       # Wrapper para controladores async
    ├── userValidation.js     # Enums, validación de payloads y parseo de query
    ├── canchaValidation.js
    ├── turnoValidation.js
    ├── reservaValidation.js
    └── partidoValidation.js
```

## Manejo de errores

Los errores de negocio se lanzan con `AppError(message, statusCode)` y se responden como `{ "status": "error", "message": "..." }`. Los errores inesperados devuelven HTTP `500` con un mensaje genérico (sin detalles internos en producción) y se registran con Pino.

## Apagado

`SIGINT` (Ctrl+C) y `SIGTERM` cierran el servidor HTTP y luego la conexión Sequelize antes de finalizar el proceso.
