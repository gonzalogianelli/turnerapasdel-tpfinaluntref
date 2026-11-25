const CLAVE = 'reserva-seleccion';

export const guardarSeleccion = (seleccion) => {
  if (!seleccion) {
    sessionStorage.removeItem(CLAVE);
    return;
  }
  sessionStorage.setItem(CLAVE, JSON.stringify(seleccion));
};

export const leerSeleccion = () => {
  try {
    const valor = sessionStorage.getItem(CLAVE);
    return valor ? JSON.parse(valor) : null;
  } catch {
    return null;
  }
};
