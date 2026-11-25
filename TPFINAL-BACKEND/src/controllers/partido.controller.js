import {
  crearPartido,
  listPartidos,
  getPartidoById,
  actualizarPartido,
  inscribirJugador,
  darDeBaja,
  cancelarPorQuorum,
  deletePartido,
} from '../services/partido.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const list = asyncHandler(async (req, res) => {
  const { rows, count, page, limit } = await listPartidos(req.query, req.user);
  return res.status(200).json({
    status: 'success',
    data: rows,
    meta: { page, limit, total: count },
  });
});

const getById = asyncHandler(async (req, res) => {
  const partido = await getPartidoById(req.params.id, req.user);
  return res.status(200).json({ status: 'success', data: partido });
});

const create = asyncHandler(async (req, res) => {
  const partido = await crearPartido(req.body);
  return res.status(201).json({ status: 'success', data: partido });
});

const update = asyncHandler(async (req, res) => {
  const partido = await actualizarPartido(req.params.id, req.body);
  return res.status(200).json({ status: 'success', data: partido });
});

const inscribir = asyncHandler(async (req, res) => {
  const partido = await inscribirJugador(req.params.id, req.user);
  return res.status(201).json({ status: 'success', data: partido });
});

const baja = asyncHandler(async (req, res) => {
  const partido = await darDeBaja(req.params.id, req.params.usuarioId, req.user);
  return res.status(200).json({ status: 'success', data: partido });
});

const cancelar = asyncHandler(async (req, res) => {
  const partido = await cancelarPorQuorum(req.params.id);
  return res.status(200).json({ status: 'success', data: partido });
});

const remove = asyncHandler(async (req, res) => {
  const partido = await deletePartido(req.params.id);
  return res.status(200).json({ status: 'success', data: partido });
});

export { list, getById, create, update, inscribir, baja, cancelar, remove };
