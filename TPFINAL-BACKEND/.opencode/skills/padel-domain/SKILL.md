---
name: padel-domain
description: Reglas de negocio del complejo de pádel para turnos de 90 minutos, reservas, cancelaciones y partidos incompletos.
---

# Reglas de Negocio del Dominio Pádel

1. **Categorías y compatibilidad:**
   - Orden oficial de niveles (1 a 8): `['primera', 'segunda', 'tercera', 'cuarta', 'quinta', 'sexta', 'séptima', 'octava']`.
   - Un jugador puede inscribirse en un partido incompleto si `Math.abs(indiceJugador - indicePartido) <= 1`.
2. **Ciclo de vida del Turno (90 min):**
   - Estados válidos: `'disponible'`, `'reservado'`, `'cancelado'`, `'jugado'`, `'bloqueado'`.
   - Validar que no exista otro turno activo en la misma `canchaId` que se superponga en la ventana de 90 minutos (`fechaHoraInicio` a `fechaHoraInicio + 90 min`).
   - El listado público de turnos disponibles filtra estrictamente `estado === 'disponible'`.
   - Al recibir solicitud de reserva sobre un turno `'disponible'`, pasa a `'reservado'`.
   - Al cancelar una reserva confirmada, el turno pasa a `'cancelado'` (NO vuelve a `'disponible'` hasta que un `administrador` ejecute explícitamente la republicación).
   - Baja a último momento: pasa o se mantiene en `'jugado'` sin republicar.
3. **Partidos incompletos:**
   - Exigen un `turnoId` existente en estado `'reservado'`.
   - `cupoMaximo = 4`. Nunca permitir más de 4 jugadores inscriptos ni duplicar al mismo jugador en el mismo partido.
   - Cancelación por falta de quórum (1 hora antes): al ejecutarla el administrador, desvincula jugadores del partido, marca el partido cancelado y pasa el turno a `'cancelado'`.
