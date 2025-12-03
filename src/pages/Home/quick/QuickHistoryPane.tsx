import styles from "../index.module.scss";

type RecentItem = {
  id: string;
  title: string;
  detail: string;
  timestamp: number;
};

export function QuickHistoryPane({ recent }: { recent: RecentItem[] }) {
  return (
    <div className={styles.pane}>
      <div className={styles.paneHeader}>
        <p className={styles.title}>최근 작업</p>
        <p className="subtle">최근 5개 기록</p>
      </div>
      <div className={styles.historyList}>
        {recent.slice(0, 5).map((item) => (
          <div key={item.id} className={styles.historyItem}>
            <p className={styles.title}>{item.title}</p>
            <p className="subtle">{item.detail}</p>
          </div>
        ))}
        {recent.length === 0 && <p className="subtle">기록이 없습니다.</p>}
      </div>
    </div>
  );
}
