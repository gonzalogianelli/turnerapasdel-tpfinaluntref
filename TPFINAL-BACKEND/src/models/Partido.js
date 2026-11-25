import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';
import { CATEGORIAS } from './User.js';
import { Reserva } from './Reserva.js';

const CUPO_MAXIMO_PARTIDO = 4;
const ESTADOS_PARTIDO = ['incompleto', 'completo', 'cancelado', 'jugado'];
const ESTADOS_PARTIDO_ACTIVOS = ['incompleto', 'completo'];

class Partido extends Model {}

Partido.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    reservaId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: { model: Reserva, key: 'id' },
    },
    categoria: {
      type: DataTypes.ENUM(...CATEGORIAS),
      allowNull: false,
    },
    estado: {
      type: DataTypes.ENUM(...ESTADOS_PARTIDO),
      allowNull: false,
      defaultValue: 'incompleto',
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'Partido',
    tableName: 'partidos',
    timestamps: true,
    paranoid: true,
  },
);

export {
  Partido,
  CUPO_MAXIMO_PARTIDO,
  ESTADOS_PARTIDO,
  ESTADOS_PARTIDO_ACTIVOS,
};
