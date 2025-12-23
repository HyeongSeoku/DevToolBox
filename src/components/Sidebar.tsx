import classNames from "classnames";

import DoubleArrow from "@/assets/icons/double_arrow.svg?react";
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
  collapsed: boolean;
  onToggleCollapse: () => void;
};

const navItems: { key: NavKey; label: string; shortLabel: string }[] = [
  { key: "home", label: "홈", shortLabel: "홈" },
  {
    key: "convert",
    label: "이미지 변환 / 비디오→GIF",
    shortLabel: "변환",
  },
  { key: "typegen", label: "API 타입 생성", shortLabel: "API" },
  { key: "jwt", label: "JWT 디코더", shortLabel: "JWT" },
  { key: "text", label: "텍스트 변환", shortLabel: "텍스트" },
  { key: "regex", label: "Regex Tester", shortLabel: "Regex" },
  { key: "json", label: "JSON Formatter", shortLabel: "JSON" },
  { key: "base64", label: "Base64 인/디코딩", shortLabel: "B64" },
  { key: "env", label: ".env Manager", shortLabel: "ENV" },
  { key: "snippets", label: "Snippets", shortLabel: "Snip" },
  { key: "jsdoc", label: "JSDoc Generator", shortLabel: "JSDoc" },
  { key: "i18n", label: "i18n Inspector", shortLabel: "i18n" },
  { key: "settings", label: "설정", shortLabel: "설정" },
];

export function Sidebar({
  active,
  onNavigate,
  themeMode,
  onThemeToggle,
  collapsed,
  onToggleCollapse,
}: SidebarProps) {
  const isDark = themeMode === "dark";

  return (
    <aside
      className={classNames(styles.sidebar, {
        [styles.collapsed]: collapsed,
      })}
    >
      <div className={styles.body}>
        <div className={styles.header}>
          <div className={styles.brand}>
            <div className={styles.logo}>DT</div>
            <div>
              <p className={styles.brandTitle}>DevToolbox</p>
              <p className={styles.brandSub}>Media Studio</p>
            </div>
          </div>
          <div className={styles.headerActions}>
            <Button
              className={styles.themeButton}
              onClick={onThemeToggle}
              aria-label="테마 전환"
              aria-pressed={isDark}
            >
              <ThemeIcon
                className={classNames(
                  styles.themeIcon,
                  isDark ? "moon" : "sun",
                )}
              />
            </Button>
          </div>
        </div>

        <ScrollArea
          key={collapsed ? "sidebar-collapsed" : "sidebar-expanded"}
          wrapperClassName={styles.scrollWrap}
          className={styles.scroll}
        >
          <nav className={styles.nav}>
            {navItems.map((item) => (
              <Button
                key={item.key}
                className={classNames(styles.navItem, {
                  [styles.active]: item.key === active,
                })}
                onClick={() => onNavigate(item.key)}
                draggable
                title={item.label}
                onDragStart={(e) => {
                  e.dataTransfer.setData("application/x-nav-key", item.key);
                  e.dataTransfer.effectAllowed = "copy";
                }}
              >
                {collapsed ? item.shortLabel : item.label}
              </Button>
            ))}
          </nav>
        </ScrollArea>
      </div>

      <button
        type="button"
        className={styles.collapseHandle}
        onClick={onToggleCollapse}
        aria-label={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
      >
        <DoubleArrow
          className={classNames(styles.collapseIcon, {
            [styles.collapseIconOpen]: !collapsed,
          })}
        />
      </button>
    </aside>
  );
}
