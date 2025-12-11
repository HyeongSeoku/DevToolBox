import { forwardRef, type ButtonHTMLAttributes, type Ref } from "react";

import styles from "./Button.module.scss";

type Variant = "default" | "primary" | "ghost" | "pill";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  active?: boolean;
  ref?: Ref<HTMLButtonElement>;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = "default", active = false, className, children, ...props },
    ref,
  ) => {
    const classes = [
      styles.button,
      styles[variant],
      active ? styles.active : "",
      className ?? "",
    ]
      .filter(Boolean)
      .join(" ");
    return (
      <button ref={ref} className={classes} {...props}>
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
