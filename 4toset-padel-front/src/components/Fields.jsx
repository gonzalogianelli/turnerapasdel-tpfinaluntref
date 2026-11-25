import { useState } from 'react';
import { Icon } from './Icon.jsx';

export function Field({ label, name, hint, error, required, children, className = '' }) {
  return (
    <div className={`field ${className}`}>
      {label && (
        <label className="field__label" htmlFor={name}>
          {label} {required && <span aria-hidden="true">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <span className="field__error" role="alert">
          {error}
        </span>
      ) : (
        hint && <span className="field__hint">{hint}</span>
      )}
    </div>
  );
}

export function InputField({
  label,
  name,
  hint,
  error,
  required,
  type = 'text',
  as = 'input',
  options = [],
  placeholder,
  className = '',
  inputClassName = '',
  ...props
}) {
  const controlClass = inputClassName || (as === 'select' ? 'select' : as === 'textarea' ? 'textarea' : 'input');
  const shared = {
    id: name,
    name,
    className: controlClass,
    'aria-invalid': error ? 'true' : undefined,
    placeholder,
    ...props,
  };

  let control;
  if (as === 'select') {
    control = (
      <select {...shared}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  } else if (as === 'textarea') {
    control = <textarea {...shared} />;
  } else {
    control = <input type={type} {...shared} />;
  }

  return (
    <Field label={label} name={name} hint={hint} error={error} required={required} className={className}>
      {control}
    </Field>
  );
}

export function CheckboxField({ label, description, ...props }) {
  return (
    <label className="checkbox-field">
      <input type="checkbox" {...props} />
      <span>
        <strong className="text-strong">{label}</strong>
        {description && <span className="text-small text-muted">{description}</span>}
      </span>
    </label>
  );
}

export function PasswordField({ label, name, hint, error, required, ...props }) {
  const [visible, setVisible] = useState(false);

  return (
    <Field label={label} name={name} hint={hint} error={error} required={required}>
      <div className="password-field">
        <input
          id={name}
          name={name}
          type={visible ? 'text' : 'password'}
          className="input"
          aria-invalid={error ? 'true' : undefined}
          {...props}
        />
        <button
          type="button"
          className="password-field__toggle"
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
        >
          <Icon name={visible ? 'eyeOff' : 'eye'} size={18} />
        </button>
      </div>
    </Field>
  );
}

export function SubmitError({ error, title }) {
  if (!error) return null;
  return (
    <div className="alert alert--error" role="alert">
      <Icon name="alert" size={17} />
      <div>
        {title && <strong>{title}</strong>}
        {error}
      </div>
    </div>
  );
}
