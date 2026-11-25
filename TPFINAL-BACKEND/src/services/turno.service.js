import { Op, Transaction } from 'sequelize';
import { Cancha, Turno, TURNOS_ACTIVOS, Reserva, RESERVAS_ACTIVAS } from '../models/index.js';
import { HORARIOS_TURNO, DURACION_TURNO_MINUTOS } from '../models/Turno.js';
import { sequelize } from '../config/database.js';
import { AppError } from '../utils/AppError.js';
import {
  calcularFechaHoraFin,
  validateCreateTurnoPayload,
  validateUpdateTurnoPayload,
  parseTurnoId,
  parseTurnoListQuery,
  validateGenerarTurnosPayload,
  esTransicionTurnoValida,
  fechaActual,
  rangoFecha,
} from '../utils/turnoValidation.js';

const MENSAJES_RESERVA_ACTIVA = {
  disponible: 'No se puede republicar un turno con una reserva pendiente o confirmada',
  bloqueado: 'No se puede bloquear un turno con una reserva pendiente o confirmada',
  cancelado: 'No se puede cancelar un turno con una reserva pendiente o confirmada',
};

const MILISEGUNDOS_POR_MINUTO = 60 * 1000;

const inicioDelBloque = (fecha, hora) => {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const [horas, minutos] = hora.split(':').map(Number);
  return new Date(anio, mes - 1, dia, horas, minutos, 0, 0);
};

const haySolape = (turno, inicio, fin) =>
  new Date(turno.fechaHoraInicio).getTime() < fin.getTime() &&
  new Date(turno.fechaHoraFin).getTime() > inicio.getTime();

const asegurarTurnosDelDia = async (payload) => {
  const { fecha, canchaId } = validateGenerarTurnosPayload(payload);

  return sequelize.transaction(async (transaction) => {
    const canchas = await Cancha.findAll({
      where: { ...(canchaId ? { id: canchaId } : {}), bloqueada: false },
      transaction,
      lock: Transaction.LOCK.UPDATE,
      order: [['id', 'ASC']],
    });

    const inicioDia = inicioDelBloque(fecha, HORARIOS_TURNO[0]);
    const finDia = new Date(inicioDia.getTime() + 24 * 60 * MILISEGUNDOS_POR_MINUTO);
    const existentes = await Turno.findAll({
      where: {
        fechaHoraInicio: { [Op.gte]: inicioDia, [Op.lt]: finDia },
        ...(canchaId ? { canchaId } : {}),
      },
      attributes: ['canchaId', 'fechaHoraInicio', 'fechaHoraFin', 'estado'],
      paranoid: false,
      transaction,
    });

    const ocupados = existentes.filter((turno) => TURNOS_ACTIVOS.includes(turno.estado));
    const nuevos = [];

    for (const cancha of canchas) {
      for (const hora of HORARIOS_TURNO) {
        const inicio = inicioDelBloque(fecha, hora);
        const fin = new Date(inicio.getTime() + DURACION_TURNO_MINUTOS * MILISEGUNDOS_POR_MINUTO);
        const yaCubierto = ocupados.some(
          (turno) => turno.canchaId === cancha.id && haySolape(turno, inicio, fin),
        ) || nuevos.some((turno) => turno.canchaId === cancha.id && haySolape(turno, inicio, fin));
        if (yaCubierto) continue;

        const turno = {
          canchaId: cancha.id,
          fechaHoraInicio: inicio,
          fechaHoraFin: fin,
          estado: 'disponible',
        };
        ocupados.push(turno);
        nuevos.push(turno);
      }
    }

    if (nuevos.length > 0) {
      await Turno.bulkCreate(nuevos, { transaction });
    }

    return { fecha, creados: nuevos.length, total: canchas.length * HORARIOS_TURNO.length };
  });
};

const ensureSinSolape = async (canchaId, inicio, fin, transaction, excludeId) => {
  const where = {
    canchaId,
    estado: { [Op.in]: TURNOS_ACTIVOS },
    fechaHoraInicio: { [Op.lt]: fin },
    fechaHoraFin: { [Op.gt]: inicio },
  };

  if (excludeId) {
    where.id = { [Op.ne]: excludeId };
  }

  const solape = await Turno.findOne({ where, transaction });
  if (solape) {
    throw new AppError('El turno se superpone con otro turno activo de la cancha', 409);
  }
};

const getTurnoById = async (value) => {
  const id = parseTurnoId(value);
  const turno = await Turno.findByPk(id, { include: [{ model: Cancha }] });
  if (!turno) {
    throw new AppError('Turno no encontrado', 404);
  }
  return turno;
};

const listTurnos = async (query, user) => {
  const { page, limit, offset, canchaId, estado, fecha } = parseTurnoListQuery(query);
  const where = {};

  const esConsultaPublica = user?.rol !== 'administrador';

  if (canchaId) where.canchaId = canchaId;
  if (esConsultaPublica) {
    where.estado = 'disponible';
  } else if (estado) {
    where.estado = estado;
  }

  if (fecha) {
    const [desde, hasta] = rangoFecha(fecha);
    where.fechaHoraInicio = { [Op.gte]: desde, [Op.lt]: hasta };
  }

  const include = esConsultaPublica
    ? [{ model: Cancha, where: { bloqueada: false }, attributes: ['id', 'nombre'] }]
    : [{ model: Cancha, attributes: ['id', 'nombre'] }];

  const { rows, count } = await Turno.findAndCountAll({
    where,
    include,
    limit,
    offset,
    order: [['fechaHoraInicio', 'ASC'], ['id', 'ASC']],
  });

  return { rows, count, page, limit };
};

const listTurnosDisponiblesPublicos = async (query) => {
  const { fecha } = parseTurnoListQuery(query);
  await asegurarTurnosDelDia({ fecha: fecha ?? fechaActual() });
  return listTurnos({ ...query, estado: 'disponible' }, undefined);
};

const createTurno = async (payload) => {
  const data = validateCreateTurnoPayload(payload);
  const fechaHoraFin = calcularFechaHoraFin(data.fechaHoraInicio);

  return sequelize.transaction(async (transaction) => {
    const cancha = await Cancha.findByPk(data.canchaId, {
      transaction,
      lock: Transaction.LOCK.UPDATE,
    });

    if (!cancha) {
      throw new AppError('Cancha no encontrada', 404);
    }
    if (cancha.bloqueada) {
      throw new AppError('La cancha esta bloqueada', 409);
    }

    await ensureSinSolape(data.canchaId, data.fechaHoraInicio, fechaHoraFin, transaction);

    return Turno.create(
      {
        canchaId: data.canchaId,
        fechaHoraInicio: data.fechaHoraInicio,
        fechaHoraFin,
        estado: data.estado,
      },
      { transaction },
    );
  });
};

const updateTurno = async (value, payload) => {
  const id = parseTurnoId(value);
  const updates = validateUpdateTurnoPayload(payload);

  return sequelize.transaction(async (transaction) => {
    const turno = await Turno.findByPk(id, {
      transaction,
      lock: Transaction.LOCK.UPDATE,
    });

    if (!turno) {
      throw new AppError('Turno no encontrado', 404);
    }

    if (updates.estado !== undefined && !esTransicionTurnoValida(turno.estado, updates.estado)) {
      throw new AppError('Transicion de estado del turno no permitida', 409);
    }

    if (
      MENSAJES_RESERVA_ACTIVA[updates.estado] &&
      updates.estado !== turno.estado
    ) {
      const reservasActivas = await Reserva.findAll({
        where: { turnoId: turno.id, estado: { [Op.in]: RESERVAS_ACTIVAS } },
        attributes: ['id'],
        transaction,
        lock: Transaction.LOCK.UPDATE,
      });
      if (reservasActivas.length > 0) {
        throw new AppError(MENSAJES_RESERVA_ACTIVA[updates.estado], 409);
      }
    }

    const cancha = await Cancha.findByPk(turno.canchaId, {
      transaction,
      lock: Transaction.LOCK.UPDATE,
    });

    const inicio = updates.fechaHoraInicio || turno.fechaHoraInicio;
    const fin = updates.fechaHoraInicio
      ? calcularFechaHoraFin(updates.fechaHoraInicio)
      : turno.fechaHoraFin;

    if (updates.fechaHoraInicio && cancha?.bloqueada) {
      throw new AppError('La cancha esta bloqueada', 409);
    }

    if (updates.fechaHoraInicio) {
      await ensureSinSolape(turno.canchaId, inicio, fin, transaction, turno.id);
    }

    if (Object.keys(updates).length > 0) {
      if (updates.fechaHoraInicio) {
        updates.fechaHoraFin = fin;
      }
      await turno.update(updates, { transaction });
    }

    return turno;
  });
};

const deleteTurno = async (value) => {
  const id = parseTurnoId(value);

  return sequelize.transaction(async (transaction) => {
    const turno = await Turno.findByPk(id, {
      transaction,
      lock: Transaction.LOCK.UPDATE,
    });
    if (!turno) {
      throw new AppError('Turno no encontrado', 404);
    }

    const reservaActiva = await Reserva.findOne({
      where: { turnoId: id, estado: { [Op.in]: RESERVAS_ACTIVAS } },
      attributes: ['id'],
      transaction,
      lock: Transaction.LOCK.UPDATE,
    });
    if (reservaActiva) {
      throw new AppError('No se puede dar de baja un turno con reservas activas', 409);
    }

    await turno.destroy({ transaction });
    return turno;
  });
};

export {
  listTurnos,
  listTurnosDisponiblesPublicos,
  asegurarTurnosDelDia,
  getTurnoById,
  createTurno,
  updateTurno,
  deleteTurno,
};
