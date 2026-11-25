import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

class Cancha extends Model {}

Cancha.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { notEmpty: true },
    },
    bloqueada: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'Cancha',
    tableName: 'canchas',
    timestamps: true,
    paranoid: true,
  },
);

export { Cancha };
