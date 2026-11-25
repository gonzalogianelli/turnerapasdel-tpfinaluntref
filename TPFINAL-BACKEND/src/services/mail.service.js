import nodemailer from 'nodemailer';
import { config } from '../config/env.js';
import { logger } from '../config/logger.js';

let transporter;

if (!config.smtp.enabled) {
  logger.warn(
    { event: 'email.disabled' },
    'SMTP no configurado; las notificaciones por correo estan deshabilitadas',
  );
}

const buildTransporter = () => {
  if (!config.smtp.enabled) return null;

  const auth =
    config.smtp.user && config.smtp.pass
      ? { user: config.smtp.user, pass: config.smtp.pass }
      : undefined;

  return nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    ...(auth ? { auth } : {}),
  });
};

const getTransporter = () => {
  if (transporter === undefined) {
    transporter = buildTransporter();
  }
  return transporter;
};

const RESERVED_EXAMPLE_DOMAINS = new Set(['example.com', 'example.org', 'example.net']);

const isReservedExampleRecipient = (recipient) => {
  if (typeof recipient !== 'string') return false;

  const email = recipient.trim().toLowerCase().replace(/\.$/, '');
  const domain = email.split('@')[1];
  if (!domain) return false;

  return (
    RESERVED_EXAMPLE_DOMAINS.has(domain) ||
    [...RESERVED_EXAMPLE_DOMAINS].some((reserved) => domain.endsWith(`.${reserved}`)) ||
    domain.endsWith('.example')
  );
};

const recipientCount = (to) => (Array.isArray(to) ? to.length : 1);

const filterDeliverableRecipients = (to) =>
  Array.isArray(to)
    ? to.filter((recipient) => !isReservedExampleRecipient(recipient))
    : isReservedExampleRecipient(to)
      ? []
      : to;

const sendEmail = async (message, overrideTransporter) => {
  const deliverableTo = filterDeliverableRecipients(message.to);
  const skippedCount = Array.isArray(message.to)
    ? message.to.length - deliverableTo.length
    : isReservedExampleRecipient(message.to)
      ? 1
      : 0;

  if (skippedCount > 0) {
    logger.warn(
      { event: 'email.example_domain_skipped', skippedCount },
      'Se omitio el envio SMTP a dominios de ejemplo reservados',
    );
  }

  if (
    skippedCount > 0 &&
    (Array.isArray(deliverableTo) ? deliverableTo.length === 0 : !deliverableTo)
  ) {
    return { delivered: false, reason: 'example-domain' };
  }

  const activeTransporter = overrideTransporter ?? getTransporter();
  if (!activeTransporter) {
    return { delivered: false, reason: 'disabled' };
  }

  try {
    await activeTransporter.sendMail({
      from: config.smtp.from,
      to: deliverableTo,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
    logger.info(
      { event: message.event, recipientCount: recipientCount(deliverableTo) },
      'Correo enviado',
    );
    return { delivered: true };
  } catch (error) {
    logger.warn(
      {
        event: message.event,
        recipientCount: recipientCount(deliverableTo),
        error: error?.message,
      },
      'No se pudo enviar el correo',
    );
    return { delivered: false, reason: 'error' };
  }
};

export { isReservedExampleRecipient, sendEmail };
