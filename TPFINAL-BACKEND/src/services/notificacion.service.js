import { Cancha, Reserva, Turno, User } from '../models/index.js';
import { parseReservaListQuery } from '../utils/reservaValidation.js';

const serializeNotificacion = (reserva) => {
  const registro = reserva.toJSON();
  const turno = registro.Turno || {};
  const cancha = turno.Cancha?.nombre || `Cancha #${turno.canchaId || '?'}`;
  const solicitante = registro.User || {};
  const nombre = solicitante.nombre || `Usuario #${registro.usuarioId}`;

  return {
    id: registro.id,
    tipo: 'reserva',
    mensaje: `Nueva reserva de ${nombre} en ${cancha}`,
    estado: registro.estado,
    cancha,
    fechaHora: turno.fechaHoraInicio || null,
    solicitante: {
      id: registro.usuarioId,
      nombre: nombre,
      email: solicitante.email || null,
    },
    createdAt: registro.createdAt,
  };
};

const listNotificaciones = async (query) => {
  const { page, limit, offset } = parseReservaListQuery(query);
  const { rows, count } = await Reserva.findAndCountAll({
    include: [
      {
        model: Turno,
        attributes: ['id', 'canchaId', 'fechaHoraInicio', 'estado'],
        include: [{ model: Cancha, attributes: ['id', 'nombre'] }],
      },
      { model: User, attributes: ['id', 'nombre', 'email'] },
    ],
    limit,
    offset,
    order: [['createdAt', 'DESC'], ['id', 'DESC']],
  });

  return { rows: rows.map(serializeNotificacion), count, page, limit };
};

export { listNotificaciones };
