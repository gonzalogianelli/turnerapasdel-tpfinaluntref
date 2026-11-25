import { Router } from 'express';
import { register, login, logout } from '../controllers/auth.controller.js';

const router = Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Registro publico de jugador
 *     description: Crea un usuario con rol jugador, inicia sesion con una cookie HTTPOnly y envia un correo de confirmacion al nuevo usuario. El campo rol no esta permitido en el registro publico; enviarlo responde 400.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: Usuario registrado
 *         headers:
 *           Set-Cookie:
 *             description: Cookie HTTPOnly con el JWT
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessUserResponse'
 *       400:
 *         description: Datos de registro invalidos; el campo rol no esta permitido en el registro publico
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
router.post('/register', register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Inicio de sesion
 *     description: Valida las credenciales y emite un JWT en una cookie HTTPOnly.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Sesion iniciada
 *         headers:
 *           Set-Cookie:
 *             description: Cookie HTTPOnly con el JWT
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessUserResponse'
 *       401:
 *         description: Credenciales invalidas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/login', login);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Cierre de sesion
 *     description: Elimina la cookie de sesion del cliente.
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Sesion cerrada
 */
router.post('/logout', logout);

export { router as authRouter };
