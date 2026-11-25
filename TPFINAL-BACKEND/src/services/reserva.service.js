import { Op, Transaction } from 'sequelize';
import {
  Cancha,
  Turno,
  Reserva,
  Partido,
  RESERVAS_ACTIVAS,
  ESTADOS_PARTIDO_ACTIVOS,
} from '../models/index.js';
import { sequelize } from '../config/database.js';
import { AppError } from '../utils/AppError.js';
import {
  validateCreateReservaPayload,
  validateUpdateCuposPayload,
  parseReservaId,
  parseReservaListQuery,
  lugaresFaltantes,
  esCompleta,
} from '../utils/reservaValidation.js';
import { rangoFecha } from '../utils/turnoValidation.js';
import {
  notifyReservaSolicitada,
  notifyReservaConfirmada,
  notifyReservaRechazada,
  notifyReservaCancelada,
} from './notification.service.js';

const serializeReserva = (reserva) => ({
  ...reserva.toJSON(),
  lugaresOcupados: reserva.cuposOcupados,
  lugaresFaltantes: lugaresFaltantes(reserva.cuposOcupados),
  esCompleta: esCompleta(reserva.cuposOcupados),
});

const getReservaById = async (value, user) => {
  const id = parseReservaId(value);
  const reserva = await Reserva.findByPk(id, { include: [{ model: Turno }] });

  if (!reserva || (user?.rol === 'jugador' && reserva.usuarioId !== user.id)) {
    throw new AppError('Reserva no encontrada', 404);
  }

  return serializeReserva(reserva);
};

const listReservas = async (query, user) => {
  const { page, limit, offset, turnoId, estado, fecha } = parseReservaListQuery(query);
  const where = {};

  if (user?.rol === 'jugador') where.usuarioId = user.id;
  if (turnoId) where.turnoId = turnoId;
  if (estado) where.estado = estado;

  if (fecha) {
    const [desde, hasta] = rangoFecha(fecha);
    where['$Turno.fechaHoraInicio$'] = { [Op.gte]: desde, [Op.lt]: hasta };
  }

  const { rows, count } = await Reserva.findAndCountAll({
    where,
    include: [{ model: Turno, attributes: ['id', 'fechaHoraInicio', 'fechaHoraFin', 'estado'] }],
    limit,
    offset,
    order: [['id', 'ASC']],
  });

  return { rows: rows.map(serializeReserva), count, page, limit };
};

const crearReserva = async (payload, user, deps = {}) => {
  const data = validateCreateReservaPayload(payload);

  const reserva = await sequelize.transaction(async (transaction) => {
    const turno = await Turno.findByPk(data.turnoId, {
      transaction,
      lock: Transaction.LOCK.UPDATE,
    });

    if (!turno) {
      throw new AppError('Turno no encontrado', 404);
    }
    if (turno.estado !== 'disponible') {
      throw new AppError('El turno ya no esta disponible', 409);
    }

    const cancha = await Cancha.findByPk(turno.canchaId, { transaction });
    if (cancha?.bloqueada) {
      throw new AppError('La cancha esta bloqueada', 409);
    }

    const reservaActiva = await Reserva.findOne({
      where: { turnoId: data.turnoId, estado: { [Op.in]: RESERVAS_ACTIVAS } },
      transaction,
    });
    if (reservaActiva) {
      throw new AppError('El turno ya tiene una solicitud activa', 409);
    }

    const nuevaReserva = await Reserva.create(
      {
        turnoId: data.turnoId,
        usuarioId: user.id,
        estado: 'pendiente',
        cuposOcupados: data.cuposOcupados,
      },
      { transaction },
    );

    await turno.update({ estado: 'reservado' }, { transaction });

    return serializeReserva(nuevaReserva);
  });

  notifyReservaSolicitada(reserva, user, deps);
  return reserva;
};

const findReservaForDecision = async (value, transaction) => {
  const id = parseReservaId(value);
  const reserva = await Reserva.findByPk(id, {
    transaction,
    lock: Transaction.LOCK.UPDATE,
  });

  if (!reserva) {
    throw new AppError('Reserva no encontrada', 404);
  }

  return reserva;
};

const findTurnoForDecision = async (turnoId, transaction) => {
  const turno = await Turno.findByPk(turnoId, {
    transaction,
    lock: Transaction.LOCK.UPDATE,
  });

  if (!turno) {
    throw new AppError('Turno no encontrado', 404);
  }

  return turno;
};

const confirmarReserva = async (value, deps = {}) => {
  const reserva = await sequelize.transaction(async (transaction) => {
    const reservaEncontrada = await findReservaForDecision(value, transaction);
    if (reservaEncontrada.estado !== 'pendiente') {
      throw new AppError('La reserva no esta pendiente', 409);
    }

    await reservaEncontrada.update({ estado: 'confirmada' }, { transaction });
    return serializeReserva(reservaEncontrada);
  });

  notifyReservaConfirmada(reserva, deps);
  return reserva;
};

const rechazarReserva = async (value, deps = {}) => {
  const reserva = await sequelize.transaction(async (transaction) => {
    const reservaEncontrada = await findReservaForDecision(value, transaction);
    if (reservaEncontrada.estado !== 'pendiente') {
      throw new AppError('La reserva no esta pendiente', 409);
    }

    const turno = await findTurnoForDecision(reservaEncontrada.turnoId, transaction);
    if (turno.estado !== 'reservado') {
      throw new AppError('El turno ya no esta reservado', 409);
    }

    await reservaEncontrada.update({ estado: 'rechazada' }, { transaction });
    await turno.update({ estado: 'disponible' }, { transaction });

    return serializeReserva(reservaEncontrada);
  });

  notifyReservaRechazada(reserva, deps);
  return reserva;
};

const cancelarReserva = async (value, user, deps = {}) => {
  if (user?.rol === 'jugador') {
    const reservaLiberada = await sequelize.transaction(async (transaction) => {
      const reservaEncontrada = await findReservaForDecision(value, transaction);
      if (reservaEncontrada.usuarioId !== user.id) {
        throw new AppError('Reserva no encontrada', 404);
      }
      if (reservaEncontrada.estado === 'confirmada') {
        throw new AppError('Solo el administrador puede cancelar una reserva confirmada', 409);
      }
      if (reservaEncontrada.estado !== 'pendiente') {
        throw new AppError('Solo se puede liberar una reserva pendiente', 409);
      }

      const turno = await findTurnoForDecision(reservaEncontrada.turnoId, transaction);
      if (turno.estado !== 'reservado') {
        throw new AppError('El turno ya no esta reservado', 409);
      }

      const otraReservaActiva = await Reserva.findOne({
        where: {
          turnoId: turno.id,
          id: { [Op.ne]: reservaEncontrada.id },
          estado: { [Op.in]: RESERVAS_ACTIVAS },
        },
        transaction,
        lock: Transaction.LOCK.UPDATE,
      });
      if (otraReservaActiva) {
        throw new AppError('El turno tiene otra solicitud activa', 409);
      }

      await reservaEncontrada.update({ estado: 'cancelada' }, { transaction });
      await turno.update({ estado: 'disponible' }, { transaction });

      return serializeReserva(reservaEncontrada);
    });

    notifyReservaCancelada(reservaLiberada, deps, {
      estadoTurno: 'disponible',
      motivo: 'liberada por el jugador',
    });
    return reservaLiberada;
  }

  const reserva = await sequelize.transaction(async (transaction) => {
    const reservaEncontrada = await findReservaForDecision(value, transaction);
    if (reservaEncontrada.estado !== 'confirmada') {
      throw new AppError('Solo se puede cancelar una reserva confirmada', 409);
    }

    const turno = await findTurnoForDecision(reservaEncontrada.turnoId, transaction);
    await reservaEncontrada.update({ estado: 'cancelada' }, { transaction });
    await turno.update({ estado: 'cancelado' }, { transaction });

    return serializeReserva(reservaEncontrada);
  });

  notifyReservaCancelada(reserva, deps);
  return reserva;
};

const actualizarCupos = async (value, payload) => {
  const updates = validateUpdateCuposPayload(payload);

  return sequelize.transaction(async (transaction) => {
    const reserva = await findReservaForDecision(value, transaction);
    if (!RESERVAS_ACTIVAS.includes(reserva.estado)) {
      throw new AppError('No se pueden actualizar los cupos de una reserva resuelta', 409);
    }

    await reserva.update(updates, { transaction });
    return serializeReserva(reserva);
  });
};

const deleteReserva = async (value) => {
  const id = parseReservaId(value);

  return sequelize.transaction(async (transaction) => {
    const reserva = await Reserva.findByPk(id, {
      transaction,
      lock: Transaction.LOCK.UPDATE,
    });
    if (!reserva) {
      throw new AppError('Reserva no encontrada', 404);
    }
    if (RESERVAS_ACTIVAS.includes(reserva.estado)) {
      throw new AppError('Solo se puede dar de baja una reserva rechazada o cancelada', 409);
    }

    const partidoActivo = await Partido.findOne({
      where: { reservaId: id, estado: { [Op.in]: ESTADOS_PARTIDO_ACTIVOS } },
      transaction,
      lock: Transaction.LOCK.UPDATE,
    });
    if (partidoActivo) {
      throw new AppError('No se puede dar de baja una reserva con partido vigente', 409);
    }

    await reserva.destroy({ transaction });
    return serializeReserva(reserva);
  });
};

export {
  crearReserva,
  listReservas,
  getReservaById,
  confirmarReserva,
  rechazarReserva,
  cancelarReserva,
  actualizarCupos,
  deleteReserva,
};
