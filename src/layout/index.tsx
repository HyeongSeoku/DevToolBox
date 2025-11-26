import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Sidebar } from "../components/Sidebar";
import { useTheme } from "../hooks/useTheme";
import { Mode } from "../hooks/useConversionJob";

export function Layout() {
  const { mode: themeMode, cycleMode: cycleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;
  const active: "home" | Mode | "typegen" =
    path === "/" ? "home" : path.startsWith("/gif") ? "gif" : path.startsWith("/typegen") ? "typegen" : "convert";

  return (
    <div className="shell">
      <Sidebar
        active={active}
        onNavigate={(key) => {
          if (key === "home") navigate("/");
          else if (key === "typegen") navigate("/typegen");
          else if (key === "gif") navigate("/gif");
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
