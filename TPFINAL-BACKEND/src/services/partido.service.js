import { Op, Transaction } from 'sequelize';
import { sequelize } from '../config/database.js';
import {
  Partido,
  Inscripcion,
  Reserva,
  Turno,
  User,
  CUPO_MAXIMO_PARTIDO,
  ESTADOS_PARTIDO_ACTIVOS,
} from '../models/index.js';
import { AppError } from '../utils/AppError.js';
import {
  categoriasCompatibles,
  validarCompatibilidadCategoria,
  lugaresFaltantes,
  esCompleta,
  validateCreatePartidoPayload,
  validateUpdatePartidoPayload,
  parsePartidoId,
  parseUsuarioId,
  parsePartidoListQuery,
} from '../utils/partidoValidation.js';
import {
  notifyPartidoInscripcion,
  notifyPartidoBaja,
  notifyPartidoCanceladoQuorum,
} from './notification.service.js';

const buildIncludePartido = () => [
  {
    model: Inscripcion,
    as: 'inscripciones',
    include: [{ model: User, attributes: ['id', 'nombre', 'categoria'] }],
  },
  {
    model: Reserva,
    include: [
      {
        model: Turno,
        attributes: ['id', 'canchaId', 'fechaHoraInicio', 'fechaHoraFin', 'estado'],
      },
    ],
  },
];

const serializeInscriptos = (inscripciones = []) =>
  inscripciones
    .filter((inscripcion) => inscripcion.User)
    .map((inscripcion) => ({
      id: inscripcion.User.id,
      nombre: inscripcion.User.nombre,
      categoria: inscripcion.User.categoria,
    }));

const serializePartido = (partido) => {
  const values = partido.toJSON ? partido.toJSON() : { ...partido };
  const inscripciones = values.inscripciones || [];
  const lugaresOcupados = inscripciones.length;

  const serialized = {
    id: values.id,
    reservaId: values.reservaId,
    categoria: values.categoria,
    estado: values.estado,
    cupoMaximo: CUPO_MAXIMO_PARTIDO,
    lugaresOcupados,
    lugaresFaltantes: lugaresFaltantes(lugaresOcupados),
    esCompleta: esCompleta(lugaresOcupados),
    inscriptos: serializeInscriptos(inscripciones),
    createdAt: values.createdAt,
    updatedAt: values.updatedAt,
  };

  const turno = values.Reserva?.Turno;
  if (turno) {
    serialized.turno = {
      id: turno.id,
      canchaId: turno.canchaId,
      fechaHoraInicio: turno.fechaHoraInicio,
      fechaHoraFin: turno.fechaHoraFin,
      estado: turno.estado,
    };
  }

  return serialized;
};

const findPartido = async (value, transaction) => {
  const id = parsePartidoId(value);
  const partido = await Partido.findByPk(id, {
    include: buildIncludePartido(),
    transaction,
  });

  if (!partido) {
    throw new AppError('Partido no encontrado', 404);
  }

  return partido;
};

const getPartidoById = async (value, user) => {
  const partido = await findPartido(value);

  if (user?.rol === 'jugador') {
    const inscripto = partido.inscripciones.some((item) => item.usuarioId === user.id);
    if (partido.estado !== 'incompleto' && !inscripto) {
      throw new AppError('Partido no encontrado', 404);
    }
  }

  return serializePartido(partido);
};

const reservasIdsPorFecha = async (fecha) => {
  const reservas = await Reserva.findAll({
    attributes: ['id'],
    include: [
      {
        model: Turno,
        attributes: [],
        where: {
          fechaHoraInicio: {
            [Op.between]: [new Date(`${fecha}T00:00:00.000Z`), new Date(`${fecha}T23:59:59.999Z`)],
          },
        },
      },
    ],
  });

  return reservas.map((reserva) => reserva.id);
};

const listPartidos = async (query, user) => {
  const { page, limit, offset, categoria, estado, fecha } = parsePartidoListQuery(query);
  const where = {};

  if (user?.rol === 'jugador') {
    where.estado = 'incompleto';
  } else if (estado) {
    where.estado = estado;
  }
  if (categoria) where.categoria = categoria;
  if (fecha) {
    where.reservaId = { [Op.in]: await reservasIdsPorFecha(fecha) };
  }

  const { rows, count } = await Partido.findAndCountAll({
    where,
    include: buildIncludePartido(),
    limit,
    offset,
    order: [['id', 'ASC']],
  });

  return { rows: rows.map(serializePartido), count, page, limit };
};

const crearPartido = async (payload) => {
  const data = validateCreatePartidoPayload(payload);

  return sequelize.transaction(async (transaction) => {
    const reserva = await Reserva.findByPk(data.reservaId, {
      transaction,
      lock: Transaction.LOCK.UPDATE,
    });
    if (!reserva) {
      throw new AppError('Reserva no encontrada', 404);
    }
    if (reserva.estado !== 'confirmada') {
      throw new AppError('Solo se puede crear un partido sobre una reserva confirmada', 409);
    }

    const turno = await Turno.findByPk(reserva.turnoId, {
      transaction,
      lock: Transaction.LOCK.UPDATE,
    });
    if (!turno || turno.estado !== 'reservado') {
      throw new AppError('El turno de la reserva no esta reservado', 409);
    }

    const existente = await Partido.findOne({
      where: { reservaId: data.reservaId },
      transaction,
    });
    if (existente) {
      throw new AppError('La reserva ya tiene un partido asociado', 409);
    }

    const partido = await Partido.create(
      { reservaId: data.reservaId, categoria: data.categoria, estado: 'incompleto' },
      { transaction },
    );

    return serializePartido(partido);
  });
};

const actualizarPartido = async (value, payload) => {
  const updates = validateUpdatePartidoPayload(payload);

  return sequelize.transaction(async (transaction) => {
    const partido = await Partido.findByPk(parsePartidoId(value), {
      transaction,
      lock: Transaction.LOCK.UPDATE,
    });
    if (!partido) {
      throw new AppError('Partido no encontrado', 404);
    }

    if (updates.categoria !== undefined) {
      if (partido.estado !== 'incompleto') {
        throw new AppError('Solo se puede cambiar la categoria de un partido incompleto', 409);
      }
      const inscripciones = await Inscripcion.findAll({
        where: { partidoId: partido.id },
        include: [{ model: User, attributes: ['id', 'nombre', 'categoria'] }],
        transaction,
      });
      const incompatible = inscripciones.some(
        (item) => !categoriasCompatibles(item.User?.categoria, updates.categoria),
      );
      if (incompatible) {
        throw new AppError('La nueva categoria deja inscriptos incompatibles', 409);
      }
      await partido.update({ categoria: updates.categoria }, { transaction });
    }

    if (updates.estado !== undefined) {
      if (partido.estado !== 'completo') {
        throw new AppError('Solo se puede cerrar un partido completo', 409);
      }
      await partido.update({ estado: updates.estado }, { transaction });
    }

    return serializePartido(await findPartido(partido.id, transaction));
  });
};

const inscribirJugador = async (value, user, deps = {}) => {
  const partidoId = parsePartidoId(value);

  const partido = await sequelize.transaction(async (transaction) => {
    const partidoEncontrado = await Partido.findByPk(partidoId, {
      transaction,
      lock: Transaction.LOCK.UPDATE,
    });
    if (!partidoEncontrado) {
      throw new AppError('Partido no encontrado', 404);
    }
    if (partidoEncontrado.estado !== 'incompleto') {
      throw new AppError('El partido no admite nuevas inscripciones', 409);
    }

    const reserva = await Reserva.findByPk(partidoEncontrado.reservaId, {
      transaction,
      lock: Transaction.LOCK.UPDATE,
    });
    if (!reserva || reserva.estado !== 'confirmada') {
      throw new AppError('La reserva del partido no esta confirmada', 409);
    }

    const turno = await Turno.findByPk(reserva.turnoId, {
      transaction,
      lock: Transaction.LOCK.UPDATE,
    });
    if (!turno || turno.estado !== 'reservado') {
      throw new AppError('El turno del partido no esta reservado', 409);
    }

    validarCompatibilidadCategoria(user.categoria, partidoEncontrado.categoria);

    const duplicado = await Inscripcion.findOne({
      where: { partidoId, usuarioId: user.id },
      transaction,
      paranoid: false,
    });
    if (duplicado) {
      throw new AppError('El jugador ya esta inscripto en el partido', 409);
    }

    const ocupados = await Inscripcion.count({ where: { partidoId }, transaction });
    if (ocupados >= CUPO_MAXIMO_PARTIDO) {
      throw new AppError('El partido ya completo sus lugares', 409);
    }

    try {
      await Inscripcion.create({ partidoId, usuarioId: user.id }, { transaction });
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        throw new AppError('El jugador ya esta inscripto en el partido', 409);
      }
      throw error;
    }

    if (ocupados + 1 === CUPO_MAXIMO_PARTIDO) {
      await partidoEncontrado.update({ estado: 'completo' }, { transaction });
    }

    return serializePartido(await findPartido(partidoId, transaction));
  });

  notifyPartidoInscripcion(partido, user, deps);
  return partido;
};

const darDeBaja = async (partidoValue, usuarioValue, user, deps = {}) => {
  const partidoId = parsePartidoId(partidoValue);
  const usuarioId = parseUsuarioId(usuarioValue);

  if (user?.rol === 'jugador' && user.id !== usuarioId) {
    throw new AppError('No autorizado para quitar otra inscripcion', 403);
  }

  const partido = await sequelize.transaction(async (transaction) => {
    const partidoEncontrado = await Partido.findByPk(partidoId, {
      transaction,
      lock: Transaction.LOCK.UPDATE,
    });
    if (!partidoEncontrado) {
      throw new AppError('Partido no encontrado', 404);
    }
    if (['jugado', 'cancelado'].includes(partidoEncontrado.estado)) {
      throw new AppError('No se puede dar de baja un inscripto de un partido jugado o cancelado', 409);
    }

    const inscripcion = await Inscripcion.findOne({
      where: { partidoId, usuarioId },
      transaction,
    });
    if (!inscripcion) {
      throw new AppError('Inscripcion no encontrada', 404);
    }

    await inscripcion.destroy({ transaction });
    const ocupados = await Inscripcion.count({ where: { partidoId }, transaction });
    if (partidoEncontrado.estado === 'completo' && ocupados < CUPO_MAXIMO_PARTIDO) {
      await partidoEncontrado.update({ estado: 'incompleto' }, { transaction });
    }

    return serializePartido(await findPartido(partidoId, transaction));
  });

  notifyPartidoBaja(partido, usuarioId, deps);
  return partido;
};

const cancelarPorQuorum = async (value, deps = {}) => {
  const partidoId = parsePartidoId(value);
  let inscriptos = [];

  const partido = await sequelize.transaction(async (transaction) => {
    const partidoEncontrado = await Partido.findByPk(partidoId, {
      transaction,
      lock: Transaction.LOCK.UPDATE,
    });
    if (!partidoEncontrado) {
      throw new AppError('Partido no encontrado', 404);
    }
    if (partidoEncontrado.estado !== 'incompleto') {
      throw new AppError('Solo se puede cancelar por quorum un partido incompleto', 409);
    }

    const reserva = await Reserva.findByPk(partidoEncontrado.reservaId, {
      transaction,
      lock: Transaction.LOCK.UPDATE,
    });
    if (!reserva) {
      throw new AppError('Reserva no encontrada', 404);
    }
    const turno = await Turno.findByPk(reserva.turnoId, {
      transaction,
      lock: Transaction.LOCK.UPDATE,
    });
    if (!turno) {
      throw new AppError('Turno no encontrado', 404);
    }

    const inscripciones = await Inscripcion.findAll({ where: { partidoId }, transaction });
    inscriptos = (
      await Promise.all(
        inscripciones.map((inscripcion) =>
          User.findByPk(inscripcion.usuarioId, { transaction, paranoid: false }),
        ),
      )
    ).filter(Boolean);

    await Inscripcion.destroy({ where: { partidoId }, transaction });
    await partidoEncontrado.update({ estado: 'cancelado' }, { transaction });
    await reserva.update({ estado: 'cancelada' }, { transaction });
    await turno.update({ estado: 'cancelado' }, { transaction });

    return serializePartido(await findPartido(partidoId, transaction));
  });

  notifyPartidoCanceladoQuorum(partido, inscriptos, deps);
  return partido;
};

const deletePartido = async (value) => {
  const id = parsePartidoId(value);

  return sequelize.transaction(async (transaction) => {
    const partido = await Partido.findByPk(id, {
      transaction,
      lock: Transaction.LOCK.UPDATE,
    });
    if (!partido) {
      throw new AppError('Partido no encontrado', 404);
    }
    if (ESTADOS_PARTIDO_ACTIVOS.includes(partido.estado)) {
      throw new AppError('Solo se puede dar de baja un partido jugado o cancelado', 409);
    }

    const inscripcionVigente = await Inscripcion.findOne({
      where: { partidoId: id },
      transaction,
      lock: Transaction.LOCK.UPDATE,
    });
    if (inscripcionVigente) {
      throw new AppError('No se puede dar de baja un partido con inscripciones vigentes', 409);
    }

    const serializado = serializePartido(await findPartido(id, transaction));
    await partido.destroy({ transaction });
    return serializado;
  });
};

export {
  crearPartido,
  listPartidos,
  getPartidoById,
  actualizarPartido,
  inscribirJugador,
  darDeBaja,
  cancelarPorQuorum,
  deletePartido,
  serializePartido,
};
