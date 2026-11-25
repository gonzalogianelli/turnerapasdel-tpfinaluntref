import { useEffect } from 'react';
import { labelFor, toneFor } from '../api/catalogs.js';
import { initials } from '../utils/format.js';
import { Icon } from './Icon.jsx';

export function Badge({ tone = 'neutral', children, dot = true }) {
  return (
    <span className={`badge badge--${tone}`}>
      {dot && <span className="tone-dot" />}
      {children}
    </span>
  );
}

export function StatusBadge({ value, catalog, fallback = '—' }) {
  if (!value) return <span className="text-muted">{fallback}</span>;
  return <Badge tone={toneFor(catalog, value)}>{labelFor(catalog, value)}</Badge>;
}

export function Card({ title, subtitle, actions, children, className = '', padded = true, headerFlush = false }) {
  return (
    <section className={`card ${padded ? 'card--pad' : ''} ${className}`}>
      {(title || actions) && (
        <header className={`card__header ${headerFlush ? 'card__header--flush' : ''}`}>
          <div>
            {title && <h2 className="card__title">{title}</h2>}
            {subtitle && <p className="card__subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="row">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <header className="page-header">
      <div>
        {eyebrow && <div className="login-heading__eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p className="page-subtitle">{description}</p>}
      </div>
      {actions && <div className="row">{actions}</div>}
    </header>
  );
}

export function SectionHeading({ title, description, actions }) {
  return (
    <div className="section-heading">
      <div>
        <h2>{title}</h2>
        {description && <p className="text-small text-muted">{description}</p>}
      </div>
      {actions && <div className="row">{actions}</div>}
    </div>
  );
}

export function LoadingState({ label = 'Cargando información…' }) {
  return (
    <div className="loading-block">
      <span className="spinner" />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({ title, description, action, icon = 'court' }) {
  return (
    <div className="empty-state">
      <span className="empty-state__icon">
        <Icon name={icon} size={19} />
      </span>
      <strong>{title}</strong>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}

export function Alert({ variant = 'info', title, children }) {
  return (
    <div className={`alert alert--${variant}`}>
      <Icon name={variant === 'error' ? 'alert' : variant === 'success' ? 'check' : 'info'} size={17} />
      <div>
        {title && <strong>{title}</strong>}
        {children}
      </div>
    </div>
  );
}

export function Avatar({ name, dark = false, large = false }) {
  return (
    <span className={`avatar ${dark ? 'avatar--dark' : ''} ${large ? 'avatar--large' : ''}`}>
      {initials(name) || '?'}
    </span>
  );
}

export function Modal({ open, onClose, title, subtitle, children, footer, wide = false }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'modal--wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal__header">
          <div>
            <h2>{title}</h2>
            {subtitle && <p className="card__subtitle">{subtitle}</p>}
          </div>
          <button type="button" className="icon-button" aria-label="Cerrar" onClick={onClose}>
            <Icon name="close" size={17} />
          </button>
        </header>
        <div className="modal__body">{children}</div>
        {footer && <footer className="modal__footer">{footer}</footer>}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title = 'Confirmar acción',
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Volver',
  tone = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <>
          <button type="button" className="button button--outline" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`button ${tone === 'danger' ? 'button--danger' : ''}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Procesando…' : confirmLabel}
          </button>
        </>
      }
    >
      <div className="confirm-dialog">
        <p>{message}</p>
      </div>
    </Modal>
  );
}

export function QuotaMeter({ occupied = 0, total = 4, label = 'Jugadores' }) {
  const percentage = Math.min(100, Math.max(0, (occupied / total) * 100));
  return (
    <div className="quota-meter">
      <div className="quota-meter__head">
        <span className="text-muted">{label}</span>
        <strong>
          {occupied}/{total}
        </strong>
      </div>
      <div className="quota-meter__bar">
        <div className="quota-meter__fill" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

export function StatusTimeline({ steps, current }) {
  const currentIndex = Math.max(0, steps.findIndex((step) => step.value === current));
  return (
    <div className="status-timeline" aria-label="Estado de la reserva">
      {steps.map((step, index) => (
        <div key={step.value} className="row" style={{ flex: index === steps.length - 1 ? '0 0 auto' : '1 1 0' }}>
          <div className={`status-timeline__step ${index <= currentIndex ? 'status-timeline__step--done' : ''}`}>
            <span className="status-timeline__dot">{index <= currentIndex ? <Icon name="check" size={12} strokeWidth={3} /> : index + 1}</span>
            <span>{step.short}</span>
          </div>
          {index < steps.length - 1 && (
            <span className={`status-timeline__line ${index < currentIndex ? 'status-timeline__line--done' : ''}`} />
          )}
        </div>
      ))}
    </div>
  );
}

export function TableShell({ children }) {
  return <div className="table-wrap">{children}</div>;
}
