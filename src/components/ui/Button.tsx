import { type ButtonHTMLAttributes } from "react";

import styles from "./Button.module.scss";

type Variant = "default" | "primary" | "ghost" | "pill";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  active?: boolean;
};

export function Button({
  variant = "default",
  active = false,
  className,
  children,
  ...props
}: ButtonProps) {
  const classes = [
    styles.button,
    styles[variant],
    active ? styles.active : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
