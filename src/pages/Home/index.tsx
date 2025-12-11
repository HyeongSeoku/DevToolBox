import { useMemo, useState } from "react";

import { useNavigate } from "react-router-dom";

import { useToast } from "@/components/ToastProvider";
import { Button } from "@/components/ui/Button";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { useQuickLayoutStore } from "@/stores/useQuickLayout";
import { type NavKey } from "@/types/nav";

import styles from "./index.module.scss";
import { AddCard } from "./quick/AddCard";
import { QuickConvertPane } from "./quick/QuickConvertPane";
import { QuickEnvPane } from "./quick/QuickEnvPane";
import { QuickI18nPane } from "./quick/QuickI18nPane";
import { QuickJSDocPane } from "./quick/QuickJSDocPane";
import { QuickJsonPane } from "./quick/QuickJsonPane";
import { QuickJwtPane } from "./quick/QuickJwtPane";
import { QuickRegexPane } from "./quick/QuickRegexPane";
import { QuickSnippetsPane } from "./quick/QuickSnippetsPane";
import { QuickTextPane } from "./quick/QuickTextPane";
import { QuickTypegenPane } from "./quick/QuickTypegenPane";

type RecentItem = {
  id: string;
  title: string;
  detail: string;
  timestamp: number;
};

type HomePageProps = {
  recent: RecentItem[];
};

const navMeta: Record<NavKey, { title: string; detail: string }> = {
  home: { title: "홈", detail: "대시보드" },
  convert: { title: "이미지 변환", detail: "JPEG/PNG/WebP 변환" },
  typegen: { title: "API 타입 생성", detail: "Swagger/OpenAPI 변환" },
  settings: { title: "설정", detail: "앱/데이터 설정" },
  base64: { title: "Base64", detail: "텍스트/파일 인코딩" },
  jwt: { title: "JWT 디코더", detail: "토큰 복호화/검증" },
  text: { title: "텍스트 변환", detail: "케이스/치환/트리밍" },
  regex: { title: "Regex Tester", detail: "정규식 테스트" },
  json: { title: "JSON Formatter", detail: "포맷/미니파이/검증" },
  env: { title: ".env Manager", detail: "환경 변수 관리" },
  snippets: { title: "Snippets", detail: "코드/SQL 스니펫" },
  jsdoc: { title: "JSDoc Generator", detail: "주석 자동 생성" },
  i18n: { title: "i18n Inspector", detail: "로케일 키/값 비교" },
};

const allKeys: NavKey[] = [
  "convert",
  "typegen",
  "jsdoc",
  "snippets",
  "text",
  "jwt",
  "regex",
  "json",
  "env",
  "i18n",
];

function PaneRenderer({ keyName }: { keyName: NavKey }) {
  switch (keyName) {
    case "convert":
      return <QuickConvertPane />;
    case "typegen":
      return <QuickTypegenPane />;
    case "jsdoc":
      return <QuickJSDocPane />;
    case "snippets":
      return <QuickSnippetsPane />;
    case "text":
      return <QuickTextPane />;
    case "jwt":
      return <QuickJwtPane />;
    case "regex":
      return <QuickRegexPane />;
    case "env":
      return <QuickEnvPane />;
    case "json":
      return <QuickJsonPane />;
    case "base64":
      return null;
    case "i18n":
      return <QuickI18nPane />;
    default:
      return null;
  }
}

export function HomePage({}: HomePageProps) {
  const navigate = useNavigate();
  const toast = useToast();
  const panes = useQuickLayoutStore((state) => state.panes);
  const removePane = useQuickLayoutStore((state) => state.removePane);
  const resetPanes = useQuickLayoutStore((state) => state.reset);
  const addPane = useQuickLayoutStore((state) => state.addPane);
  const [isDragOver, setIsDragOver] = useState(false);

  const availableKeys = useMemo(
    () => allKeys.filter((k) => !panes.includes(k)),
    [panes],
  );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className="eyebrow">홈</p>
          <h1>빠른 시작</h1>
          <p className="micro">모든 기능을 4분할로 바로 사용할 수 있습니다.</p>
        </div>
        <Button variant="ghost" onClick={() => navigate("/history")}>
          작업 History 보기
        </Button>
      </header>

      <section
        className={styles.gridSection}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("application/x-nav-key")) {
            e.preventDefault();
            setIsDragOver(true);
          }
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          if (!e.dataTransfer.types.includes("application/x-nav-key")) return;
          e.preventDefault();
          const key = e.dataTransfer.getData("application/x-nav-key") as NavKey;
          if (panes.length >= 4) {
            toast.show("최대 4개까지 가능합니다.", { type: "error" });
            setIsDragOver(false);
            return;
          }
          addPane(key);
          toast.show("홈 분할에 추가했습니다.", { type: "success" });
          setIsDragOver(false);
        }}
      >
        <div className={styles.sectionHeader}>
          <div>
            <p className="micro">커스텀 레이아웃</p>
            <p className="subtle">
              좌측 네비게이션을 드래그해 떨어뜨리거나 + 카드로 추가하세요.
            </p>
          </div>
          {panes.length > 0 && (
            <Button variant="ghost" onClick={resetPanes}>
              기본 4분할로 되돌리기
            </Button>
          )}
        </div>
        <div
          className={`${styles.grid} ${panes.length >= 3 ? styles.gridFour : styles.gridTwo} ${isDragOver ? styles.dragOver : ""}`}
        >
          {panes.map((key) => (
            <div key={key} className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <p className={styles.title}>{navMeta[key].title}</p>
                  <p className="subtle">{navMeta[key].detail}</p>
                </div>
                <Button
                  className={styles.remove}
                  onClick={() => removePane(key)}
                >
                  ×
                </Button>
              </div>
              <div className={styles.cardContent}>
                <ScrollArea className={styles.paneScroll}>
                  <PaneRenderer keyName={key} />
                </ScrollArea>
              </div>
            </div>
          ))}
          {panes.length < 4 && (
            <AddCard
              options={availableKeys}
              labels={navMeta}
              onAdd={(key) => {
                addPane(key);
                toast.show(`${navMeta[key].title}을(를) 추가했습니다.`, {
                  type: "success",
                });
              }}
            />
          )}
        </div>
      </section>
    </div>
  );
}
