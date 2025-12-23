import { useEffect, useMemo, useRef, useState } from "react";

import { Outlet, useLocation, useNavigate } from "react-router-dom";

import { useToast } from "@/components/ToastProvider";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { useVaultStore } from "@/stores/useVaultStore";
import { type NavKey } from "@/types/nav";

import { RightPanel } from "../components/RightPanel";
import { Sidebar } from "../components/Sidebar";
import { useTheme } from "../hooks/useTheme";

export function Layout() {
  const { resolvedMode: themeMode, toggleMode: toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const vaultError = useVaultStore((state) => state.error);
  const lastVaultError = useRef<string | undefined>(undefined);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    const saved = window.localStorage.getItem("sidebar-collapsed");
    return saved === "true";
  });

  useEffect(() => {
    if (vaultError && vaultError !== lastVaultError.current) {
      toast.show(vaultError, { type: "error" });
      lastVaultError.current = vaultError;
    }
  }, [toast, vaultError]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      "sidebar-collapsed",
      String(isSidebarCollapsed),
    );
  }, [isSidebarCollapsed]);

  const path = location.pathname;

  const active: NavKey = useMemo(() => {
    if (path === "/") return "home";

    const routeTable: Array<{
      key: NavKey;
      prefix: string;
    }> = [
      { key: "typegen", prefix: "/typegen" },
      { key: "jwt", prefix: "/jwt" },
      { key: "text", prefix: "/text" },
      { key: "regex", prefix: "/regex" },
      { key: "json", prefix: "/json" },
      { key: "base64", prefix: "/base64" },
      { key: "i18n", prefix: "/i18n" },
      { key: "env", prefix: "/env" },
      { key: "snippets", prefix: "/snippets" },
      { key: "jsdoc", prefix: "/jsdoc" },
      { key: "settings", prefix: "/settings" },
      { key: "convert", prefix: "/convert" },
    ];

    const found = routeTable.find(({ prefix }) => path.startsWith(prefix));
    return found?.key ?? "convert";
  }, [path]);

  const navPaths: Record<NavKey, string> = {
    home: "/",
    convert: "/convert",
    typegen: "/typegen",
    settings: "/settings",
    jwt: "/jwt",
    text: "/text",
    regex: "/regex",
    json: "/json",
    base64: "/base64",
    i18n: "/i18n",
    env: "/env",
    snippets: "/snippets/git",
    jsdoc: "/jsdoc",
  };

  return (
    <div className={`shell ${isSidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <Sidebar
        active={active}
        onNavigate={(key) => {
          navigate(navPaths[key] ?? "/convert");
        }}
        themeMode={themeMode}
        onThemeToggle={toggleTheme}
        collapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
      />
      <div className="content">
        <ScrollArea
          className="content-scroll"
          key={`${location.pathname}${location.search}`}
        >
          <Outlet />
        </ScrollArea>
      </div>
      <RightPanel />
    </div>
  );
}
