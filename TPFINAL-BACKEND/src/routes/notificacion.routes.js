import { Router } from 'express';
import { authenticate, requireRole } from '../middlewares/auth.js';
import { list } from '../controllers/notificacion.controller.js';

const router = Router();

/**
 * @swagger
 * /api/notificaciones:
 *   get:
 *     summary: Avisos de reservas para el administrador
 *     description: Devuelve cada reserva con cancha, fecha/horario, estado y solicitante (nombre y email).
 *     tags: [Reservas]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 10
 *     responses:
 *       200:
 *         description: Listado de avisos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessNotificacionesResponse'
 *       400:
 *         description: Paginacion invalida
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Sesion ausente o invalida
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Rol no autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', authenticate, requireRole('administrador'), list);

export { router as notificacionRouter };
