import { Router } from 'express';
import { authenticate, requireRole } from '../middlewares/auth.js';
import {
  getMe,
  updateMe,
  list,
  getById,
  create,
  update,
  remove,
} from '../controllers/user.controller.js';

const router = Router();

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     summary: Consulta del perfil propio
 *     tags: [Usuarios]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Datos del usuario autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessUserResponse'
 *       401:
 *         description: Sesion ausente o invalida
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/me', authenticate, getMe);

/**
 * @swagger
 * /api/users/me:
 *   patch:
 *     summary: Actualizacion del perfil propio
 *     description: Permite actualizar los datos propios, excepto el rol.
 *     tags: [Usuarios]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserUpdateRequest'
 *     responses:
 *       200:
 *         description: Perfil actualizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessUserResponse'
 *       400:
 *         description: Datos invalidos o intento de cambiar el rol
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
 *       409:
 *         description: Email ya utilizado por otro usuario
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch('/me', authenticate, updateMe);

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Listado de usuarios para el administrador
 *     tags: [Usuarios]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: rol
 *         required: false
 *         description: Filtra por rol
 *         schema:
 *           type: string
 *           enum: [administrador, jugador]
 *       - in: query
 *         name: categoria
 *         required: false
 *         description: Filtra por categoria
 *         schema:
 *           type: string
 *           enum: [octava, séptima, sexta, quinta, cuarta, tercera, segunda, primera]
 *       - in: query
 *         name: search
 *         required: false
 *         description: Busca por nombre o email
 *         schema:
 *           type: string
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
 *         description: Listado de usuarios
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessUsersResponse'
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
 */
router.get('/', authenticate, requireRole('administrador'), list);

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Alta de usuarios por el administrador
 *     description: Permite crear jugadores o administradores y envia un correo de confirmacion al nuevo usuario. El rol administrador cubre a dueno y empleado del complejo.
 *     tags: [Usuarios]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserCreateRequest'
 *     responses:
 *       201:
 *         description: Usuario creado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessUserResponse'
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
 *       409:
 *         description: Email ya registrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/', authenticate, requireRole('administrador'), create);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Consulta de un usuario por identificador
 *     tags: [Usuarios]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Identificador del usuario
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       200:
 *         description: Datos del usuario
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessUserResponse'
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
 *         description: Usuario no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id', authenticate, requireRole('administrador'), getById);

/**
 * @swagger
 * /api/users/{id}:
 *   patch:
 *     summary: Edicion de usuarios por el administrador
 *     description: Permite actualizar datos y el rol del usuario. No se puede degradar al ultimo administrador; esa operacion responde 409. El rol administrador cubre a dueno y empleado del complejo.
 *     tags: [Usuarios]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Identificador del usuario
 *         schema:
 *           type: integer
 *           minimum: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserUpdateRequest'
 *     responses:
 *       200:
 *         description: Usuario actualizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessUserResponse'
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
 *         description: Usuario no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Email ya registrado o intento de degradar al ultimo administrador
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch('/:id', authenticate, requireRole('administrador'), update);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Baja logica de un usuario por el administrador
 *     description: Marca la fila con deletedAt sin borrarla, conserva el historial y devuelve el usuario sin contraseña. Rechaza la baja del ultimo administrador o de usuarios con dependencias activas.
 *     tags: [Usuarios]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Identificador del usuario
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       200:
 *         description: Usuario dado de baja
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessUserResponse'
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
 *         description: Usuario no encontrado o ya dado de baja
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Ultimo administrador o dependencias activas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/:id', authenticate, requireRole('administrador'), remove);

export { router as userRouter };
