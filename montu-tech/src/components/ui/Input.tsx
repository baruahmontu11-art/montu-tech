import React from 'react';

type Props = React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string };

export default function Input({ label, error, id, className = '', ...rest }: Props) {
  const inputId = id || rest.name;
  return (
    <div className={className}>
      {label && <label htmlFor={inputId} className="label">{label}</label>}
      <input id={inputId} className="input-field" {...rest} />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
