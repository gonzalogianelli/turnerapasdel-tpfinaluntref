# Design

- Se reutiliza el modelo `Turno` existente (90 minutos, estados `disponible`, `reservado`, `bloqueado`, `cancelado`, `jugado`) y el modelo `Reserva`; no se agregan tablas.
- La grilla horaria se deriva de una constante compartida: diez bloques de 90 minutos desde 08:00 hasta 23:00. La validación rechaza inicios fuera de esa grilla tanto en alta como al cambiar la fecha.
- `asegurarTurnosDelDia(fecha, canchaId?)` crea, dentro de una transacción, solo los bloques inexistentes de cada cancha activa. Es idempotente y respeta turnos reservados, bloqueados, cancelados o dados de baja.
- `GET /api/turnos/disponibles` es público, asegura la grilla de la fecha solicitada y devuelve únicamente turnos `disponible` de canchas no bloqueadas. `POST /api/turnos/generar` queda restringido a `administrador`.
- El bloqueo administrativo usa `PATCH /api/turnos/:id` con `estado: bloqueado|disponible`; la interfaz permite seleccionar varios turnos y aplicar el cambio en cada uno. Las transiciones y el guard de reservas activas se mantienen.
- Los avisos al administrador se derivan de las reservas existentes: `GET /api/notificaciones` (admin) devuelve reserva, cancha, fecha/horario, estado y solicitante con nombre y email. No se duplica información ni se persiste una entidad nueva.
- El cliente usa sesión HTTPOnly: el visitante puede consultar la grilla pública; al confirmar o ingresar se guarda la selección en `sessionStorage` y se retoma después del login/registro.
- Se mantiene ESM, capas routes/controllers/services/models, `AppError`, transacciones con `LOCK.UPDATE`, Swagger y notificaciones por correo "fire and forget" sin afectar las respuestas.
