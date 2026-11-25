import { app } from './app.js';
import { config } from './config/env.js';
import { logger } from './config/logger.js';
import { connectDatabase, closeDatabase } from './config/database.js';
import { initModels } from './models/index.js';

let server = null;
let shuttingDown = false;

const shutdown = async (signal, exitCode = 0) => {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info({ signal }, 'Cerrando servidor');

  try {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
      logger.info('Servidor HTTP cerrado');
    }

    await closeDatabase();
    process.exit(exitCode);
  } catch (error) {
    logger.error({ err: error }, 'Error durante el cierre del servidor');
    process.exit(1);
  }
};

const start = async () => {
  try {
    await connectDatabase();
    await initModels();

    server = app.listen(config.server.port, () => {
      logger.info({ port: config.server.port, env: config.env }, 'Servidor iniciado');
    });
  } catch (error) {
    logger.error({ err: error }, 'No se pudo iniciar el servidor');
    await closeDatabase().catch((closeError) => {
      logger.error({ err: closeError }, 'Error al cerrar la conexion durante el fallo de arranque');
    });
    process.exit(1);
  }
};

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'Promesa rechazada sin manejar');
  void shutdown('unhandledRejection', 1);
});

process.on('uncaughtException', (error) => {
  logger.error({ err: error }, 'Excepcion no capturada');
  void shutdown('uncaughtException', 1);
});

void start();
