import { config } from '../config/env.js';
import { logger } from '../config/logger.js';
import { Cancha, Turno, User } from '../models/index.js';
import { isReservedExampleRecipient, sendEmail } from './mail.service.js';
import { renderEmail } from '../templates/email/index.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ESTADO_TURNO_POR_DECISION = Object.freeze({
  confirmada: 'reservado',
  rechazada: 'disponible',
  cancelada: 'cancelado',
});

const toUserRecord = (value) =>
  value && typeof value.toJSON === 'function' ? value.toJSON() : { ...value };

const normalizeRecipients = (users = []) => {
  const recipients = new Map();

  for (const user of users) {
    const record = toUserRecord(user);
    if (typeof record.email !== 'string') continue;

    const email = record.email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(email) || recipients.has(email)) continue;

    recipients.set(email, { email, nombre: record.nombre || '' });
  }

  return [...recipients.values()];
};

const findAdminFromEnv = () => {
  const email = config.smtp.adminNotifyEmail;
  return email ? [{ email, nombre: '' }] : [];
};

const findUserById = (id) =>
  User.findByPk(id, { attributes: ['id', 'nombre', 'email'], paranoid: false });

const findTurnoById = (id) =>
  Turno.findByPk(id, { attributes: ['id', 'canchaId', 'fechaHoraInicio', 'estado'] });

const findCanchaById = (id) => Cancha.findByPk(id, { attributes: ['id', 'nombre'] });

const resolveAdmin = async (deps) => {
  const resolver = deps.findAdmin ?? findAdminFromEnv;
  try {
    return await resolver();
  } catch (error) {
    logger.warn(
      { event: 'email.admin_lookup_failed', error: error?.message },
      'No se pudo resolver el destinatario administrador',
    );
    return [];
  }
};

const dispatchEvent = async ({ event, jugadores = [], context, templateKey, deps = {} }) => {
  try {
    const admin = await resolveAdmin(deps);
    const allRecipients = normalizeRecipients([...jugadores, ...admin]);
    const recipients = allRecipients.filter(
      (recipient) => !isReservedExampleRecipient(recipient.email),
    );
    const skippedCount = allRecipients.length - recipients.length;

    if (skippedCount > 0) {
      logger.warn(
        { event: 'email.example_domain_skipped', notificationEvent: event, skippedCount },
        'Se omitieron destinatarios de dominios de ejemplo reservados',
      );
    }

    if (recipients.length === 0) {
      logger.warn({ event, recipientCount: 0 }, 'Notificacion sin destinatarios validos');
      return { sent: 0 };
    }

    const template = renderEmail(templateKey, context);
    const send = deps.sendMail ?? sendEmail;
    let sent = 0;

    for (const recipient of recipients) {
      const result = await send({
        to: recipient.email,
        subject: template.subject,
        text: template.text,
        html: template.html,
        event,
      });
      if (result?.delivered !== false) sent += 1;
    }

    logger.info({ event, recipientCount: recipients.length, sent }, 'Notificacion despachada');
    return { sent };
  } catch (error) {
    logger.warn({ event, error: error?.message }, 'No se pudo despachar la notificacion');
    return { sent: 0 };
  }
};

const safeNotify = (event, factory) => async (...args) => {
  try {
    return await factory(...args);
  } catch (error) {
    logger.warn({ event, error: error?.message }, 'No se pudo preparar la notificacion');
    return { sent: 0 };
  }
};

const loadReservaContext = async (reserva, deps = {}) => {
  const getTurno = deps.findTurno ?? findTurnoById;
  const getCancha = deps.findCancha ?? findCanchaById;
  const turno = await getTurno(reserva.turnoId);
  const cancha = turno ? await getCancha(turno.canchaId) : null;

  return {
    cancha: cancha?.nombre,
    fechaHora: turno?.fechaHoraInicio,
    cuposOcupados: reserva.cuposOcupados,
    lugaresFaltantes: reserva.lugaresFaltantes,
  };
};

const loadPartidoContext = async (partido, deps = {}) => {
  const getCancha = deps.findCancha ?? findCanchaById;
  const turno = partido.turno;
  const cancha = turno?.canchaId ? await getCancha(turno.canchaId) : null;

  return {
    categoria: partido.categoria,
    cancha: cancha?.nombre,
    fechaHora: turno?.fechaHoraInicio,
    lugaresOcupados: partido.lugaresOcupados,
    lugaresFaltantes: partido.lugaresFaltantes,
  };
};

const loadAffectedUser = async (id, deps = {}) => {
  const getUser = deps.findUser ?? findUserById;
  return getUser(id);
};

const notifyUserRegistered = safeNotify('user.registered', (user, deps = {}) =>
  dispatchEvent({
    event: 'user.registered',
    templateKey: 'USER_REGISTERED',
    jugadores: [user],
    context: { nombre: user?.nombre },
    deps,
  }),
);

const notifyReservaSolicitada = safeNotify(
  'reserva.solicitada',
  async (reserva, jugador, deps = {}) => {
    const context = await loadReservaContext(reserva, deps);
    return dispatchEvent({
      event: 'reserva.solicitada',
      templateKey: 'RESERVA_SOLICITADA',
      jugadores: [jugador],
      context: { ...context, nombre: jugador?.nombre },
      deps,
    });
  },
);

const notifyReservaDecidida = (reserva, estado, templateKey, deps, contexto = {}) =>
  (async () => {
    const [context, jugador] = await Promise.all([
      loadReservaContext(reserva, deps),
      loadAffectedUser(reserva.usuarioId, deps),
    ]);

    return dispatchEvent({
      event: `reserva.${estado}`,
      templateKey,
      jugadores: [jugador],
      context: {
        ...context,
        nombre: jugador?.nombre,
        estadoTurno: ESTADO_TURNO_POR_DECISION[estado],
        ...contexto,
      },
      deps,
    });
  })();

const notifyReservaConfirmada = safeNotify('reserva.confirmada', (reserva, deps = {}) =>
  notifyReservaDecidida(reserva, 'confirmada', 'RESERVA_CONFIRMADA', deps),
);

const notifyReservaRechazada = safeNotify('reserva.rechazada', (reserva, deps = {}) =>
  notifyReservaDecidida(reserva, 'rechazada', 'RESERVA_RECHAZADA', deps),
);

const notifyReservaCancelada = safeNotify(
  'reserva.cancelada',
  (reserva, deps = {}, contexto = {}) =>
    notifyReservaDecidida(reserva, 'cancelada', 'RESERVA_CANCELADA', deps, contexto),
);

const notifyPartidoInscripcion = safeNotify(
  'partido.inscripcion',
  async (partido, jugador, deps = {}) => {
    const context = await loadPartidoContext(partido, deps);
    return dispatchEvent({
      event: 'partido.inscripcion',
      templateKey: 'PARTIDO_INSCRIPCION',
      jugadores: [jugador],
      context: { ...context, nombre: jugador?.nombre },
      deps,
    });
  },
);

const notifyPartidoBaja = safeNotify('partido.baja', async (partido, usuarioId, deps = {}) => {
  const [context, jugador] = await Promise.all([
    loadPartidoContext(partido, deps),
    loadAffectedUser(usuarioId, deps),
  ]);

  return dispatchEvent({
    event: 'partido.baja',
    templateKey: 'PARTIDO_BAJA',
    jugadores: [jugador],
    context: { ...context, nombre: jugador?.nombre },
    deps,
  });
});

const notifyPartidoCanceladoQuorum = safeNotify(
  'partido.cancelado_quorum',
  async (partido, inscriptos = [], deps = {}) => {
    const context = await loadPartidoContext(partido, deps);
    return dispatchEvent({
      event: 'partido.cancelado_quorum',
      templateKey: 'PARTIDO_CANCELADO_QUORUM',
      jugadores: inscriptos,
      context,
      deps,
    });
  },
);

export {
  notifyUserRegistered,
  notifyReservaSolicitada,
  notifyReservaConfirmada,
  notifyReservaRechazada,
  notifyReservaCancelada,
  notifyPartidoInscripcion,
  notifyPartidoBaja,
  notifyPartidoCanceladoQuorum,
};
