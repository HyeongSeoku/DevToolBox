import React from "react";

type CheckboxProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  label?: string;
  helperText?: string;
  ariaLabel?: string;
};

export const Checkbox: React.FC<CheckboxProps> = ({
  id,
  label,
  helperText,
  ariaLabel,
  className = "",
  ...rest
}) => {
  const inputId = id || rest.name || undefined;
  const helpId = helperText ? `${inputId}-help` : undefined;

  return (
    <label style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
      <input
        id={inputId}
        type="checkbox"
        className={className}
        aria-describedby={helpId}
        aria-label={ariaLabel}
        {...rest}
      />
      <div style={{ display: "flex", flexDirection: "column" }}>
        {label && <span>{label}</span>}
        {helperText && (
          <span
            id={helpId}
            style={{ fontSize: 12, color: "var(--text-subtle)" }}
          >
            {helperText}
          </span>
        )}
      </div>
    </label>
  );
};
