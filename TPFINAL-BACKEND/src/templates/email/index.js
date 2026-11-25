const escapeHtml = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character],
  );

const formatFecha = (value) => {
  if (!value) return 'sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' });
};

const buildEmail = (subject, rows) => ({
  subject,
  text: rows.map(([label, value]) => `${label}: ${value}`).join('\n'),
  html: `<div><h1>${escapeHtml(subject)}</h1><ul>${rows
    .map(([label, value]) => `<li><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</li>`)
    .join('')}</ul></div>`,
});

const templates = {
  USER_REGISTERED: ({ nombre }) =>
    buildEmail('Confirmacion de registro - 4to Set Padel', [
      ['Hola', nombre || 'jugador'],
      ['Mensaje', 'Tu registro en el complejo se realizo correctamente'],
      ['Estado', 'Ya podes iniciar sesion y consultar turnos disponibles'],
    ]),

  RESERVA_SOLICITADA: ({
    nombre,
    cancha,
    fechaHora,
    cuposOcupados,
    lugaresFaltantes,
  }) =>
    buildEmail('Nueva solicitud de reserva - 4to Set Padel', [
      ['Jugador', nombre || 'sin nombre'],
      ['Cancha', cancha || 'sin cancha'],
      ['Fecha y hora', formatFecha(fechaHora)],
      ['Lugares ocupados', cuposOcupados ?? 0],
      ['Lugares faltantes', lugaresFaltantes ?? 0],
      ['Estado', 'Solicitud pendiente de decision del administrador'],
    ]),

  RESERVA_CONFIRMADA: ({ nombre, cancha, fechaHora, estadoTurno }) =>
    buildEmail('Reserva confirmada - 4to Set Padel', [
      ['Jugador', nombre || 'sin nombre'],
      ['Cancha', cancha || 'sin cancha'],
      ['Fecha y hora', formatFecha(fechaHora)],
      ['Estado de la reserva', 'confirmada'],
      ['Estado del turno', estadoTurno || 'reservado'],
    ]),

  RESERVA_RECHAZADA: ({ nombre, cancha, fechaHora, estadoTurno }) =>
    buildEmail('Reserva rechazada - 4to Set Padel', [
      ['Jugador', nombre || 'sin nombre'],
      ['Cancha', cancha || 'sin cancha'],
      ['Fecha y hora', formatFecha(fechaHora)],
      ['Estado de la reserva', 'rechazada'],
      ['Estado del turno', estadoTurno || 'disponible'],
    ]),

  RESERVA_CANCELADA: ({ nombre, cancha, fechaHora, estadoTurno, motivo }) => {
    const rows = [
      ['Jugador', nombre || 'sin nombre'],
      ['Cancha', cancha || 'sin cancha'],
      ['Fecha y hora', formatFecha(fechaHora)],
      ['Estado de la reserva', 'cancelada'],
      ['Estado del turno', estadoTurno || 'cancelado'],
    ];

    if (motivo === 'liberada por el jugador') {
      rows.push(['Motivo', 'liberada por el jugador']);
      rows.push(['Nota', 'El turno volvio a estar disponible']);
    } else {
      rows.push(['Nota', 'El turno no se republico automaticamente']);
    }

    return buildEmail('Reserva cancelada - 4to Set Padel', rows);
  },

  PARTIDO_INSCRIPCION: ({
    nombre,
    categoria,
    fechaHora,
    lugaresOcupados,
    lugaresFaltantes,
  }) =>
    buildEmail('Inscripcion a partido - 4to Set Padel', [
      ['Jugador', nombre || 'sin nombre'],
      ['Categoria del partido', categoria || 'sin categoria'],
      ['Fecha y hora', formatFecha(fechaHora)],
      ['Lugares ocupados', lugaresOcupados ?? 0],
      ['Lugares faltantes', lugaresFaltantes ?? 0],
    ]),

  PARTIDO_BAJA: ({ nombre, categoria, fechaHora }) =>
    buildEmail('Baja de partido - 4to Set Padel', [
      ['Jugador', nombre || 'sin nombre'],
      ['Categoria del partido', categoria || 'sin categoria'],
      ['Fecha y hora', formatFecha(fechaHora)],
      ['Nota', 'El turno no se republico automaticamente'],
    ]),

  PARTIDO_CANCELADO_QUORUM: ({ categoria, fechaHora }) =>
    buildEmail('Partido cancelado por falta de quorum - 4to Set Padel', [
      ['Categoria del partido', categoria || 'sin categoria'],
      ['Fecha y hora', formatFecha(fechaHora)],
      ['Motivo', 'No se completaron los cuatro jugadores'],
      ['Nota', 'El turno quedo cancelado y no se republico automaticamente'],
    ]),
};

const renderEmail = (event, context = {}) => {
  const template = templates[event];
  if (!template) {
    throw new Error(`Plantilla de correo desconocida: ${event}`);
  }
  return template(context);
};

export { templates as emailTemplates, renderEmail };
