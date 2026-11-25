export const CATEGORIES = [
  { value: 'octava', label: 'Octava' },
  { value: 'séptima', label: 'Séptima' },
  { value: 'sexta', label: 'Sexta' },
  { value: 'quinta', label: 'Quinta' },
  { value: 'cuarta', label: 'Cuarta' },
  { value: 'tercera', label: 'Tercera' },
  { value: 'segunda', label: 'Segunda' },
  { value: 'primera', label: 'Primera' },
];

export const POSITIONS = [
  { value: 'drive', label: 'Drive' },
  { value: 'revés', label: 'Revés' },
];

export const HANDS = [
  { value: 'diestro', label: 'Diestro' },
  { value: 'zurdo', label: 'Zurdo' },
];

export const SEXES = [
  { value: 'masculino', label: 'Masculino' },
  { value: 'femenino', label: 'Femenino' },
];

export const ROLES = [
  { value: 'jugador', label: 'Jugador' },
  { value: 'administrador', label: 'Administrador' },
];

export const TURNO_STATES = [
  { value: 'disponible', label: 'Disponible', tone: 'success' },
  { value: 'reservado', label: 'Reservado', tone: 'warning' },
  { value: 'bloqueado', label: 'Bloqueado', tone: 'neutral' },
  { value: 'cancelado', label: 'Cancelado', tone: 'danger' },
  { value: 'jugado', label: 'Jugado', tone: 'info' },
];

export const RESERVA_STATES = [
  { value: 'pendiente', label: 'Pendiente', tone: 'warning' },
  { value: 'confirmada', label: 'Confirmada', tone: 'success' },
  { value: 'rechazada', label: 'Rechazada', tone: 'danger' },
  { value: 'cancelada', label: 'Cancelada', tone: 'neutral' },
];

export const PARTIDO_STATES = [
  { value: 'incompleto', label: 'Incompleto', tone: 'warning' },
  { value: 'completo', label: 'Completo', tone: 'success' },
  { value: 'cancelado', label: 'Cancelado', tone: 'danger' },
  { value: 'jugado', label: 'Jugado', tone: 'info' },
];

export const TURNO_TRANSITIONS = {
  disponible: ['reservado', 'bloqueado', 'cancelado'],
  reservado: ['disponible', 'cancelado', 'jugado'],
  bloqueado: ['disponible', 'cancelado'],
  cancelado: ['disponible'],
  jugado: [],
};

export const PRIMARY_COURT_NAMES = ['Cancha 1 — Central', 'Cancha 2 — Blindex'];

export const labelFor = (catalog, value) =>
  catalog.find((item) => item.value === value)?.label ?? value ?? '—';

export const toneFor = (catalog, value) =>
  catalog.find((item) => item.value === value)?.tone ?? 'neutral';
