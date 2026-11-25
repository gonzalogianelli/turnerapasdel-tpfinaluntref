import { Router } from 'express';
import { authenticate, requireRole } from '../middlewares/auth.js';
import { list, listPublic, generate, getById, create, update, remove } from '../controllers/turno.controller.js';

const router = Router();

/**
 * @swagger
 * /api/turnos:
 *   get:
 *     summary: Listado de turnos
 *     description: El jugador recibe unicamente turnos disponibles de canchas habilitadas.
 *     tags: [Turnos]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: fecha
 *         required: false
 *         description: Filtra por fecha (YYYY-MM-DD)
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: canchaId
 *         required: false
 *         description: Filtra por cancha
 *         schema:
 *           type: integer
 *           minimum: 1
 *       - in: query
 *         name: estado
 *         required: false
 *         description: Filtra por estado (solo administrador)
 *         schema:
 *           type: string
 *           enum: [disponible, reservado, cancelado, jugado, bloqueado]
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
 *         description: Listado de turnos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessTurnosResponse'
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
 *       409:
 *         description: Conflicto de estado o superposicion
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', authenticate, list);

/**
 * @swagger
 * /api/turnos/disponibles:
 *   get:
 *     summary: Turnos libres del día (acceso público)
 *     description: Genera de forma idempotente los bloques de 90 minutos entre 08:00 y 23:00 y devuelve solo los turnos disponibles de canchas habilitadas.
 *     tags: [Turnos]
 *     parameters:
 *       - in: query
 *         name: fecha
 *         required: false
 *         description: Fecha a consultar (YYYY-MM-DD). Por defecto, el día actual
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: canchaId
 *         required: false
 *         description: Filtra por cancha
 *         schema:
 *           type: integer
 *           minimum: 1
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
 *         description: Listado de turnos libres
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessTurnosResponse'
 *       400:
 *         description: Filtros invalidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/disponibles', listPublic);

/**
 * @swagger
 * /api/turnos/generar:
 *   post:
 *     summary: Generar la grilla de 90 minutos de una fecha
 *     description: Crea solo los bloques inexistentes entre 08:00 y 23:00 para las canchas activas.
 *     tags: [Turnos]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GenerarTurnosRequest'
 *     responses:
 *       200:
 *         description: Resultado de la generación
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenerarTurnosResponse'
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
 */
router.post('/generar', authenticate, requireRole('administrador'), generate);

/**
 * @swagger
 * /api/turnos:
 *   post:
 *     summary: Carga manual de un turno de 90 minutos
 *     tags: [Turnos]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TurnoCreateRequest'
 *     responses:
 *       201:
 *         description: Turno creado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessTurnoResponse'
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
 *         description: Cancha no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Cancha bloqueada o superposicion con otro turno activo
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/', authenticate, requireRole('administrador'), create);

/**
 * @swagger
 * /api/turnos/{id}:
 *   get:
 *     summary: Consulta de un turno por identificador
 *     tags: [Turnos]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Identificador del turno
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       200:
 *         description: Datos del turno
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessTurnoResponse'
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
 *         description: Turno no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Conflicto de estado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id', authenticate, getById);

/**
 * @swagger
 * /api/turnos/{id}:
 *   patch:
 *     summary: Edicion de turno por el administrador
 *     description: Permite cambiar la fecha, bloquear, cancelar, marcar jugado o republicar desde cancelado.
 *     tags: [Turnos]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Identificador del turno
 *         schema:
 *           type: integer
 *           minimum: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TurnoUpdateRequest'
 *     responses:
 *       200:
 *         description: Turno actualizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessTurnoResponse'
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
 *         description: Turno no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Transicion invalida, reserva activa o superposicion
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch('/:id', authenticate, requireRole('administrador'), update);

/**
 * @swagger
 * /api/turnos/{id}:
 *   delete:
 *     summary: Baja logica de un turno por el administrador
 *     description: Marca la fila con deletedAt sin cambiar su estado ni republicarlo. Rechaza la baja si existen reservas pendientes o confirmadas.
 *     tags: [Turnos]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Identificador del turno
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       200:
 *         description: Turno dado de baja
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessTurnoResponse'
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
 *         description: Turno no encontrado o ya dado de baja
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Turno con reservas activas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/:id', authenticate, requireRole('administrador'), remove);

export { router as turnoRouter };
