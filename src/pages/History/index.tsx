import { useMemo } from "react";

import { useNavigate } from "react-router-dom";

import styles from "./index.module.scss";

type RecentItem = {
  id: string;
  title: string;
  detail: string;
  timestamp: number;
};

type HistoryPageProps = {
  recent: RecentItem[];
};

const formatTime = (timestamp: number) => new Date(timestamp).toLocaleString();

const resolveRoute = (title: string) => {
  if (title.toLowerCase().includes("gif")) return "/gif";
  if (title.toLowerCase().includes("이미지")) return "/convert";
  return "/";
};

export function HistoryPage({ recent }: HistoryPageProps) {
  const navigate = useNavigate();
  const ordered = useMemo(
    () => [...recent].sort((a, b) => b.timestamp - a.timestamp),
    [recent],
  );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className="eyebrow">작업 내역</p>
        <h1>History</h1>
        <p className="micro">
          로컬스토리지에 저장된 최근 20개의 작업을 확인하고 바로 이어서 작업할
          수 있습니다.
        </p>
      </header>

      <section className={styles.listSection}>
        {ordered.length === 0 && (
          <p className="subtle">아직 기록이 없습니다.</p>
        )}
        {ordered.map((item) => (
          <div key={item.id} className={styles.card}>
            <div className={styles.meta}>
              <p className={styles.title}>{item.title}</p>
              <p className="subtle">{item.detail}</p>
              <p className="micro">{formatTime(item.timestamp)}</p>
            </div>
            <div className={styles.actions}>
              <button
                className="ghost"
                onClick={() => navigate(resolveRoute(item.title))}
              >
                다시 실행
              </button>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
