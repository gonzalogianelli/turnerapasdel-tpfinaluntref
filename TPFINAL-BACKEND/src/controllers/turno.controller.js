import {
  listTurnos,
  listTurnosDisponiblesPublicos,
  asegurarTurnosDelDia,
  getTurnoById,
  createTurno,
  updateTurno,
  deleteTurno,
} from '../services/turno.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const list = asyncHandler(async (req, res) => {
  const { rows, count, page, limit } = await listTurnos(req.query, req.user);
  return res.status(200).json({
    status: 'success',
    data: rows,
    meta: { page, limit, total: count },
  });
});

const listPublic = asyncHandler(async (req, res) => {
  const { rows, count, page, limit } = await listTurnosDisponiblesPublicos(req.query);
  return res.status(200).json({
    status: 'success',
    data: rows,
    meta: { page, limit, total: count },
  });
});

const generate = asyncHandler(async (req, res) => {
  const resultado = await asegurarTurnosDelDia(req.body);
  return res.status(200).json({ status: 'success', data: resultado });
});

const getById = asyncHandler(async (req, res) => {
  const turno = await getTurnoById(req.params.id);
  return res.status(200).json({ status: 'success', data: turno });
});

const create = asyncHandler(async (req, res) => {
  const turno = await createTurno(req.body);
  return res.status(201).json({ status: 'success', data: turno });
});

const update = asyncHandler(async (req, res) => {
  const turno = await updateTurno(req.params.id, req.body);
  return res.status(200).json({ status: 'success', data: turno });
});

const remove = asyncHandler(async (req, res) => {
  const turno = await deleteTurno(req.params.id);
  return res.status(200).json({ status: 'success', data: turno });
});

export { list, listPublic, generate, getById, create, update, remove };
