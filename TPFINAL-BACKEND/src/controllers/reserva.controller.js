import {
  crearReserva,
  listReservas,
  getReservaById,
  confirmarReserva,
  rechazarReserva,
  cancelarReserva,
  actualizarCupos,
  deleteReserva,
} from '../services/reserva.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const list = asyncHandler(async (req, res) => {
  const { rows, count, page, limit } = await listReservas(req.query, req.user);
  return res.status(200).json({
    status: 'success',
    data: rows,
    meta: { page, limit, total: count },
  });
});

const getById = asyncHandler(async (req, res) => {
  const reserva = await getReservaById(req.params.id, req.user);
  return res.status(200).json({ status: 'success', data: reserva });
});

const create = asyncHandler(async (req, res) => {
  const reserva = await crearReserva(req.body, req.user);
  return res.status(201).json({ status: 'success', data: reserva });
});

const updateCupos = asyncHandler(async (req, res) => {
  const reserva = await actualizarCupos(req.params.id, req.body);
  return res.status(200).json({ status: 'success', data: reserva });
});

const confirmar = asyncHandler(async (req, res) => {
  const reserva = await confirmarReserva(req.params.id);
  return res.status(200).json({ status: 'success', data: reserva });
});

const rechazar = asyncHandler(async (req, res) => {
  const reserva = await rechazarReserva(req.params.id);
  return res.status(200).json({ status: 'success', data: reserva });
});

const cancelar = asyncHandler(async (req, res) => {
  const reserva = await cancelarReserva(req.params.id, req.user);
  return res.status(200).json({ status: 'success', data: reserva });
});

const remove = asyncHandler(async (req, res) => {
  const reserva = await deleteReserva(req.params.id);
  return res.status(200).json({ status: 'success', data: reserva });
});

export { list, getById, create, updateCupos, confirmar, rechazar, cancelar, remove };
