import { Router } from 'express';
import { authenticate, requireRole } from '../middlewares/auth.js';
import {
  list,
  getById,
  create,
  updateCupos,
  confirmar,
  rechazar,
  cancelar,
  remove,
} from '../controllers/reserva.controller.js';

const router = Router();

/**
 * @swagger
 * /api/reservas:
 *   get:
 *     summary: Listado de reservas
 *     description: El jugador ve solo sus reservas; el administrador ve todas.
 *     tags: [Reservas]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: estado
 *         required: false
 *         description: Filtra por estado de la reserva
 *         schema:
 *           type: string
 *           enum: [pendiente, confirmada, rechazada, cancelada]
 *       - in: query
 *         name: turnoId
 *         required: false
 *         description: Filtra por turno
 *         schema:
 *           type: integer
 *           minimum: 1
 *       - in: query
 *         name: fecha
 *         required: false
 *         description: Filtra por fecha del turno (YYYY-MM-DD)
 *         schema:
 *           type: string
 *           format: date
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
 *         description: Listado de reservas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessReservasResponse'
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
 *         description: Conflicto de estado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', authenticate, list);

/**
 * @swagger
 * /api/reservas:
 *   post:
 *     summary: Solicitud de reserva por un jugador
 *     description: Crea la solicitud en pendiente, pasa el turno a reservado y envia aviso de solicitud al jugador y a los administradores.
 *     tags: [Reservas]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReservaCreateRequest'
 *     responses:
 *       201:
 *         description: Solicitud creada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessReservaResponse'
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
 *         description: Turno no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Turno ya reservado, bloqueado o con solicitud activa
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/', authenticate, requireRole('jugador'), create);

/**
 * @swagger
 * /api/reservas/{id}:
 *   patch:
 *     summary: Actualizacion de cupos por el administrador
 *     tags: [Reservas]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Identificador de la reserva
 *         schema:
 *           type: integer
 *           minimum: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReservaCuposRequest'
 *     responses:
 *       200:
 *         description: Cupos actualizados
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessReservaResponse'
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
 *         description: Reserva no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Resuelta o estado invalido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch('/:id', authenticate, requireRole('administrador'), updateCupos);

/**
 * @swagger
 * /api/reservas/{id}/confirmar:
 *   patch:
 *     summary: Confirmacion de una reserva pendiente
 *     description: Confirma la reserva, mantiene el turno reservado y envia aviso de confirmacion.
 *     tags: [Reservas]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Identificador de la reserva
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       200:
 *         description: Reserva confirmada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessReservaResponse'
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
 *         description: Reserva no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: La reserva ya estaba resuelta
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch('/:id/confirmar', authenticate, requireRole('administrador'), confirmar);

/**
 * @swagger
 * /api/reservas/{id}/rechazar:
 *   patch:
 *     summary: Rechazo de una reserva pendiente
 *     description: Devuelve el turno a disponible y envia aviso de rechazo.
 *     tags: [Reservas]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Identificador de la reserva
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       200:
 *         description: Reserva rechazada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessReservaResponse'
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
 *         description: Reserva no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: La reserva ya estaba resuelta
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch('/:id/rechazar', authenticate, requireRole('administrador'), rechazar);

/**
 * @swagger
 * /api/reservas/{id}/cancelar:
 *   patch:
 *     summary: Cancelacion o liberacion de una reserva
 *     description: El administrador cancela una reserva confirmada, deja el turno en cancelado y exige republicacion manual. El jugador libera solo su reserva pendiente, deja el turno disponible y vuelve a publicarlo en el listado de turnos libres. Ambos casos envian aviso de cancelacion.
 *     tags: [Reservas]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Identificador de la reserva
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       200:
 *         description: Reserva cancelada; turno cancelado para administrador o disponible para jugador
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessReservaResponse'
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
 *         description: Rol no autorizado para cancelar reservas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Reserva no encontrada o ajena al jugador
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Reserva confirmada por jugador, doble cancelacion o turno ya no reservado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch('/:id/cancelar', authenticate, requireRole('jugador', 'administrador'), cancelar);

/**
 * @swagger
 * /api/reservas/{id}:
 *   get:
 *     summary: Consulta de una reserva por identificador
 *     description: Un jugador solo puede consultar sus propias reservas.
 *     tags: [Reservas]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Identificador de la reserva
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       200:
 *         description: Datos de la reserva
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessReservaResponse'
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
 *         description: Reserva no encontrada o ajena al jugador
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
 * /api/reservas/{id}:
 *   delete:
 *     summary: Baja logica de una reserva por el administrador
 *     description: Solo permite bajas de reservas rechazadas o canceladas sin partido vigente. No modifica el estado del turno ni lo republica.
 *     tags: [Reservas]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Identificador de la reserva
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       200:
 *         description: Reserva dada de baja
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessReservaResponse'
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
 *         description: Reserva no encontrada o ya dada de baja
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Reserva activa o con partido vigente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/:id', authenticate, requireRole('administrador'), remove);

export { router as reservaRouter };
