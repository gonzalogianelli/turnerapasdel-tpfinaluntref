import { Router } from 'express';
import { authenticate, requireRole } from '../middlewares/auth.js';
import {
  list,
  getById,
  create,
  update,
  inscribir,
  baja,
  cancelar,
  remove,
} from '../controllers/partido.controller.js';

const router = Router();

/**
 * @swagger
 * /api/partidos:
 *   get:
 *     summary: Listado de partidos y huecos disponibles
 *     description: El jugador ve solo partidos incompletos; el administrador ve todos los estados.
 *     tags: [Partidos]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: categoria
 *         required: false
 *         schema:
 *           type: string
 *           enum: [octava, séptima, sexta, quinta, cuarta, tercera, segunda, primera]
 *       - in: query
 *         name: estado
 *         required: false
 *         schema:
 *           type: string
 *           enum: [incompleto, completo, cancelado, jugado]
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
 *         description: Listado de partidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessPartidosResponse'
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
 * /api/partidos:
 *   post:
 *     summary: Alta de partido incompleto por el administrador
 *     description: Crea el partido sobre una reserva confirmada con turno reservado.
 *     tags: [Partidos]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PartidoCreateRequest'
 *     responses:
 *       201:
 *         description: Partido creado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessPartidoResponse'
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
 *         description: Reserva no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Reserva no confirmada, turno no reservado o partido ya existente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/', authenticate, requireRole('administrador'), create);

/**
 * @swagger
 * /api/partidos/{id}:
 *   get:
 *     summary: Detalle de un partido
 *     description: Un jugador solo ve partidos incompletos o aquellos donde esta inscripto.
 *     tags: [Partidos]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Identificador del partido
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       200:
 *         description: Datos del partido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessPartidoResponse'
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
 *         description: Partido no encontrado o ajeno al jugador
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
 * /api/partidos/{id}:
 *   patch:
 *     summary: Edicion o cierre de un partido por el administrador
 *     description: Cambia la categoria de un partido incompleto o cierra a jugado uno completo.
 *     tags: [Partidos]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Identificador del partido
 *         schema:
 *           type: integer
 *           minimum: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PartidoUpdateRequest'
 *     responses:
 *       200:
 *         description: Partido actualizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessPartidoResponse'
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
 *         description: Partido no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Estado invalido o categoria incompatible con los inscriptos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch('/:id', authenticate, requireRole('administrador'), update);

/**
 * @swagger
 * /api/partidos/{id}/inscripciones:
 *   post:
 *     summary: Inscripcion de un jugador a un hueco
 *     description: Valida cupo, categoria compatible y turno reservado con bloqueo transaccional, y envia aviso de inscripcion al jugador y a los administradores.
 *     tags: [Partidos]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Identificador del partido
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       201:
 *         description: Inscripcion registrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessPartidoResponse'
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
 *         description: Partido no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Partido completo, duplicado, categoria incompatible o turno inactivo
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/:id/inscripciones', authenticate, requireRole('jugador'), inscribir);

/**
 * @swagger
 * /api/partidos/{id}/inscripciones/{usuarioId}:
 *   delete:
 *     summary: Baja de un jugador del partido
 *     description: El jugador solo puede borrar su propia inscripcion y el administrador cualquier inscripcion; en ambos casos se envia aviso de baja.
 *     tags: [Partidos]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Identificador del partido
 *         schema:
 *           type: integer
 *           minimum: 1
 *       - in: path
 *         name: usuarioId
 *         required: true
 *         description: Identificador del jugador inscripto
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       200:
 *         description: Inscripcion eliminada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessPartidoResponse'
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
 *         description: Rol no autorizado o baja de un tercero
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Partido o inscripcion no encontrada
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
router.delete(
  '/:id/inscripciones/:usuarioId',
  authenticate,
  requireRole('jugador', 'administrador'),
  baja,
);

/**
 * @swagger
 * /api/partidos/{id}/cancelar:
 *   patch:
 *     summary: Cancelacion por falta de quórum
 *     description: Desvincula jugadores, cancela partido, reserva y turno sin republicacion automatica, y envia aviso a inscriptos y administradores.
 *     tags: [Partidos]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Identificador del partido
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       200:
 *         description: Partido cancelado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessPartidoResponse'
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
 *         description: Partido no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Solo se puede cancelar por quórum un partido incompleto
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch('/:id/cancelar', authenticate, requireRole('administrador'), cancelar);

/**
 * @swagger
 * /api/partidos/{id}:
 *   delete:
 *     summary: Baja logica de un partido por el administrador
 *     description: Solo permite bajas de partidos jugados o cancelados sin inscripciones vigentes. No altera la reserva ni el turno.
 *     tags: [Partidos]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Identificador del partido
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       200:
 *         description: Partido dado de baja
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessPartidoResponse'
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
 *         description: Partido no encontrado o ya dado de baja
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Partido activo o con inscripciones vigentes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/:id', authenticate, requireRole('administrador'), remove);

export { router as partidoRouter };
