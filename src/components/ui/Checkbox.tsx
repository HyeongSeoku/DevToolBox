import React from "react";

import CheckIcon from "@/assets/icons/check.svg?react";

import styles from "./Checkbox.module.scss";

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
  const isChecked = Boolean(rest.checked);
  const isDisabled = Boolean(rest.disabled);

  return (
    <label
      style={{
        display: "inline-flex",
        gap: 8,
        alignItems: "center",
        cursor: isDisabled ? "not-allowed" : "pointer",
        opacity: isDisabled ? 0.6 : 1,
        userSelect: "none",
      }}
    >
      <input
        id={inputId}
        type="checkbox"
        className={className}
        aria-describedby={helpId}
        aria-label={ariaLabel}
        {...rest}
        style={{ position: "absolute", opacity: 0, width: 0, height: 0 }}
      />
      <span
        aria-hidden="true"
        style={{
          width: 18,
          height: 18,
          borderRadius: 4,
          border: `1px solid var(--border)`,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          background: isChecked ? "var(--secondary-100)" : "var(--surface)",
          borderColor: isChecked ? "var(--secondary-300)" : "var(--border)",
          transition: "all 0.12s ease",
        }}
      >
        {isChecked && (
          <CheckIcon
            width={14}
            height={14}
            className={styles.icon}
            aria-hidden="true"
          />
        )}
      </span>
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
