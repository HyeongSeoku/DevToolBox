import { useEffect } from "react";

import { HashRouter, Navigate, Route, Routes } from "react-router-dom";

import { useVaultStore } from "@/stores/useVaultStore";

import "./App.scss";
import { ToastProvider } from "./components/ToastProvider";
import { useRecentActivity } from "./hooks/useRecentActivity";
import { useTauriEnv } from "./hooks/useTauriEnv";
import { Layout } from "./layout";
import { Base64Page } from "./pages/Base64";
import { ConvertPage } from "./pages/Convert";
import { EnvManagerPage } from "./pages/EnvManager";
import { HomePage } from "./pages/Home";
import { I18nInspectorPage } from "./pages/I18nInspector";
import { JSDocGeneratorPage } from "./pages/JSDocGenerator";
import { JWTDecoderPage } from "./pages/JWTDecoder";
import { JsonFormatterPage } from "./pages/JsonFormatter";
import { RegexTesterPage } from "./pages/RegexTester";
import { SettingsPage } from "./pages/Settings";
import { SnippetHubPage } from "./pages/SnippetsHub";
import { TextToolsPage } from "./pages/TextTools";
import { TypeGenPage } from "./pages/TypeGen";

export function App() {
  const recent = useRecentActivity();
  const initVault = useVaultStore((state) => state.initVault);
  const isTauriEnv = useTauriEnv();

  useEffect(() => {
    if (!isTauriEnv) return;
    void initVault(null);
  }, [initVault, isTauriEnv]);

  return (
    <ToastProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage recent={recent.items} />} />
            <Route
              path="convert"
              element={<ConvertPage recentAdd={recent.addActivity} />}
            />
            <Route
              path="gif"
              element={
                <ConvertPage
                  modeOverride="gif"
                  recentAdd={recent.addActivity}
                />
              }
            />
            <Route path="jwt" element={<JWTDecoderPage />} />
            <Route path="json" element={<JsonFormatterPage />} />
            <Route path="base64" element={<Base64Page />} />
            <Route path="text" element={<TextToolsPage />} />
            <Route path="regex" element={<RegexTesterPage />} />
            <Route path="i18n" element={<I18nInspectorPage />} />
            <Route path="env" element={<EnvManagerPage />} />
            <Route path="snippets/:kind" element={<SnippetHubPage />} />
            <Route
              path="snippets"
              element={<Navigate to="/snippets/git" replace />}
            />
            <Route path="jsdoc" element={<JSDocGeneratorPage />} />
            <Route path="typegen" element={<TypeGenPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </ToastProvider>
  );
}
