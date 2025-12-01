import styles from "./index.module.scss";

type RecentItem = {
  id: string;
  title: string;
  detail: string;
  timestamp: number;
};

type HomePageProps = {
  recent: RecentItem[];
};

export function HomePage({ recent }: HomePageProps) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className="eyebrow">Dashboard</p>
        <h1>최근 작업</h1>
        <p className="micro">
          마지막 20개의 변환 기록을 로컬에 저장해 보여줍니다.
        </p>
      </header>

      <section className={styles.listSection}>
        {recent.length === 0 && (
          <p className="subtle">아직 작업 기록이 없습니다.</p>
        )}
        {recent.map((item) => (
          <div key={item.id} className={styles.card}>
            <div>
              <p className={styles.title}>{item.title}</p>
              <p className="subtle">{item.detail}</p>
            </div>
            <p className="micro">{new Date(item.timestamp).toLocaleString()}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
