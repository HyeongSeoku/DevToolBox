import { useEffect, useMemo, useRef, useState } from "react";

import { Outlet, useLocation, useNavigate } from "react-router-dom";

import HelpIcon from "@/assets/icons/help.svg?react";
import { useToast } from "@/components/ToastProvider";
import { Button } from "@/components/ui/Button";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { useVaultStore } from "@/stores/useVaultStore";
import { type NavKey } from "@/types/nav";

import {
  QuickReferencePanel,
  QuickReferenceProvider,
} from "../components/QuickReferencePanel";
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
  const [isQuickReferenceOpen, setIsQuickReferenceOpen] = useState(false);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
  const lastScrollTopRef = useRef(0);

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
      { key: "convert-image", prefix: "/convert/image" },
      { key: "convert-gif", prefix: "/convert/gif" },
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
    ];

    const found = routeTable.find(({ prefix }) => path.startsWith(prefix));
    return found?.key ?? "convert-image";
  }, [path]);

  const headerMeta: Record<
    NavKey,
    { breadcrumb: string; title: string; subtitle: string; subInfo: string }
  > = {
    home: {
      breadcrumb: "Home",
      title: "Dashboard",
      subtitle: "빠른 시작과 작업 현황",
      subInfo: "최근 작업을 빠르게 이어서 사용할 수 있어요.",
    },
    "convert-image": {
      breadcrumb: "Convert / Image",
      title: "Image Converter",
      subtitle: "JPEG/PNG/WebP 변환 및 최적화",
      subInfo: "로컬 이미지를 빠르게 변환하고 품질을 관리하세요.",
    },
    "convert-gif": {
      breadcrumb: "Convert / Video",
      title: "Video to GIF",
      subtitle: "비디오를 GIF로 변환",
      subInfo: "구간을 선택해 가볍고 공유하기 쉬운 GIF를 만들어요.",
    },
    typegen: {
      breadcrumb: "Dev Utilities",
      title: "API Types",
      subtitle: "Swagger/OpenAPI 타입 생성",
      subInfo: "API 스펙을 타입으로 변환해 생산성을 높이세요.",
    },
    settings: {
      breadcrumb: "System",
      title: "Settings",
      subtitle: "앱과 저장소 설정",
      subInfo: "테마, 저장 위치, 권한을 관리합니다.",
    },
    jwt: {
      breadcrumb: "Dev Utilities",
      title: "JWT Inspector",
      subtitle: "토큰 디코딩/검증",
      subInfo: "JWT를 빠르게 확인하고 디버깅하세요.",
    },
    text: {
      breadcrumb: "Text & Code",
      title: "Text Tools",
      subtitle: "텍스트 변환과 정리",
      subInfo: "케이스 변환, 치환, 트리밍을 지원합니다.",
    },
    regex: {
      breadcrumb: "Text & Code",
      title: "Regex Lab",
      subtitle: "정규식 테스트",
      subInfo: "패턴을 빠르게 확인하고 결과를 검증합니다.",
    },
    json: {
      breadcrumb: "Text & Code",
      title: "JSON Tools",
      subtitle: "포맷/미니파이/검증",
      subInfo: "JSON을 보기 좋은 형태로 정리하세요.",
    },
    base64: {
      breadcrumb: "Data & Env",
      title: "Base64 Tools",
      subtitle: "인코딩/디코딩",
      subInfo: "텍스트와 파일을 Base64로 변환합니다.",
    },
    env: {
      breadcrumb: "Data & Env",
      title: ".env Manager",
      subtitle: "환경 변수 관리",
      subInfo: "환경 변수 파일을 안전하게 관리하세요.",
    },
    snippets: {
      breadcrumb: "Text & Code",
      title: "Snippets",
      subtitle: "코드 스니펫 관리",
      subInfo: "자주 쓰는 코드 조각을 저장합니다.",
    },
    jsdoc: {
      breadcrumb: "Dev Utilities",
      title: "JSDoc Studio",
      subtitle: "JSDoc 자동 생성",
      subInfo: "주석 문서를 자동으로 작성합니다.",
    },
    i18n: {
      breadcrumb: "Dev Utilities",
      title: "i18n Inspector",
      subtitle: "로케일 키/값 비교",
      subInfo: "누락 키와 값 차이를 확인합니다.",
    },
  };

  const activeHeader = headerMeta[active] ?? headerMeta.home;

  const navPaths: Record<NavKey, string> = {
    home: "/",
    "convert-image": "/convert/image",
    "convert-gif": "/convert/gif",
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
    <QuickReferenceProvider>
      <div
        className={`shell ${isSidebarCollapsed ? "sidebar-collapsed" : ""} ${
          isQuickReferenceOpen ? "" : "quick-reference-collapsed"
        }`}
      >
        <Sidebar
          active={active}
          onNavigate={(key) => {
            navigate(navPaths[key] ?? "/convert/image");
          }}
          themeMode={themeMode}
          onThemeToggle={toggleTheme}
          collapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        />
        <div className="content">
          <header
            className={`content-header ${
              isHeaderCollapsed ? "content-header-collapsed" : ""
            }`}
          >
            <div className="content-header-left">
              <p className="content-breadcrumb">{activeHeader.breadcrumb}</p>
              <h1 className="content-title">{activeHeader.title}</h1>
              <p className="content-subtitle">{activeHeader.subtitle}</p>
              <p className="content-subinfo">{activeHeader.subInfo}</p>
            </div>
            <div className="content-header-right">
              {!isQuickReferenceOpen && (
                <Button
                  type="button"
                  className="quick-ref-toggle"
                  variant="ghost"
                  onClick={() => setIsQuickReferenceOpen(true)}
                  aria-label="도움말 열기"
                >
                  <HelpIcon />
                </Button>
              )}
            </div>
          </header>
          <ScrollArea
            className="content-scroll"
            wrapperClassName="content-scroll-wrapper"
            key={`${location.pathname}${location.search}`}
            onScroll={(scrollTop) => {
              const last = lastScrollTopRef.current;
              const delta = scrollTop - last;
              if (scrollTop <= 4) {
                setIsHeaderCollapsed(false);
              } else if (delta > 6) {
                setIsHeaderCollapsed(true);
              } else if (delta < -6) {
                setIsHeaderCollapsed(false);
              }
              lastScrollTopRef.current = scrollTop;
            }}
          >
            <Outlet />
          </ScrollArea>
        </div>
        <QuickReferencePanel
          hidden={!isQuickReferenceOpen}
          onClose={() => setIsQuickReferenceOpen(false)}
        />
      </div>
    </QuickReferenceProvider>
  );
}
