const DEFAULT_API_URL = 'http://localhost:3000';

export const API_BASE_URL = (import.meta.env.VITE_API_URL || DEFAULT_API_URL).replace(/\/$/, '');

const STATUS_MESSAGES = {
  400: 'Revisá los datos ingresados e intentá nuevamente.',
  401: 'Tu sesión venció. Ingresá nuevamente para continuar.',
  403: 'No tenés permisos para realizar esta acción.',
  404: 'No encontramos el recurso solicitado.',
  409: 'La operación entra en conflicto con el estado actual.',
  500: 'Ocurrió un error inesperado en el servidor.',
};

const AUTH_PATHS = new Set(['/api/auth/login', '/api/auth/register']);
const unauthorizedListeners = new Set();

export const onUnauthorized = (listener) => {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
};

export class ApiError extends Error {
  constructor(status, message, payload) {
    super(message || STATUS_MESSAGES[status] || 'No se pudo completar la solicitud.');
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

const createHeaders = (body, customHeaders) => {
  const headers = new Headers(customHeaders || {});
  if (body !== undefined && !(body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return headers;
};

const parsePayload = async (response) => {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

export const request = async (path, { method = 'GET', body, headers, signal, suppressUnauthorized = false } = {}) => {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: createHeaders(body, headers),
      credentials: 'include',
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw new ApiError(
      0,
      `No se pudo conectar con ${API_BASE_URL}. Verificá que el backend esté en marcha.`,
    );
  }

  const payload = await parsePayload(response);

  if (!response.ok) {
    const error = new ApiError(response.status, payload?.message, payload);
    const basePath = path.split('?')[0];
    if (response.status === 401 && !AUTH_PATHS.has(basePath) && !suppressUnauthorized) {
      unauthorizedListeners.forEach((listener) => listener(error));
    }
    throw error;
  }

  return payload;
};

export const api = {
  get: (path, options) => request(path, options),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  patch: (path, body, options) => request(path, { ...options, method: 'PATCH', body }),
  delete: (path, options) => request(path, { ...options, method: 'DELETE' }),
};

export const queryString = (params = {}) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  });
  const encoded = search.toString();
  return encoded ? `?${encoded}` : '';
};
