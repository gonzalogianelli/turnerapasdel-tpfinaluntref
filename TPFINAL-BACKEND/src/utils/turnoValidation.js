import { AppError } from './AppError.js';
import { DURACION_TURNO_MINUTOS, ESTADOS_TURNO, HORARIOS_TURNO } from '../models/Turno.js';

const MILISEGUNDOS_POR_MINUTO = 60 * 1000;
const ISO_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;
const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const TRANSICIONES_TURNO = {
  disponible: ['disponible', 'reservado', 'bloqueado', 'cancelado'],
  reservado: ['reservado', 'disponible', 'cancelado', 'jugado'],
  cancelado: ['cancelado', 'disponible'],
  bloqueado: ['bloqueado', 'disponible', 'cancelado'],
  jugado: ['jugado'],
};

const fail = (message) => {
  throw new AppError(message, 400);
};

const ensureObject = (payload) => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    fail('El cuerpo de la solicitud debe ser un objeto JSON');
  }
};

const positiveInteger = (value, field, fallback) => {
  if (value === undefined) return fallback;
  const parsed = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
  if (typeof parsed !== 'number' || !Number.isInteger(parsed) || parsed < 1) {
    fail(`El campo ${field} debe ser un entero positivo`);
  }
  return parsed;
};

const fechaHoraIsoValue = (value, field) => {
  if (typeof value !== 'string' || !ISO_REGEX.test(value)) {
    fail(`El campo ${field} debe ser una fecha ISO valida`);
  }
  const fecha = new Date(value);
  if (Number.isNaN(fecha.getTime())) {
    fail(`El campo ${field} debe ser una fecha ISO valida`);
  }
  return fecha;
};

const estadoValue = (value) => {
  if (typeof value !== 'string' || !ESTADOS_TURNO.includes(value)) {
    fail('El campo estado no es valido');
  }
  return value;
};

const transicionesPermitidasPara = (estado) => TRANSICIONES_TURNO[estado] ?? [];

const esTransicionTurnoValida = (estadoActual, estadoNuevo) =>
  transicionesPermitidasPara(estadoActual).includes(estadoNuevo);

const fechaValue = (value) => {
  if (typeof value !== 'string' || !FECHA_REGEX.test(value)) {
    fail('El filtro fecha debe tener formato YYYY-MM-DD');
  }
  const fecha = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(fecha.getTime()) || fecha.toISOString().slice(0, 10) !== value) {
    fail('El filtro fecha no es valido');
  }
  return value;
};

const calcularFechaHoraFin = (fechaHoraInicio) =>
  new Date(fechaHoraInicio.getTime() + DURACION_TURNO_MINUTOS * MILISEGUNDOS_POR_MINUTO);

const validarInicioEnGrilla = (fecha, field) => {
  const hora = String(fecha.getHours()).padStart(2, '0');
  const minuto = String(fecha.getMinutes()).padStart(2, '0');
  const inicio = `${hora}:${minuto}`;
  if (fecha.getSeconds() !== 0 || fecha.getMilliseconds() !== 0 || !HORARIOS_TURNO.includes(inicio)) {
    fail(`El campo ${field} debe iniciar en uno de los horarios permitidos: ${HORARIOS_TURNO.join(', ')}`);
  }
  return fecha;
};

const fechaHoraTurnoValue = (value, field) => validarInicioEnGrilla(fechaHoraIsoValue(value, field), field);

const validateCreateTurnoPayload = (payload) => {
  ensureObject(payload);

  if (payload.fechaHoraFin !== undefined) {
    fail('El campo fechaHoraFin se calcula automaticamente');
  }

  return {
    canchaId: positiveInteger(payload.canchaId, 'canchaId'),
    fechaHoraInicio: fechaHoraTurnoValue(payload.fechaHoraInicio, 'fechaHoraInicio'),
    estado: 'disponible',
  };
};

const validateUpdateTurnoPayload = (payload) => {
  ensureObject(payload);

  if (payload.fechaHoraFin !== undefined) {
    fail('El campo fechaHoraFin se calcula automaticamente');
  }

  const updates = {};
  if (payload.fechaHoraInicio !== undefined) {
    updates.fechaHoraInicio = fechaHoraTurnoValue(payload.fechaHoraInicio, 'fechaHoraInicio');
  }
  if (payload.estado !== undefined) {
    updates.estado = estadoValue(payload.estado);
  }
  return updates;
};

const rangoFecha = (valor) => {
  const fecha = fechaValue(valor);
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const desde = new Date(anio, mes - 1, dia, 0, 0, 0, 0);
  const hasta = new Date(anio, mes - 1, dia + 1, 0, 0, 0, 0);
  return [desde, hasta];
};

const fechaActual = () => {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const dia = String(hoy.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
};

const validateGenerarTurnosPayload = (payload) => {
  ensureObject(payload ?? {});
  return {
    fecha: payload?.fecha === undefined ? fechaActual() : fechaValue(payload.fecha),
    canchaId: positiveInteger(payload?.canchaId, 'canchaId'),
  };
};

const parseTurnoId = (value) => positiveInteger(value, 'id');

const parseTurnoListQuery = (query = {}) => {
  const page = positiveInteger(query.page, 'page', 1);
  const limit = positiveInteger(query.limit, 'limit', 10);
  const canchaId = positiveInteger(query.canchaId, 'canchaId');
  const estado = query.estado === undefined ? undefined : estadoValue(query.estado);
  const fecha = query.fecha === undefined ? undefined : fechaValue(query.fecha);

  return { page, limit, offset: (page - 1) * limit, canchaId, estado, fecha };
};

export {
  calcularFechaHoraFin,
  fechaActual,
  rangoFecha,
  validarInicioEnGrilla,
  validateCreateTurnoPayload,
  validateUpdateTurnoPayload,
  validateGenerarTurnosPayload,
  parseTurnoId,
  parseTurnoListQuery,
  transicionesPermitidasPara,
  esTransicionTurnoValida,
};
