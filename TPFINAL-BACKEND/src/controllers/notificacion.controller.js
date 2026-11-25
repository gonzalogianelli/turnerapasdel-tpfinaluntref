import { listNotificaciones } from '../services/notificacion.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const list = asyncHandler(async (req, res) => {
  const { rows, count, page, limit } = await listNotificaciones(req.query);
  return res.status(200).json({
    status: 'success',
    data: rows,
    meta: { page, limit, total: count },
  });
});

export { list };
