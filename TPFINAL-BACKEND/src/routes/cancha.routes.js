import { Router } from 'express';
import { authenticate, requireRole } from '../middlewares/auth.js';
import { list, getById, create, update, remove } from '../controllers/cancha.controller.js';

const router = Router();

/**
 * @swagger
 * /api/canchas:
 *   get:
 *     summary: Listado de canchas habilitadas
 *     tags: [Canchas]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: nombre
 *         required: false
 *         description: Filtra por nombre parcial
 *         schema:
 *           type: string
 *       - in: query
 *         name: bloqueada
 *         required: false
 *         description: Filtra por estado de bloqueo (false por defecto)
 *         schema:
 *           type: boolean
 *           default: false
 *       - in: query
 *         name: page
 *         required: false
 *         description: Numero de pagina (desde 1)
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         required: false
 *         description: Cantidad de resultados por pagina
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 10
 *     responses:
 *       200:
 *         description: Listado de canchas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessCanchasResponse'
 *       400:
 *         description: Filtros o paginacion invalidos
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
 *       404:
 *         description: Recurso no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', authenticate, list);

/**
 * @swagger
 * /api/canchas:
 *   post:
 *     summary: Alta de cancha por el administrador
 *     tags: [Canchas]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CanchaCreateRequest'
 *     responses:
 *       201:
 *         description: Cancha creada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessCanchaResponse'
 *       400:
 *         description: Datos invalidos
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
 *       404:
 *         description: Recurso no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/', authenticate, requireRole('administrador'), create);

/**
 * @swagger
 * /api/canchas/{id}:
 *   get:
 *     summary: Consulta de una cancha por identificador
 *     tags: [Canchas]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Identificador de la cancha
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       200:
 *         description: Datos de la cancha
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessCanchaResponse'
 *       400:
 *         description: Identificador invalido
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
 *       404:
 *         description: Cancha no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id', authenticate, getById);

/**
 * @swagger
 * /api/canchas/{id}:
 *   patch:
 *     summary: Edicion de cancha por el administrador
 *     tags: [Canchas]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Identificador de la cancha
 *         schema:
 *           type: integer
 *           minimum: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CanchaUpdateRequest'
 *     responses:
 *       200:
 *         description: Cancha actualizada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessCanchaResponse'
 *       400:
 *         description: Datos o identificador invalidos
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
 *       404:
 *         description: Cancha no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch('/:id', authenticate, requireRole('administrador'), update);

/**
 * @swagger
 * /api/canchas/{id}:
 *   delete:
 *     summary: Baja logica de una cancha por el administrador
 *     description: Marca la fila con deletedAt sin borrarla. Rechaza la baja si existen turnos vigentes disponibles, reservados o bloqueados.
 *     tags: [Canchas]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Identificador de la cancha
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       200:
 *         description: Cancha dada de baja
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessCanchaResponse'
 *       400:
 *         description: Identificador invalido
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
 *       404:
 *         description: Cancha no encontrada o ya dada de baja
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Cancha con turnos activos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/:id', authenticate, requireRole('administrador'), remove);

export { router as canchaRouter };
