import styles from "./Hero.module.scss";
import { type Mode } from "../hooks/useConversionJob";

type HeroProps = {
  qualityPercent: number;
  scalePercent: number;
  fileCount: number;
  mode: Mode;
  busy: boolean;
  onRun: () => void;
};

export function Hero({ qualityPercent, scalePercent, fileCount, mode, busy, onRun }: HeroProps) {
  return (
    <header className={styles.hero}>
      <div>
        <p className={styles.eyebrow}>Image Utility · Tauri</p>
        <h1>멀티 포맷 변환 · 압축 · GIF 빌더</h1>
        <p className={styles.lede}>
          로컬 이미지를 원하는 포맷으로 빠르게 변환하고, 품질/스케일/EXIF 옵션을 한번에 조절하세요. 드래그 앤
          드롭, 배치 변환, 웹 최적화 프리셋까지 지원합니다.
        </p>
      </div>
      <div className={styles.heroCard}>
        <p className={styles.heroLabel}>빠른 실행</p>
        <div className={styles.heroStats}>
          <div>
            <p className={styles.statValue}>{qualityPercent}%</p>
            <p className={styles.statLabel}>품질</p>
          </div>
          <div>
            <p className={styles.statValue}>{scalePercent}%</p>
            <p className={styles.statLabel}>스케일</p>
          </div>
          <div>
            <p className={styles.statValue}>{fileCount}</p>
            <p className={styles.statLabel}>선택된 파일</p>
          </div>
        </div>
        <button className="primary" onClick={onRun} disabled={busy}>
          {busy ? "처리 중..." : mode === "gif" ? "GIF 만들기" : "변환 실행"}
        </button>
        <p className={`${styles.heroFootnote} micro`}>PNG는 무손실 저장 · 비디오 → GIF 지원 (ffmpeg 필요)</p>
      </div>
    </header>
  );
}
