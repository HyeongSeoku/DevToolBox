import React, { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";

export type DropdownOption = { label: string; value: string; disabled?: boolean };

type DropdownProps = {
  label: string;
  options: DropdownOption[];
  onSelect: (value: string) => void;
};

export const Dropdown: React.FC<DropdownProps> = ({
  label,
  options,
  onSelect,
}) => {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        listRef.current &&
        !listRef.current.contains(e.target as Node) &&
        btnRef.current &&
        !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <Button
        variant="ghost"
        ref={btnRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {label}
      </Button>
      {open && (
        <ul
          ref={listRef}
          role="listbox"
          aria-label={label}
          style={{
            position: "absolute",
            marginTop: 4,
            minWidth: 160,
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            background: "var(--surface)",
            padding: 4,
            listStyle: "none",
            display: "flex",
            flexDirection: "column",
            gap: 4,
            zIndex: 10,
          }}
        >
          {options.map((opt) => (
            <li key={opt.value} role="option" aria-disabled={opt.disabled}>
              <Button
                variant="ghost"
                type="button"
                disabled={opt.disabled}
                style={{ width: "100%", textAlign: "left" }}
                onClick={() => {
                  if (opt.disabled) return;
                  onSelect(opt.value);
                  setOpen(false);
                }}
              >
                {opt.label}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
