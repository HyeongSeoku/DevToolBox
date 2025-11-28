import { Outlet, useLocation, useNavigate } from "react-router-dom";

import { Sidebar } from "../components/Sidebar";
import { type Mode } from "../hooks/useConversionJob";
import { useTheme } from "../hooks/useTheme";

export function Layout() {
  const { mode: themeMode, cycleMode: cycleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;
  const active: "home" | Mode | "typegen" | "settings" | "jwt" | "text" | "regex" | "env" | "snippets-git" =
    path === "/"
      ? "home"
      : path.startsWith("/gif")
        ? "gif"
        : path.startsWith("/typegen")
          ? "typegen"
          : path.startsWith("/jwt")
            ? "jwt"
            : path.startsWith("/text")
              ? "text"
              : path.startsWith("/regex")
                ? "regex"
                : path.startsWith("/env")
                  ? "env"
                  : path.startsWith("/snippets/git")
                    ? "snippets-git"
                    : path.startsWith("/settings")
                      ? "settings"
                      : "convert";

  return (
    <div className="shell">
      <Sidebar
        active={active}
        onNavigate={(key) => {
          if (key === "home") navigate("/");
          else if (key === "typegen") navigate("/typegen");
          else if (key === "gif") navigate("/gif");
          else if (key === "jwt") navigate("/jwt");
          else if (key === "text") navigate("/text");
          else if (key === "regex") navigate("/regex");
          else if (key === "env") navigate("/env");
          else if (key === "snippets-git") navigate("/snippets/git");
          else if (key === "settings") navigate("/settings");
          else navigate("/convert");
        }}
        themeMode={themeMode}
        onThemeCycle={cycleTheme}
      />
      <div className="content">
        <Outlet />
      </div>
    </div>
  );
}
