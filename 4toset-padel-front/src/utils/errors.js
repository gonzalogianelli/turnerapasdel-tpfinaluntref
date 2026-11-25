export const LOGIN_ERROR_MESSAGE = 'Correo o contraseña incorrectos. Verificá los datos e intentá nuevamente.';

export const SESSION_EXPIRED_MESSAGE = 'Tu sesión venció. Ingresá nuevamente para continuar.';

const STATUS_TITLES = {
  0: 'Sin conexión',
  400: 'Datos inválidos',
  401: 'Sesión requerida',
  403: 'Acceso restringido',
  404: 'No encontrado',
  409: 'Conflicto',
  500: 'Error del servidor',
};

const CONFLICT_TRANSLATIONS = [
  {
    match: /ultimo administrador/i,
    message: 'No se puede modificar al último administrador. Primero designá a otro administrador.',
  },
  {
    match: /reservas activas/i,
    message: 'No se puede dar de baja: tiene reservas pendientes o confirmadas asociadas.',
  },
  {
    match: /inscripciones activas/i,
    message: 'No se puede dar de baja: tiene inscripciones vigentes en partidos.',
  },
  {
    match: /email ya esta registrado/i,
    message: 'Ese correo ya está registrado, incluso si la cuenta fue dada de baja.',
  },
  {
    match: /turno ya no esta disponible|turno ya tiene una solicitud activa/i,
    message: 'Ese turno ya fue solicitado por otro jugador. Actualizá la lista e intentá con otro.',
  },
  {
    match: /cuenta bloqueada/i,
    message: 'La cancha está bloqueada. Desbloqueala desde Canchas antes de continuar.',
  },
  {
    match: /superpone/i,
    message: 'El horario se superpone con otro turno activo de la misma cancha.',
  },
  {
    match: /categoria del jugador no es compatible/i,
    message: 'Tu categoría no es compatible con la categoría del partido.',
  },
  {
    match: /ya esta inscripto/i,
    message: 'Ya estás inscripto en este partido.',
  },
  {
    match: /partido ya completo/i,
    message: 'El partido ya completó sus cuatro lugares.',
  },
  {
    match: /reserva no esta pendiente/i,
    message: 'La reserva ya fue confirmada o rechazada por otro administrador.',
  },
  {
    match: /solo se puede cancelar una reserva confirmada/i,
    message: 'Solo se pueden cancelar reservas confirmadas.',
  },
  {
    match: /transicion de estado del turno no permitida/i,
    message: 'No se permite ese cambio de estado para el turno actual.',
  },
];

export const errorTitle = (error) => STATUS_TITLES[error?.status] ?? 'No se pudo completar';

export const errorMessage = (error, fallback = 'Ocurrió un problema. Intentá nuevamente.') => {
  const raw = error?.message || '';

  if (error?.status === 409) {
    const translation = CONFLICT_TRANSLATIONS.find((item) => item.match.test(raw));
    if (translation) return translation.message;
  }

  if (error?.status === 401) {
    return SESSION_EXPIRED_MESSAGE;
  }

  return raw || fallback;
};
