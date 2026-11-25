import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';
import { Cancha } from './Cancha.js';

const DURACION_TURNO_MINUTOS = 90;
const MILISEGUNDOS_POR_MINUTO = 60 * 1000;
const HORA_APERTURA = 8;
const HORA_CIERRE = 23;
const ESTADOS_TURNO = ['disponible', 'reservado', 'cancelado', 'jugado', 'bloqueado'];
const TURNOS_ACTIVOS = ['disponible', 'reservado', 'bloqueado'];
const CANTIDAD_BLOQUES = Math.floor(((HORA_CIERRE - HORA_APERTURA) * 60) / DURACION_TURNO_MINUTOS);
const HORARIOS_TURNO = Array.from({ length: CANTIDAD_BLOQUES }, (_, indice) => {
  const minutos = HORA_APERTURA * 60 + indice * DURACION_TURNO_MINUTOS;
  const hora = String(Math.floor(minutos / 60)).padStart(2, '0');
  const minuto = String(minutos % 60).padStart(2, '0');
  return `${hora}:${minuto}`;
});

class Turno extends Model {}

Turno.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    canchaId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Cancha, key: 'id' },
    },
    fechaHoraInicio: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    fechaHoraFin: {
      type: DataTypes.DATE,
      allowNull: false,
      validate: {
        duracionCorrecta(value) {
          if (!value || !this.fechaHoraInicio) return;
          const diferencia = new Date(value).getTime() - new Date(this.fechaHoraInicio).getTime();
          if (diferencia !== DURACION_TURNO_MINUTOS * MILISEGUNDOS_POR_MINUTO) {
            throw new Error(`La duracion del turno debe ser de ${DURACION_TURNO_MINUTOS} minutos`);
          }
        },
      },
    },
    estado: {
      type: DataTypes.ENUM(...ESTADOS_TURNO),
      allowNull: false,
      defaultValue: 'disponible',
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'Turno',
    tableName: 'turnos',
    timestamps: true,
    paranoid: true,
  },
);

export {
  Turno,
  DURACION_TURNO_MINUTOS,
  ESTADOS_TURNO,
  TURNOS_ACTIVOS,
  HORA_APERTURA,
  HORA_CIERRE,
  HORARIOS_TURNO,
};
