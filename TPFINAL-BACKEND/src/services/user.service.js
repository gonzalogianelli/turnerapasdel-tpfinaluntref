import { Op, Transaction } from 'sequelize';
import { sequelize } from '../config/database.js';
import {
  User,
  Reserva,
  Partido,
  Inscripcion,
  RESERVAS_ACTIVAS,
  ESTADOS_PARTIDO_ACTIVOS,
} from '../models/index.js';
import { AppError } from '../utils/AppError.js';
import {
  validateCreateUserPayload,
  validateUpdateUserPayload,
  parseUserListQuery,
  parseUserId,
} from '../utils/userValidation.js';
import { notifyUserRegistered } from './notification.service.js';

const ADMIN_ROLE = 'administrador';

const isUniqueConstraintError = (error) => error?.name === 'SequelizeUniqueConstraintError';

const ensureEmailAvailable = async (email, excludeId) => {
  const where = { email };
  if (excludeId) {
    where.id = { [Op.ne]: excludeId };
  }
  const existing = await User.findOne({ where, paranoid: false });
  if (existing) {
    throw new AppError('El email ya esta registrado', 409);
  }
};

const getUserById = async (id) => {
  const user = await User.findByPk(id);
  if (!user) {
    throw new AppError('Usuario no encontrado', 404);
  }
  return user;
};

const updateOwnProfile = async (user, payload) => {
  const updates = validateUpdateUserPayload(payload, { allowRole: false });

  if (updates.email && updates.email !== user.email) {
    await ensureEmailAvailable(updates.email, user.id);
  }

  if (Object.keys(updates).length === 0) {
    return user;
  }

  try {
    await user.update(updates);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new AppError('El email ya esta registrado', 409);
    }
    throw error;
  }

  return user;
};

const listUsers = async (query) => {
  const { page, limit, offset, rol, categoria, search } = parseUserListQuery(query);

  const where = {};
  if (rol) where.rol = rol;
  if (categoria) where.categoria = categoria;
  if (search) {
    where[Op.or] = [
      { nombre: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } },
    ];
  }

  const { rows, count } = await User.findAndCountAll({
    where,
    limit,
    offset,
    order: [['id', 'ASC']],
  });

  return { rows, count, page, limit };
};

const createUser = async (payload, deps = {}) => {
  const data = validateCreateUserPayload(payload, { allowRole: true });
  await ensureEmailAvailable(data.email);

  try {
    const user = await User.create(data);
    notifyUserRegistered(user, deps);
    return user;
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new AppError('El email ya esta registrado', 409);
    }
    throw error;
  }
};

const updateUser = async (id, payload) => {
  const updates = validateUpdateUserPayload(payload, { allowRole: true });

  if (updates.email) {
    await ensureEmailAvailable(updates.email, id);
  }

  if (Object.keys(updates).length === 0) {
    return getUserById(id);
  }

  return sequelize.transaction(async (transaction) => {
    let lockedAdmins = [];

    if (updates.rol !== undefined) {
      lockedAdmins = await User.findAll({
        where: { rol: ADMIN_ROLE },
        attributes: ['id', 'rol'],
        order: [['id', 'ASC']],
        lock: Transaction.LOCK.UPDATE,
        transaction,
      });
    }

    const user = await User.findByPk(id, {
      transaction,
      ...(updates.rol !== undefined ? { lock: Transaction.LOCK.UPDATE } : {}),
    });
    if (!user) {
      throw new AppError('Usuario no encontrado', 404);
    }

    const demotesLastAdmin =
      updates.rol !== undefined &&
      user.rol === ADMIN_ROLE &&
      updates.rol !== ADMIN_ROLE &&
      lockedAdmins.length <= 1;

    if (demotesLastAdmin) {
      throw new AppError('No se puede degradar al ultimo administrador', 409);
    }

    try {
      await user.update(updates, { transaction });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new AppError('El email ya esta registrado', 409);
      }
      throw error;
    }

    return user;
  });
};

const deleteUser = async (value) => {
  const id = parseUserId(value);

  return sequelize.transaction(async (transaction) => {
    const lockedAdmins = await User.findAll({
      where: { rol: ADMIN_ROLE },
      attributes: ['id', 'rol'],
      order: [['id', 'ASC']],
      lock: Transaction.LOCK.UPDATE,
      transaction,
    });

    const user = await User.findByPk(id, {
      transaction,
      lock: Transaction.LOCK.UPDATE,
    });
    if (!user) {
      throw new AppError('Usuario no encontrado', 404);
    }

    if (user.rol === ADMIN_ROLE && lockedAdmins.length <= 1) {
      throw new AppError('No se puede dar de baja al ultimo administrador', 409);
    }

    const reservaActiva = await Reserva.findOne({
      where: { usuarioId: id, estado: { [Op.in]: RESERVAS_ACTIVAS } },
      attributes: ['id'],
      transaction,
    });
    if (reservaActiva) {
      throw new AppError('No se puede dar de baja un usuario con reservas activas', 409);
    }

    const inscripcionActiva = await Inscripcion.findOne({
      where: { usuarioId: id },
      attributes: ['id'],
      include: [
        {
          model: Partido,
          attributes: [],
          where: { estado: { [Op.in]: ESTADOS_PARTIDO_ACTIVOS } },
        },
      ],
      transaction,
    });
    if (inscripcionActiva) {
      throw new AppError('No se puede dar de baja un usuario con inscripciones activas', 409);
    }

    await user.destroy({ transaction });
    return user;
  });
};

export { getUserById, updateOwnProfile, listUsers, createUser, updateUser, deleteUser };
