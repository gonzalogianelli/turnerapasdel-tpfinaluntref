import {
  listCanchas,
  getCanchaById,
  createCancha,
  updateCancha,
  deleteCancha,
} from '../services/cancha.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const list = asyncHandler(async (req, res) => {
  const { rows, count, page, limit } = await listCanchas(req.query);
  return res.status(200).json({
    status: 'success',
    data: rows,
    meta: { page, limit, total: count },
  });
});

const getById = asyncHandler(async (req, res) => {
  const cancha = await getCanchaById(req.params.id);
  return res.status(200).json({ status: 'success', data: cancha });
});

const create = asyncHandler(async (req, res) => {
  const cancha = await createCancha(req.body);
  return res.status(201).json({ status: 'success', data: cancha });
});

const update = asyncHandler(async (req, res) => {
  const cancha = await updateCancha(req.params.id, req.body);
  return res.status(200).json({ status: 'success', data: cancha });
});

const remove = asyncHandler(async (req, res) => {
  const cancha = await deleteCancha(req.params.id);
  return res.status(200).json({ status: 'success', data: cancha });
});

export { list, getById, create, update, remove };
