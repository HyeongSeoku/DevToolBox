import { useState } from "react";

import { type NavKey } from "@/types/nav";

import styles from "./AddCard.module.scss";

type AddCardProps = {
  options: NavKey[];
  onAdd: (key: NavKey) => void;
  labels: Record<NavKey, { title: string; detail: string }>;
};

export function AddCard({ options, onAdd, labels }: AddCardProps) {
  const [selected, setSelected] = useState<NavKey | "">("");
  return (
    <div className={styles.addCard}>
      <button
        className={styles.addButton}
        onClick={() => selected && onAdd(selected)}
        disabled={!selected}
      >
        +
      </button>
      <select
        className={styles.select}
        value={selected}
        onChange={(e) => setSelected(e.target.value as NavKey)}
      >
        <option value="">기능 선택</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {labels[o]?.title ?? o}
          </option>
        ))}
      </select>
    </div>
  );
}
