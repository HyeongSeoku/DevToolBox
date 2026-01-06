import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import ArrowDown from "@/assets/icons/arrow_down.svg?react";

import styles from "./Select.module.scss";

type Option = { value: string; label: string; disabled?: boolean };

type SelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  label?: ReactNode;
  className?: string;
  disabled?: boolean;
  ariaLabel?: string;
};

const isOptionDisabled = (opt: Option) => Boolean(opt.disabled);

const getInitialIndex = (options: Option[], value: string) => {
  const idx = options.findIndex((opt) => opt.value === value);
  return idx >= 0 ? idx : 0;
};

const useSelectState = (options: Option[], value: string) => {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(0);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  const openWithActive = useCallback(() => {
    setActiveIndex(getInitialIndex(options, value));
    setOpen(true);
  }, [options, value]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      if (
        triggerRef.current?.contains(event.target as Node) ||
        listRef.current?.contains(event.target as Node)
      ) {
        return;
      }
      close();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
      }
    };
    window.addEventListener("mousedown", handleClick);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handleClick);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    const next = getInitialIndex(options, value);
    setActiveIndex(next);
    const menu = listRef.current?.parentElement as HTMLElement | null;
    menu?.focus();
  }, [open, options, value]);

  return {
    triggerRef,
    listRef,
    open,
    setOpen,
    activeIndex,
    setActiveIndex,
    close,
    openWithActive,
  };
};

export function Select({
  value,
  onChange,
  options,
  placeholder = "Select",
  label,
  className,
  disabled,
  ariaLabel,
}: SelectProps) {
  const id = useId();
  const {
    triggerRef,
    listRef,
    open,
    activeIndex,
    setActiveIndex,
    close,
    openWithActive,
  } = useSelectState(options, value);

  const selected = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value],
  );

  const handleSelect = (opt: Option) => {
    if (isOptionDisabled(opt)) return;
    onChange(opt.value);
    close();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!open) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openWithActive();
      }
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const dir = event.key === "ArrowDown" ? 1 : -1;
      let next = activeIndex ?? -1;
      for (let i = 0; i < options.length; i += 1) {
        next = (next + dir + options.length) % options.length;
        if (!isOptionDisabled(options[next])) break;
      }
      setActiveIndex(next);
      const item = listRef.current?.children[next] as HTMLElement | undefined;
      item?.scrollIntoView({ block: "nearest" });
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      handleSelect(options[activeIndex]);
    }
  };

  return (
    <div className={`${styles.root} ${className ?? ""}`}>
      {label && (
        <label className={styles.label} htmlFor={id}>
          {label}
        </label>
      )}
      <button
        id={id}
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        aria-controls={`${id}-listbox`}
        disabled={disabled}
        onClick={() => (open ? close() : openWithActive())}
        onKeyDown={handleKeyDown}
      >
        <span className={styles.value}>{selected?.label ?? placeholder}</span>
        <ArrowDown className={styles.icon} />
      </button>
      {open && (
        <div
          id={`${id}-listbox`}
          className={styles.menu}
          role="listbox"
          aria-activedescendant={`${id}-opt-${activeIndex}`}
          tabIndex={-1}
          onKeyDown={handleKeyDown}
        >
          <ul className={styles.list} ref={listRef}>
            {options.map((opt, idx) => (
              <li
                key={opt.value}
                id={`${id}-opt-${idx}`}
                className={`${styles.option} ${
                  opt.value === value ? styles.selected : ""
                } ${idx === activeIndex ? styles.active : ""} ${
                  opt.disabled ? styles.disabled : ""
                }`}
                onMouseDown={(event) => {
                  event.preventDefault();
                  handleSelect(opt);
                }}
                role="option"
                aria-selected={opt.value === value}
              >
                {opt.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
