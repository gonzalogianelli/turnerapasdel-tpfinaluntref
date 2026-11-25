# Tasks

## 1. Seeder idempotente y documentado

- [x] 1.1 Crear `scripts/seed.js` en ESM y el script `npm run seed` en `package.json`, usando búsqueda por email con `paranoid: false`, creación/restauración/omisión y hash existente de `User`; verificar que una primera ejecución deja 9 usuarios con 3 `administrador` y 6 `jugador`.
- [x] 1.2 Definir las 9 cuentas con emails `padel.example`, credenciales y datos deportivos de la tabla de `design.md`; verificar que el listado de `README.md` coincide exactamente con el script y que ningún email usa dominios reales.
- [x] 1.3 Evitar envío de correos desde el seeder y verificar con `npm test` y ejecución local sin SMTP que no se invoca ningún servicio de notificación ni se intenta conexión SMTP.
- [x] 1.4 Agregar tests en `test/seed.test.js` para primera ejecución, segunda ejecución sin duplicados, cuenta vigente sin cambio de contraseña, cuenta bajada restaurada y roles de empleados; verificar `npm test` en verde.
- [x] 1.5 Documentar en `README.md` el comando, las credenciales, la idempotencia y el dominio reservado; verificar con un login manual que `dueno@padel.example` responde `200`, devuelve rol `administrador` y setea la cookie `padel_token` HTTPOnly.

## 1b. Nombres reales y canchas iniciales en el seeder

- [x] 1b.1 Reemplazar los nueve `nombre` genéricos del seeder por nombres y apellidos reales y variados, manteniendo emails `padel.example`, contraseñas y campos deportivos documentados; las cuentas vigentes con nombres genéricos se actualizan sin cambiar su contraseña.
- [x] 1b.2 Agregar `CANCHAS_SEED` con `Cancha 1 — Central` y `Cancha 2 — Blindex`, sembrarlas con búsqueda por nombre `paranoid: false`, creación/restauración/omisión en la misma transacción y sin eliminar canchas adicionales.
- [x] 1b.3 Actualizar `README.md` con los nombres reales, las dos canchas iniciales y el hecho de que el administrador puede crear y dar de baja canchas libremente.
- [x] 1b.4 Actualizar `test/seed.test.js` para cubrir nombres reales, dos canchas iniciales, idempotencia de canchas, actualización sin cambio de password y alta/baja de una cancha adicional.
- [x] 1b.5 Reemplazar toda referencia `QA` en datos de tests y ejemplos de arranque del `README.md`, y verificar con búsqueda que no queden coincidencias en `scripts/`, `test/` ni comandos de arranque.
- [x] 1b.6 Alinear `PRIMARY_COURT_NAMES` del frontend con las dos canchas sembradas y verificar que la tabla admin lista canchas desde `/api/canchas` con alta y baja sin topes artificiales; ejecutar `npm test`, `openspec validate --all --strict` y `npm run build` en verde.

## 2. Liberación de reserva pendiente en backend

- [x] 2.1 Adaptar `cancelarReserva` en `src/services/reserva.service.js` para recibir `req.user`, distinguir administrador/jugador y ejecutar la liberación pendiente con `Transaction.LOCK.UPDATE` sobre reserva y turno; verificar que la rama de jugador pone reserva `cancelada` y turno `disponible` en la misma transacción.
- [x] 2.2 Ampliar la ruta y el controlador de cancelación para autenticación con `requireRole('jugador', 'administrador')`; verificar `401` sin sesión, `404` para reserva ajena, `409` para confirmada/turno inválido/doble cancelación y `200` para pendiente propia.
- [x] 2.3 Mantener sin cambios la cancelación confirmada por administrador; verificar con test que el turno queda `cancelado`, no reaparece como disponible y sigue requiriendo republicación manual.
- [x] 2.4 Actualizar `notifyReservaCancelada`, el contexto y la plantilla para informar “liberada por el jugador” y turno disponible solo en la rama pendiente; verificar con test que la cancelación administrativa conserva el texto “no se republicó automáticamente”.
- [x] 2.5 Actualizar el bloque Swagger de `PATCH /api/reservas/{id}/cancelar` con roles, estados resultantes y códigos `401/403/404/409`; verificar `test/openapi.test.js` y `GET /api-docs.json`.
- [x] 2.6 Agregar tests de concurrencia y matriz de errores en `test/reservaCancelacionPendiente.test.js`; verificar `npm test` completo en verde.

## 3. Acceso, sesión y roles en el frontend

- [x] 3.1 Eliminar `QuickFill`, `QUICK_ACCOUNTS`, “Prueba rápida”, textos de credenciales `.padel.example`, botones de sugerencia rápida de otras vistas y estilos `.quick-fill`; verificar con búsqueda en `4toset-padel-front/src` que no quedan coincidencias y que `npm run build` pasa.
- [x] 3.2 Dejar `LoginPage` con email y contraseña vacíos, `autoComplete="off"` y control de ojo accesible para mostrar/ocultar contraseña sin perder el valor; verificar build y smoke manual en `npm run dev`.
- [x] 3.3 Cambiar `/` por redirección directa a `/login` cuando no hay sesión y agregar manejo de `401` protegido que limpie sesión sin afectar login/register; verificar recarga con cookie válida de administrador, navegación entre rutas y logout.
- [x] 3.4 Mapear `401` de `POST /api/auth/login` a “Correo o contraseña incorrectos. Verificá los datos e intentá nuevamente.” y reservar “Tu sesión venció...” para peticiones protegidas; verificar manualmente credencial incorrecta y cookie expirada.
- [x] 3.5 Reforzar guards y navegación con `rol === 'administrador'` para dueño/empleados y `rol === 'jugador'` para el resto; verificar que un jugador no ve usuarios/canchas ni botones de administración y que rutas protegidas intentadas devuelven `403` en backend.

## 4. Rediseño visual azul

- [x] 4.1 Reemplazar tokens verdes/lima de `src/styles/tokens.css` por azul profundo, azul cancha, superficies claras y sombras/bordes azulados; verificar con búsqueda que no quedan variables ni colores verdes/lima en `src/styles`.
- [x] 4.2 Aplicar motif de líneas de cancha y jerarquía consistente en login, dashboard, listados y formularios sin plantilla genérica; verificar `npm run build` y smoke HTTP 200 de `npm run dev`.
- [x] 4.3 Revisar responsive y contraste en login, turnos, reservas y partidos con 2 canchas; verificar manualmente que tablas, modales y formularios siguen legibles y navegables.
- [x] 4.4 Actualizar `README.md` del frontend para describir la identidad azul y la ausencia de credenciales precargadas; verificar que el texto coincida con el comportamiento observado.

## 5. Cancelación pendiente en el frontend

- [x] 5.1 Agregar en `ReservationsPage` el botón “Cancelar solicitud” solo para reservas `pendientes` propias de un jugador, con confirmación que indique que el turno volverá a disponible; verificar que no aparece en reservas confirmadas ni en vista de administrador.
- [x] 5.2 Reutilizar `PATCH /api/reservas/:id/cancelar`, recargar reservas y turnos tras la respuesta y mostrar toast claro; verificar con jugador sembrado que la reserva pasa a `cancelada` y el turno aparece en `SlotsPage`.
- [x] 5.3 Mantener el texto de cancelación administrativa sobre turno `cancelado` y republicación manual; verificar con administrador sembrado que el botón y el mensaje no cambiaron.
- [x] 5.4 Verificar matriz visual por rol/estado: jugador ve pendiente/confirmada/rechazada/cancelada según corresponda, administrador ve confirmar/rechazar/cancelar/baja; verificar en dev server con ambos roles.

## 6. Revisión punta a punta y cierre

- [x] 6.1 Confirmar que `POST /api/auth/register` sigue rechazando `rol` con `400`, crea solo `jugador` y devuelve cookie HTTPOnly; verificar `test/auth-register.test.js` y `npm test`.
- [x] 6.2 Recorrer flujo completo con 2 canchas: alta de canchas/turnos por administrador, solicitud y liberación por jugador, confirmación y cancelación por administrador, inscripción a partido; verificar estados y mensajes `400/401/403/404/409` en API y UI.
- [x] 6.3 Ejecutar `npm test`, `openspec validate --all --strict`, `npm run build` en el frontend y smoke de backend/frontend; verificar que todos pasan y que `/api-docs.json` refleja el endpoint de cancelación.
- [x] 6.4 Confirmar que no se hicieron commits ni pushes; verificar con `git status --short`, `git log --oneline -5` y el estado remoto correspondiente.
