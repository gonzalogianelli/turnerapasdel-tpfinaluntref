import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const ToastContext = createContext(null);

let nextToastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback(
    (type, message) => {
      const id = ++nextToastId;
      setToasts((current) => [...current, { id, type, message }]);
      window.setTimeout(() => dismiss(id), 5000);
      return id;
    },
    [dismiss],
  );

  const success = useCallback((message) => notify('success', message), [notify]);
  const error = useCallback((message) => notify('error', message), [notify]);
  const info = useCallback((message) => notify('info', message), [notify]);

  const value = useMemo(() => ({ success, error, info, dismiss }), [success, error, info, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast--${toast.type}`}>
            <span className="toast__label">
              {toast.type === 'error' ? 'Atención' : toast.type === 'success' ? 'Listo' : 'Información'}
            </span>
            <span className="toast__message">{toast.message}</span>
            <button
              type="button"
              className="toast__close"
              aria-label="Cerrar aviso"
              onClick={() => dismiss(toast.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast debe usarse dentro de ToastProvider');
  return context;
}
