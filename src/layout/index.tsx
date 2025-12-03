import { useEffect, useRef } from "react";

import { Outlet, useLocation, useNavigate } from "react-router-dom";

import { useToast } from "@/components/ToastProvider";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { useQuickLayoutStore } from "@/stores/useQuickLayout";
import { useVaultStore } from "@/stores/useVaultStore";
import { type NavKey } from "@/types/nav";

import { Sidebar } from "../components/Sidebar";
import { type Mode } from "../hooks/useConversionJob";
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
  const active:
    | "home"
    | Mode
    | "typegen"
    | "settings"
    | "history"
    | "jwt"
    | "text"
    | "regex"
    | "env"
    | "snippets"
    | "jsdoc" =
    path === "/"
      ? "home"
      : path.startsWith("/typegen")
        ? "typegen"
        : path.startsWith("/jwt")
          ? "jwt"
          : path.startsWith("/text")
            ? "text"
            : path.startsWith("/regex")
              ? "regex"
              : path.startsWith("/history")
                ? "history"
                : path.startsWith("/env")
                  ? "env"
                  : path.startsWith("/snippets")
                    ? "snippets"
                    : path.startsWith("/jsdoc")
                      ? "jsdoc"
                      : path.startsWith("/settings")
                        ? "settings"
                        : "convert";

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
          if (key === "home") navigate("/");
          else if (key === "typegen") navigate("/typegen");
          else if (key === "jwt") navigate("/jwt");
          else if (key === "text") navigate("/text");
          else if (key === "regex") navigate("/regex");
          else if (key === "history") navigate("/history");
          else if (key === "env") navigate("/env");
          else if (key === "snippets") navigate("/snippets/git");
          else if (key === "jsdoc") navigate("/jsdoc");
          else if (key === "settings") navigate("/settings");
          else navigate("/convert");
        }}
        themeMode={themeMode}
        onThemeCycle={cycleTheme}
      />
      <div className="content">
        <ScrollArea className="content-scroll">
          <Outlet />
        </ScrollArea>
      </div>
    </div>
  );
}
