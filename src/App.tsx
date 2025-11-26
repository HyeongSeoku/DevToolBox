import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import "./App.scss";
import { Layout } from "./layout";
import { ConvertPage } from "./pages/Convert";
import { HomePage } from "./pages/Home";
import { useRecentActivity } from "./hooks/useRecentActivity";
import { TypeGenPage } from "./pages/TypeGen";
import { ToastProvider } from "./components/ToastProvider";

function App() {
  const recent = useRecentActivity();

  return (
    <ToastProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage recent={recent.items} />} />
            <Route path="convert" element={<ConvertPage recentAdd={recent.addActivity} />} />
            <Route path="gif" element={<ConvertPage modeOverride="gif" recentAdd={recent.addActivity} />} />
            <Route path="typegen" element={<TypeGenPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </ToastProvider>
  );
}

export default App;
