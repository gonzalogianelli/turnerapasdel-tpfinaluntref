import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';
import { Partido } from './Partido.js';
import { User } from './User.js';

class Inscripcion extends Model {}

Inscripcion.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    partidoId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Partido, key: 'id' },
    },
    usuarioId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: User, key: 'id' },
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'Inscripcion',
    tableName: 'inscripciones',
    timestamps: true,
    paranoid: true,
    indexes: [
      {
        unique: true,
        name: 'inscripciones_partido_usuario_unique',
        fields: ['partidoId', 'usuarioId'],
      },
    ],
  },
);

export { Inscripcion };
