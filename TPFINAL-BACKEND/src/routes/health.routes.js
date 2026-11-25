import { Router } from 'express';
import { getHealth } from '../controllers/health.controller.js';

const router = Router();

/**
 * @swagger
 * /api/health:
 *   get:
 *     operationId: getHealth
 *     summary: Estado del servidor y de la base de datos
 *     description: Consulta publica de disponibilidad del servidor y de la base de datos.
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Servidor y base de datos disponibles
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthStatus'
 *       500:
 *         description: Error inesperado al consultar el estado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       503:
 *         description: Base de datos no disponible
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthStatus'
 */
router.get('/', getHealth);

export { router as healthRouter };
