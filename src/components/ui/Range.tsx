import { forwardRef } from "react";

import styles from "./Range.module.scss";

type RangeProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label?: string;
  valueText?: string;
};

export const Range = forwardRef<HTMLInputElement, RangeProps>(
  ({ label, valueText, className, ...rest }, ref) => {
    const min = rest.min !== undefined ? Number(rest.min) : 0;
    const max = rest.max !== undefined ? Number(rest.max) : 100;
    const rawVal =
      rest.value !== undefined
        ? Number(rest.value)
        : rest.defaultValue !== undefined
          ? Number(rest.defaultValue)
          : min;
    const clamped = Number.isFinite(rawVal)
      ? Math.min(Math.max(rawVal, min), max)
      : min;
    const percent = max === min ? 0 : ((clamped - min) / (max - min)) * 100;
    const fill = `linear-gradient(90deg, var(--secondary-300) 0%, var(--secondary-300) ${percent}%, var(--surface-muted) ${percent}%, var(--surface-muted) 100%)`;
    const trackStyle = {
      "--range-fill": fill,
    } as React.CSSProperties;

    return (
      <label className={styles.wrapper}>
        {(label || valueText) && (
          <div className={styles.labelRow}>
            {label && <span>{label}</span>}
            {valueText && <span>{valueText}</span>}
          </div>
        )}
        <input
          ref={ref}
          type="range"
          className={`${styles.track} ${className ?? ""}`}
          style={trackStyle}
          {...rest}
        />
      </label>
    );
  },
);

Range.displayName = "Range";
