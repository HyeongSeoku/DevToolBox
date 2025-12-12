import { forwardRef } from "react";

import styles from "./Range.module.scss";

type RangeProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label?: string;
  valueText?: string;
};

type ExtendedRangeProps = RangeProps & {
  thumbSize?: number;
  trackHeight?: number;
};

export const Range = forwardRef<HTMLInputElement, ExtendedRangeProps>(
  (
    { label, valueText, className, style, thumbSize, trackHeight, ...rest },
    ref,
  ) => {
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
    const trackH = trackHeight ?? 8;
    const thumb = thumbSize ?? 16;

    return (
      <label className={styles.wrapper}>
        {(label || valueText) && (
          <div className={styles.labelRow}>
            {label && <span>{label}</span>}
            {valueText && <span>{valueText}</span>}
          </div>
        )}
        <div className={styles.rangeContainer} style={style}>
          <div
            className={styles.track}
            style={{ height: trackH, borderRadius: trackH / 2 }}
          >
            <div
              className={styles.fill}
              style={{
                width: `${percent}%`,
                height: trackH,
                borderRadius: trackH / 2,
              }}
            />
          </div>
          <input
            ref={ref}
            type="range"
            className={`${styles.input} ${className ?? ""}`}
            style={{
              height: Math.max(trackH, thumb),
              ["--range-thumb-size" as const]: `${thumb}px`,
            }}
            {...rest}
          />
        </div>
      </label>
    );
  },
);

Range.displayName = "Range";
