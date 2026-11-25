export const HORARIOS_TURNO = [
  '08:00',
  '09:30',
  '11:00',
  '12:30',
  '14:00',
  '15:30',
  '17:00',
  '18:30',
  '20:00',
  '21:30',
];

export const fechaLocalHoy = () => {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const dia = String(hoy.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
};

export const inicioDelBloque = (fecha, hora) => {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const [horas, minutos] = hora.split(':').map(Number);
  return new Date(anio, mes - 1, dia, horas, minutos, 0, 0);
};

export const horaDelTurno = (fechaHoraInicio) => {
  if (!fechaHoraInicio) return '';
  const fecha = new Date(fechaHoraInicio);
  return `${String(fecha.getHours()).padStart(2, '0')}:${String(fecha.getMinutes()).padStart(2, '0')}`;
};

export const rangoEtiqueta = (hora) => {
  const [horas, minutos] = hora.split(':').map(Number);
  const fin = new Date(2000, 0, 1, horas, minutos + 90);
  return `${hora}–${String(fin.getHours()).padStart(2, '0')}:${String(fin.getMinutes()).padStart(2, '0')}`;
};
