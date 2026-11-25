import { DataTypes, Model } from 'sequelize';
import bcrypt from 'bcryptjs';
import { sequelize } from '../config/database.js';

const CATEGORIAS = Object.freeze([
  'octava',
  'séptima',
  'sexta',
  'quinta',
  'cuarta',
  'tercera',
  'segunda',
  'primera',
]);

const POSICIONES = Object.freeze(['revés', 'drive']);
const MANOS = Object.freeze(['zurdo', 'diestro']);
const SEXOS = Object.freeze(['masculino', 'femenino']);
const ROLES = Object.freeze(['administrador', 'jugador']);

const SALT_ROUNDS = 10;

class User extends Model {
  toJSON() {
    const values = { ...this.get() };
    delete values.password;
    return values;
  }
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    categoria: {
      type: DataTypes.ENUM(...CATEGORIAS),
      allowNull: false,
    },
    posicionHabitual: {
      type: DataTypes.ENUM(...POSICIONES),
      allowNull: false,
    },
    manoDominante: {
      type: DataTypes.ENUM(...MANOS),
      allowNull: false,
    },
    sexo: {
      type: DataTypes.ENUM(...SEXOS),
      allowNull: false,
    },
    telefono: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    rol: {
      type: DataTypes.ENUM(...ROLES),
      allowNull: false,
      defaultValue: 'jugador',
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'usuarios',
    timestamps: true,
    paranoid: true,
    defaultScope: {
      attributes: { exclude: ['password'] },
    },
    scopes: {
      withPassword: {
        attributes: { include: ['password'] },
      },
    },
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          user.password = await bcrypt.hash(user.password, SALT_ROUNDS);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          user.password = await bcrypt.hash(user.password, SALT_ROUNDS);
        }
      },
    },
  },
);

export { User, CATEGORIAS, POSICIONES, MANOS, SEXOS, ROLES, SALT_ROUNDS };
