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

type NavItem = { key: NavKey; label: string; shortLabel: string };
type NavGroup = { title: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    title: "",
    items: [{ key: "home", label: "Home", shortLabel: "Home" }],
  },
  {
    title: "Convert",
    items: [
      { key: "convert-image", label: "Image Converter", shortLabel: "Image" },
      { key: "convert-gif", label: "Video → GIF", shortLabel: "GIF" },
    ],
  },
  {
    title: "Text & Code",
    items: [
      { key: "text", label: "Text Tools", shortLabel: "Text" },
      { key: "regex", label: "Regex Lab", shortLabel: "Regex" },
      { key: "json", label: "JSON Tools", shortLabel: "JSON" },
      { key: "snippets", label: "Snippets", shortLabel: "Snip" },
    ],
  },
  {
    title: "Dev Utilities",
    items: [
      { key: "typegen", label: "API Types", shortLabel: "API" },
      { key: "jsdoc", label: "JSDoc Studio", shortLabel: "JSDoc" },
      { key: "i18n", label: "i18n Inspector", shortLabel: "i18n" },
      { key: "jwt", label: "JWT Inspector", shortLabel: "JWT" },
    ],
  },
  {
    title: "Data & Env",
    items: [
      { key: "base64", label: "Base64 Tools", shortLabel: "B64" },
      { key: "env", label: ".env Manager", shortLabel: "ENV" },
    ],
  },
  {
    title: "",
    items: [{ key: "settings", label: "Settings", shortLabel: "Settings" }],
  },
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
            {navGroups.map((group, index) => (
              <div key={`${group.title || "root"}-${index}`} className={styles.navGroup}>
                {!collapsed && group.title && (
                  <div className={styles.navGroupTitle}>{group.title}</div>
                )}
                {group.items.map((item) => (
                  <Button
                    key={item.key}
                    className={classNames(styles.navItem, {
                      [styles.active]: item.key === active,
                    })}
                    onClick={() => onNavigate(item.key)}
                    draggable
                    title={item.label}
                    onDragStart={(e) => {
                      e.dataTransfer.setData(
                        "application/x-nav-key",
                        item.key,
                      );
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                  >
                    {collapsed ? item.shortLabel : item.label}
                  </Button>
                ))}
              </div>
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
