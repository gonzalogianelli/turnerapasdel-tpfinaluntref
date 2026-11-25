import { Op, Transaction } from 'sequelize';
import { sequelize } from '../config/database.js';
import { Cancha } from '../models/Cancha.js';
import { Turno, TURNOS_ACTIVOS } from '../models/index.js';
import { AppError } from '../utils/AppError.js';
import {
  validateCreateCanchaPayload,
  validateUpdateCanchaPayload,
  parseCanchaId,
  parseCanchaListQuery,
} from '../utils/canchaValidation.js';

const getCanchaById = async (value) => {
  const id = parseCanchaId(value);
  const cancha = await Cancha.findByPk(id);
  if (!cancha) {
    throw new AppError('Cancha no encontrada', 404);
  }
  return cancha;
};

const listCanchas = async (query) => {
  const { page, limit, offset, nombre, bloqueada } = parseCanchaListQuery(query);
  const where = { bloqueada };

  if (nombre) {
    where.nombre = { [Op.like]: `%${nombre}%` };
  }

  const { rows, count } = await Cancha.findAndCountAll({
    where,
    limit,
    offset,
    order: [['id', 'ASC']],
  });

  return { rows, count, page, limit };
};

const createCancha = async (payload) => {
  const data = validateCreateCanchaPayload(payload);
  return Cancha.create(data);
};

const updateCancha = async (value, payload) => {
  const cancha = await getCanchaById(value);
  const updates = validateUpdateCanchaPayload(payload);

  if (Object.keys(updates).length > 0) {
    await cancha.update(updates);
  }

  return cancha;
};

const deleteCancha = async (value) => {
  const id = parseCanchaId(value);

  return sequelize.transaction(async (transaction) => {
    const cancha = await Cancha.findByPk(id, {
      transaction,
      lock: Transaction.LOCK.UPDATE,
    });
    if (!cancha) {
      throw new AppError('Cancha no encontrada', 404);
    }

    const turnoActivo = await Turno.findOne({
      where: { canchaId: id, estado: { [Op.in]: TURNOS_ACTIVOS } },
      attributes: ['id'],
      transaction,
      lock: Transaction.LOCK.UPDATE,
    });
    if (turnoActivo) {
      throw new AppError('No se puede dar de baja una cancha con turnos activos', 409);
    }

    await cancha.destroy({ transaction });
    return cancha;
  });
};

export { listCanchas, getCanchaById, createCancha, updateCancha, deleteCancha };
