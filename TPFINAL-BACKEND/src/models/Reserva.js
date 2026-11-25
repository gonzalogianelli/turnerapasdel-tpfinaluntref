import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';
import { Turno } from './Turno.js';
import { User } from './User.js';

const CUPO_MAXIMO = 4;
const ESTADOS_RESERVA = ['pendiente', 'confirmada', 'rechazada', 'cancelada'];
const RESERVAS_ACTIVAS = ['pendiente', 'confirmada'];

class Reserva extends Model {}

Reserva.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    turnoId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Turno, key: 'id' },
    },
    usuarioId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: User, key: 'id' },
    },
    estado: {
      type: DataTypes.ENUM(...ESTADOS_RESERVA),
      allowNull: false,
      defaultValue: 'pendiente',
    },
    cupoMaximo: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: CUPO_MAXIMO,
      validate: { min: CUPO_MAXIMO, max: CUPO_MAXIMO },
    },
    cuposOcupados: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: { min: 1, max: CUPO_MAXIMO },
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'Reserva',
    tableName: 'reservas',
    timestamps: true,
    paranoid: true,
  },
);

export { Reserva, CUPO_MAXIMO, ESTADOS_RESERVA, RESERVAS_ACTIVAS };
