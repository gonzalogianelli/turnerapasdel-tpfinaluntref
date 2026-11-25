import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { logger } from '../config/logger.js';
import { User } from './User.js';
import { Cancha } from './Cancha.js';
import { Turno, DURACION_TURNO_MINUTOS, ESTADOS_TURNO, TURNOS_ACTIVOS } from './Turno.js';
import { Reserva, CUPO_MAXIMO, ESTADOS_RESERVA, RESERVAS_ACTIVAS } from './Reserva.js';
import {
  Partido,
  CUPO_MAXIMO_PARTIDO,
  ESTADOS_PARTIDO,
  ESTADOS_PARTIDO_ACTIVOS,
} from './Partido.js';
import { Inscripcion } from './Inscripcion.js';

Cancha.hasMany(Turno, { foreignKey: 'canchaId' });
Turno.belongsTo(Cancha, { foreignKey: 'canchaId' });

Turno.hasMany(Reserva, { foreignKey: 'turnoId' });
Reserva.belongsTo(Turno, { foreignKey: 'turnoId' });

User.hasMany(Reserva, { foreignKey: 'usuarioId' });
Reserva.belongsTo(User, { foreignKey: 'usuarioId' });

Reserva.hasOne(Partido, { foreignKey: 'reservaId' });
Partido.belongsTo(Reserva, { foreignKey: 'reservaId' });

Partido.hasMany(Inscripcion, { foreignKey: 'partidoId', as: 'inscripciones' });
Inscripcion.belongsTo(Partido, { foreignKey: 'partidoId' });

User.hasMany(Inscripcion, { foreignKey: 'usuarioId', as: 'inscripciones' });
Inscripcion.belongsTo(User, { foreignKey: 'usuarioId' });

const modelosConBajaLogica = [User, Cancha, Turno, Reserva, Partido, Inscripcion];

const ensureDeletedAtColumn = async (model) => {
  const queryInterface = sequelize.getQueryInterface();
  const description = await queryInterface.describeTable(model.tableName);
  if (description.deletedAt) return false;

  await queryInterface.addColumn(model.tableName, 'deletedAt', {
    type: DataTypes.DATE,
    allowNull: true,
  });
  return true;
};

const initModels = async () => {
  await sequelize.sync();

  const columnasAgregadas = [];
  for (const model of modelosConBajaLogica) {
    if (await ensureDeletedAtColumn(model)) {
      columnasAgregadas.push(model.tableName);
    }
  }
  logger.info({ columnasAgregadas }, 'Modelos sincronizados con MySQL');

  return { User, Cancha, Turno, Reserva, Partido, Inscripcion };
};

export {
  sequelize,
  User,
  Cancha,
  Turno,
  Reserva,
  Partido,
  Inscripcion,
  CUPO_MAXIMO_PARTIDO,
  ESTADOS_PARTIDO,
  ESTADOS_PARTIDO_ACTIVOS,
  DURACION_TURNO_MINUTOS,
  ESTADOS_TURNO,
  TURNOS_ACTIVOS,
  CUPO_MAXIMO,
  ESTADOS_RESERVA,
  RESERVAS_ACTIVAS,
  initModels,
};
