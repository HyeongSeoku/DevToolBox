import React, { forwardRef } from "react";

type Option = { value: string; label: string; disabled?: boolean };

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  helperText?: string;
  error?: string;
  options: Option[];
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ id, label, helperText, error, options, className = "", ...rest }, ref) => {
    const selectId = id || rest.name || undefined;
    const helpId = helperText ? `${selectId}-help` : undefined;
    const errId = error ? `${selectId}-error` : undefined;
    const describedBy = [helpId, errId].filter(Boolean).join(" ") || undefined;

    return (
      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {label && (
          <span style={{ fontSize: 12, color: "var(--text-subtle)" }}>
            {label}
          </span>
        )}
        <select
          id={selectId}
          ref={ref}
          className={className}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          {...rest}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
        {helperText && (
          <span id={helpId} style={{ fontSize: 12, color: "var(--text-subtle)" }}>
            {helperText}
          </span>
        )}
        {error && (
          <span id={errId} style={{ fontSize: 12, color: "var(--secondary-300)" }}>
            {error}
          </span>
        )}
      </label>
    );
  },
);

Select.displayName = "Select";
