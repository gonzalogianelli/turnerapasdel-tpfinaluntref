import path from 'node:path';
import { fileURLToPath } from 'node:url';
import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './env.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const routesGlob = path.join(currentDir, '..', 'routes', '*.js').replaceAll('\\', '/');

const usuarioSchema = {
  type: 'object',
  properties: {
    id: { type: 'integer', example: 1 },
    nombre: { type: 'string', example: 'Ana Perez' },
    email: {
      type: 'string',
      format: 'email',
      description: 'Usar una dirección de correo real válida',
    },
    categoria: {
      type: 'string',
      enum: ['octava', 'séptima', 'sexta', 'quinta', 'cuarta', 'tercera', 'segunda', 'primera'],
      example: 'sexta',
    },
    posicionHabitual: { type: 'string', enum: ['revés', 'drive'], example: 'revés' },
    manoDominante: { type: 'string', enum: ['zurdo', 'diestro'], example: 'zurdo' },
    sexo: { type: 'string', enum: ['masculino', 'femenino'], example: 'femenino' },
    telefono: { type: 'string', example: '1123456789' },
    rol: { type: 'string', enum: ['administrador', 'jugador'], example: 'jugador' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

const userFields = {
  nombre: { type: 'string', example: 'Ana Perez' },
  email: { type: 'string', format: 'email', description: 'Usar una dirección de correo real válida' },
  password: { type: 'string', minLength: 8, example: 'secreto123' },
  categoria: {
    type: 'string',
    enum: ['octava', 'séptima', 'sexta', 'quinta', 'cuarta', 'tercera', 'segunda', 'primera'],
  },
  posicionHabitual: { type: 'string', enum: ['revés', 'drive'] },
  manoDominante: { type: 'string', enum: ['zurdo', 'diestro'] },
  sexo: { type: 'string', enum: ['masculino', 'femenino'] },
  telefono: { type: 'string', example: '1123456789' },
  rol: { type: 'string', enum: ['administrador', 'jugador'] },
};

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'API Sistema de Gestion de Padel',
      version: '1.0.0',
      description:
        'API REST del complejo de padel. La sesion se mantiene en una cookie HTTPOnly con JWT.',
    },
    servers: [{ url: `http://localhost:${config.server.port}`, description: 'Servidor local' }],
    tags: [
      { name: 'Auth', description: 'Registro, inicio de sesion y cierre de sesion' },
      {
        name: 'Usuarios',
        description:
          'Gestion del perfil y de usuarios. El rol administrador cubre a dueno y empleado del complejo.',
      },
      { name: 'Canchas', description: 'Gestion del inventario de canchas' },
      { name: 'Turnos', description: 'Carga manual de turnos de 90 minutos' },
        { name: 'Reservas', description: 'Solicitudes, cupos, decisiones de reserva y avisos al administrador' },
      { name: 'Partidos', description: 'Partidos incompletos, huecos e inscripcion de jugadores' },
      { name: 'Health', description: 'Consultas de disponibilidad del servidor' },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: config.cookie.name,
        },
      },
      schemas: {
        Usuario: usuarioSchema,
        HealthStatus: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['ok', 'degraded'], example: 'ok' },
            server: { type: 'string', example: 'up' },
            database: { type: 'string', enum: ['up', 'down'], example: 'up' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'error' },
            message: { type: 'string', example: 'Mensaje de error' },
          },
        },
        SuccessUserResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'success' },
            data: { $ref: '#/components/schemas/Usuario' },
          },
        },
        SuccessUsersResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'success' },
            data: { type: 'array', items: { $ref: '#/components/schemas/Usuario' } },
            meta: {
              type: 'object',
              properties: {
                page: { type: 'integer', example: 1 },
                limit: { type: 'integer', example: 10 },
                total: { type: 'integer', example: 25 },
              },
            },
          },
        },
        RegisterRequest: {
          type: 'object',
          additionalProperties: false,
          required: [
            'nombre',
            'email',
            'password',
            'categoria',
            'posicionHabitual',
            'manoDominante',
            'sexo',
            'telefono',
          ],
          properties: {
            nombre: userFields.nombre,
            email: userFields.email,
            password: userFields.password,
            categoria: userFields.categoria,
            posicionHabitual: userFields.posicionHabitual,
            manoDominante: userFields.manoDominante,
            sexo: userFields.sexo,
            telefono: userFields.telefono,
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: userFields.email,
            password: { type: 'string', example: 'secreto123' },
          },
        },
        UserCreateRequest: {
          type: 'object',
          required: [
            'nombre',
            'email',
            'password',
            'categoria',
            'posicionHabitual',
            'manoDominante',
            'sexo',
            'telefono',
          ],
          properties: {
            nombre: userFields.nombre,
            email: userFields.email,
            password: userFields.password,
            categoria: userFields.categoria,
            posicionHabitual: userFields.posicionHabitual,
            manoDominante: userFields.manoDominante,
            sexo: userFields.sexo,
            telefono: userFields.telefono,
            rol: userFields.rol,
          },
        },
        UserUpdateRequest: {
          type: 'object',
          properties: {
            nombre: userFields.nombre,
            email: userFields.email,
            password: userFields.password,
            categoria: userFields.categoria,
            posicionHabitual: userFields.posicionHabitual,
            manoDominante: userFields.manoDominante,
            sexo: userFields.sexo,
            telefono: userFields.telefono,
            rol: userFields.rol,
          },
        },
        Cancha: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            nombre: { type: 'string', example: 'Cancha 1' },
            bloqueada: { type: 'boolean', example: false },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        CanchaCreateRequest: {
          type: 'object',
          required: ['nombre'],
          properties: {
            nombre: { type: 'string', example: 'Cancha 1' },
            bloqueada: { type: 'boolean', example: false },
          },
        },
        CanchaUpdateRequest: {
          type: 'object',
          properties: {
            nombre: { type: 'string', example: 'Cancha 1' },
            bloqueada: { type: 'boolean', example: true },
          },
        },
        SuccessCanchaResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'success' },
            data: { $ref: '#/components/schemas/Cancha' },
          },
        },
        SuccessCanchasResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'success' },
            data: { type: 'array', items: { $ref: '#/components/schemas/Cancha' } },
            meta: {
              type: 'object',
              properties: {
                page: { type: 'integer', example: 1 },
                limit: { type: 'integer', example: 10 },
                total: { type: 'integer', example: 5 },
              },
            },
          },
        },
        Turno: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            canchaId: { type: 'integer', example: 1 },
            fechaHoraInicio: { type: 'string', format: 'date-time' },
            fechaHoraFin: { type: 'string', format: 'date-time' },
            estado: {
              type: 'string',
              enum: ['disponible', 'reservado', 'cancelado', 'jugado', 'bloqueado'],
              example: 'disponible',
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        TurnoCreateRequest: {
          type: 'object',
          required: ['canchaId', 'fechaHoraInicio'],
          properties: {
            canchaId: { type: 'integer', minimum: 1, example: 1 },
            fechaHoraInicio: { type: 'string', format: 'date-time', example: '2026-11-22T10:00:00.000Z' },
          },
        },
        TurnoUpdateRequest: {
          type: 'object',
          properties: {
            fechaHoraInicio: { type: 'string', format: 'date-time', example: '2026-11-22T10:00:00.000Z' },
            estado: {
              type: 'string',
              enum: ['disponible', 'reservado', 'cancelado', 'jugado', 'bloqueado'],
            },
          },
        },
        SuccessTurnoResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'success' },
            data: { $ref: '#/components/schemas/Turno' },
          },
        },
        SuccessTurnosResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'success' },
            data: { type: 'array', items: { $ref: '#/components/schemas/Turno' } },
            meta: {
              type: 'object',
              properties: {
                page: { type: 'integer', example: 1 },
                limit: { type: 'integer', example: 10 },
                total: { type: 'integer', example: 8 },
              },
            },
          },
        },
        Inscripcion: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 3 },
            nombre: { type: 'string', example: 'Ana Perez' },
            categoria: { type: 'string', example: 'octava' },
          },
        },
        Partido: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            reservaId: { type: 'integer', example: 1 },
            categoria: {
              type: 'string',
              enum: ['octava', 'séptima', 'sexta', 'quinta', 'cuarta', 'tercera', 'segunda', 'primera'],
              example: 'octava',
            },
            estado: {
              type: 'string',
              enum: ['incompleto', 'completo', 'cancelado', 'jugado'],
              example: 'incompleto',
            },
            cupoMaximo: { type: 'integer', example: 4 },
            lugaresOcupados: { type: 'integer', example: 1 },
            lugaresFaltantes: { type: 'integer', example: 3 },
            esCompleta: { type: 'boolean', example: false },
            inscriptos: {
              type: 'array',
              items: { $ref: '#/components/schemas/Inscripcion' },
            },
            turno: { $ref: '#/components/schemas/Turno' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        PartidoCreateRequest: {
          type: 'object',
          required: ['reservaId', 'categoria'],
          properties: {
            reservaId: { type: 'integer', minimum: 1, example: 1 },
            categoria: {
              type: 'string',
              enum: ['octava', 'séptima', 'sexta', 'quinta', 'cuarta', 'tercera', 'segunda', 'primera'],
              example: 'octava',
            },
          },
        },
        PartidoUpdateRequest: {
          type: 'object',
          properties: {
            categoria: {
              type: 'string',
              enum: ['octava', 'séptima', 'sexta', 'quinta', 'cuarta', 'tercera', 'segunda', 'primera'],
            },
            estado: { type: 'string', enum: ['jugado'] },
          },
        },
        SuccessPartidoResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'success' },
            data: { $ref: '#/components/schemas/Partido' },
          },
        },
        SuccessPartidosResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'success' },
            data: { type: 'array', items: { $ref: '#/components/schemas/Partido' } },
            meta: {
              type: 'object',
              properties: {
                page: { type: 'integer', example: 1 },
                limit: { type: 'integer', example: 10 },
                total: { type: 'integer', example: 2 },
              },
            },
          },
        },
        Reserva: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            turnoId: { type: 'integer', example: 1 },
            usuarioId: { type: 'integer', example: 2 },
            estado: {
              type: 'string',
              enum: ['pendiente', 'confirmada', 'rechazada', 'cancelada'],
              example: 'pendiente',
            },
            cupoMaximo: { type: 'integer', example: 4 },
            cuposOcupados: { type: 'integer', example: 2 },
            lugaresOcupados: { type: 'integer', example: 2 },
            lugaresFaltantes: { type: 'integer', example: 2 },
            esCompleta: { type: 'boolean', example: false },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        ReservaCreateRequest: {
          type: 'object',
          required: ['turnoId', 'cuposOcupados'],
          properties: {
            turnoId: { type: 'integer', minimum: 1, example: 1 },
            cuposOcupados: { type: 'integer', minimum: 1, maximum: 4, example: 2 },
          },
        },
        ReservaCuposRequest: {
          type: 'object',
          required: ['cuposOcupados'],
          properties: {
            cuposOcupados: { type: 'integer', minimum: 1, maximum: 4, example: 4 },
          },
        },
        SuccessReservaResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'success' },
            data: { $ref: '#/components/schemas/Reserva' },
          },
        },
        SuccessReservasResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'success' },
            data: { type: 'array', items: { $ref: '#/components/schemas/Reserva' } },
            meta: {
              type: 'object',
              properties: {
                page: { type: 'integer', example: 1 },
                limit: { type: 'integer', example: 10 },
                total: { type: 'integer', example: 3 },
              },
            },
          },
        },
        GenerarTurnosRequest: {
          type: 'object',
          properties: {
            fecha: { type: 'string', format: 'date', example: '2026-11-25' },
            canchaId: { type: 'integer', minimum: 1, example: 1 },
          },
        },
        GenerarTurnosResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'success' },
            data: {
              type: 'object',
              properties: {
                fecha: { type: 'string', format: 'date', example: '2026-11-25' },
                creados: { type: 'integer', example: 20 },
                total: { type: 'integer', example: 20 },
              },
            },
          },
        },
        Notificacion: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 4 },
            tipo: { type: 'string', example: 'reserva' },
            mensaje: { type: 'string', example: 'Nueva reserva de Ana Perez' },
            estado: { type: 'string', example: 'pendiente' },
            cancha: { type: 'string', example: 'Cancha 1 — Central' },
            fechaHora: { type: 'string', format: 'date-time' },
            solicitante: {
              type: 'object',
              properties: {
                id: { type: 'integer', example: 2 },
                nombre: { type: 'string', example: 'Ana Perez' },
                email: { type: 'string', format: 'email' },
              },
            },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        SuccessNotificacionesResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'success' },
            data: { type: 'array', items: { $ref: '#/components/schemas/Notificacion' } },
            meta: {
              type: 'object',
              properties: {
                page: { type: 'integer', example: 1 },
                limit: { type: 'integer', example: 10 },
                total: { type: 'integer', example: 3 },
              },
            },
          },
        },
      },
    },
  },
  apis: [routesGlob],
};

const swaggerSpec = swaggerJsdoc(options);

export { swaggerSpec };
