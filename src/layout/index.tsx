import { useEffect, useMemo, useRef } from "react";

import { Outlet, useLocation, useNavigate } from "react-router-dom";

import { useToast } from "@/components/ToastProvider";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { useQuickLayoutStore } from "@/stores/useQuickLayout";
import { useVaultStore } from "@/stores/useVaultStore";
import { type NavKey } from "@/types/nav";

import styles from "./index.module.scss";
import { Sidebar } from "../components/Sidebar";
import { type ImageConvertMode } from "../hooks/useConversionJob";
import { useTheme } from "../hooks/useTheme";

export function Layout() {
  const { mode: themeMode, cycleMode: cycleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const vaultError = useVaultStore((state) => state.error);
  const lastVaultError = useRef<string | undefined>(undefined);
  const addPane = useQuickLayoutStore((state) => state.addPane);

  useEffect(() => {
    if (vaultError && vaultError !== lastVaultError.current) {
      toast.show(vaultError, { type: "error" });
      lastVaultError.current = vaultError;
    }
  }, [toast, vaultError]);

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
      { key: "i18n", prefix: "/i18n" },
      { key: "history", prefix: "/history" },
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
    history: "/history",
    jwt: "/jwt",
    text: "/text",
    regex: "/regex",
    json: "/json",
    i18n: "/i18n",
    env: "/env",
    snippets: "/snippets/git",
    jsdoc: "/jsdoc",
  };

  return (
    <div
      className="shell"
      onDragOver={(e) => {
        if (e.defaultPrevented) return;
        if (e.dataTransfer.types.includes("application/x-nav-key")) {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        }
      }}
      onDrop={(e) => {
        if (e.defaultPrevented) return;
        if (!e.dataTransfer.types.includes("application/x-nav-key")) return;
        e.preventDefault();
        const key = e.dataTransfer.getData("application/x-nav-key") as NavKey;
        addPane(key);
        toast.show("홈 레이아웃에 추가했습니다.", { type: "success" });
        navigate("/");
      }}
    >
      <Sidebar
        active={active}
        onNavigate={(key) => {
          navigate(navPaths[key] ?? "/convert");
        }}
        themeMode={themeMode}
        onThemeCycle={cycleTheme}
      />
      <div className="content">
        <ScrollArea
          className="content-scroll"
          key={`${location.pathname}${location.search}`}
        >
          <Outlet />
        </ScrollArea>
      </div>
    </div>
  );
}
