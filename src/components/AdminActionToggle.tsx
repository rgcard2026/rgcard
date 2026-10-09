'use client';

import * as React from 'react';

type AdminActionToggleProps = {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
};

export default function AdminActionToggle({
  checked,
  label,
  onChange,
  disabled = false,
  className = '',
  id,
}: AdminActionToggleProps) {
  return (
    <button
      id={id}
      type="button"
      className={`rg-action-toggle${checked ? ' rg-action-toggle-on' : ''}${className ? ` ${className}` : ''}`}
      aria-pressed={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      <span className="rg-action-toggle-track" aria-hidden="true">
        <span className="rg-action-toggle-thumb" />
      </span>
      <span className="rg-action-toggle-label">{label}</span>
    </button>
  );
}
