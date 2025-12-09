import React, { forwardRef } from "react";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  helperText?: string;
  error?: string;
  required?: boolean;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ id, label, helperText, error, required, className = "", ...rest }, ref) => {
    const inputId = id || rest.name || undefined;
    const helpId = helperText ? `${inputId}-help` : undefined;
    const errId = error ? `${inputId}-error` : undefined;
    const describedBy = [helpId, errId].filter(Boolean).join(" ") || undefined;
    const unsafeCheckbox = rest.type === "checkbox";
    const inputType = unsafeCheckbox ? "text" : rest.type;

    if (unsafeCheckbox && typeof console !== "undefined") {
      console.warn('Input does not support type="checkbox"; use <Checkbox> instead.');
    }

    return (
      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {label && (
          <span style={{ fontSize: 12, color: "var(--text-subtle)" }}>
            {label}
            {required ? " *" : ""}
          </span>
        )}
        <input
          id={inputId}
          ref={ref}
          type={inputType}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={className}
          {...rest}
        />
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

Input.displayName = "Input";
