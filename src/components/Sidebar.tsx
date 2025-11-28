import styles from "./Sidebar.module.scss";
import { type ThemeMode } from "../hooks/useTheme";

type NavKey =
  | "home"
  | "convert"
  | "gif"
  | "typegen"
  | "jwt"
  | "text"
  | "regex"
  | "env"
  | "snippets-git"
  | "settings";

type SidebarProps = {
  active: NavKey;
  onNavigate: (key: NavKey) => void;
  themeMode: ThemeMode;
  onThemeCycle: () => void;
};

const navItems: { key: NavKey; label: string }[] = [
  { key: "home", label: "홈" },
  { key: "convert", label: "이미지 변환" },
  { key: "gif", label: "비디오 → GIF" },
  { key: "typegen", label: "API 타입 생성" },
  { key: "jwt", label: "JWT 디코더" },
  { key: "text", label: "텍스트 변환" },
  { key: "regex", label: "Regex Tester" },
  { key: "env", label: ".env Manager" },
  { key: "snippets-git", label: "Snippets · Git" },
  { key: "settings", label: "설정 / Vault" },
];

export function Sidebar({ active, onNavigate, themeMode, onThemeCycle }: SidebarProps) {
  const themeLabel = themeMode === "system" ? "System" : themeMode === "light" ? "Light" : "Dark";

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <div className={styles.logo}>DT</div>
        <div>
          <p className={styles.brandTitle}>DevToolbox</p>
          <p className={styles.brandSub}>Media Studio</p>
        </div>
      </div>

      <nav className={styles.nav}>
        {navItems.map((item) => (
          <button
            key={item.key}
            className={`${styles.navItem} ${active === item.key ? styles.active : ""}`}
            onClick={() => onNavigate(item.key)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className={styles.footer}>
        <button className={styles.navItem} onClick={onThemeCycle}>
          테마: {themeLabel}
        </button>
      </div>
    </aside>
  );
}
