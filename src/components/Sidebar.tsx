import classNames from "classnames";

import ThemeIcon from "@/assets/icons/theme.svg?react";
import { Button } from "@/components/ui/Button";
import { type NavKey } from "@/types/nav";

import styles from "./Sidebar.module.scss";
import { type ResolvedThemeMode } from "../hooks/useTheme";
import { ScrollArea } from "./ui/ScrollArea";

type SidebarProps = {
  active: NavKey;
  onNavigate: (key: NavKey) => void;
  themeMode: ResolvedThemeMode;
  onThemeToggle: () => void;
};

const navItems: { key: NavKey; label: string }[] = [
  { key: "home", label: "홈" },
  { key: "convert", label: "이미지 변환 / 비디오→GIF" },
  { key: "typegen", label: "API 타입 생성" },
  { key: "jwt", label: "JWT 디코더" },
  { key: "text", label: "텍스트 변환" },
  { key: "regex", label: "Regex Tester" },
  { key: "json", label: "JSON Formatter" },
  { key: "base64", label: "Base64 인/디코딩" },
  { key: "env", label: ".env Manager" },
  { key: "snippets", label: "Snippets" },
  { key: "jsdoc", label: "JSDoc Generator" },
  { key: "i18n", label: "i18n Inspector" },
  { key: "settings", label: "설정" },
];

export function Sidebar({
  active,
  onNavigate,
  themeMode,
  onThemeToggle,
}: SidebarProps) {
  const isDark = themeMode === "dark";

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <div className={styles.brand}>
          <div className={styles.logo}>DT</div>
          <div>
            <p className={styles.brandTitle}>DevToolbox</p>
            <p className={styles.brandSub}>Media Studio</p>
          </div>
        </div>
        <Button
          className={styles.themeButton}
          onClick={onThemeToggle}
          aria-label="테마 전환"
          aria-pressed={isDark}
        >
          <ThemeIcon
            className={classNames(styles.themeIcon, isDark ? "moon" : "sun")}
          />
        </Button>
      </div>

      <ScrollArea className={styles.scroll}>
        <nav className={styles.nav}>
          {navItems.map((item) => (
            <Button
              key={item.key}
              className={classNames(styles.navItem, {
                [styles.active]: item.key === active,
              })}
              onClick={() => onNavigate(item.key)}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("application/x-nav-key", item.key);
                e.dataTransfer.effectAllowed = "copy";
              }}
            >
              {item.label}
            </Button>
          ))}
        </nav>

      </ScrollArea>
    </aside>
  );
}
