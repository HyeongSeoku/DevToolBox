import { Button } from "@/components/ui/Button";

import panelStyles from "./Panels.module.scss";
import { type ConversionResult } from "../hooks/useConversionJob";

type Progress = { percent: number; label: string; current?: number; total?: number; path?: string };

type RingProps = {
  percent: number;
  size?: number;
  stroke?: number;
  primary?: string;
  secondary?: string;
};

const Ring: React.FC<RingProps> = ({
  percent,
  size = 56,
  stroke = 6,
  primary,
  secondary,
}) => {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(percent, 100));
  const dashoffset = circumference * (1 - clamped / 100);

  return (
    <svg
      width={size}
      height={size}
      className={panelStyles.progressRing}
      role="img"
      aria-label={`진행률 ${clamped}%`}
    >
      <circle
        className={panelStyles.ringTrack}
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={stroke}
      />
      <circle
        className={panelStyles.ringFill}
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={stroke}
        strokeDasharray={circumference}
        strokeDashoffset={dashoffset}
      />
      <text x="50%" y="45%" textAnchor="middle" className={panelStyles.ringText}>
        {primary ?? `${clamped}%`}
      </text>
      {secondary && (
        <text x="50%" y="62%" textAnchor="middle" className={panelStyles.ringSubText}>
          {secondary}
        </text>
      )}
    </svg>
  );
};

type ResultsPanelProps = {
  status: string;
  progress: Progress;
  results: ConversionResult[];
  perFileProgress: Record<string, number>;
  fileSizes?: Record<string, number>;
  onOpen: (path?: string) => Promise<void> | void;
  successCount: number;
  failCount: number;
};

export function ResultsPanel({
  status,
  progress,
  results,
  perFileProgress,
  fileSizes,
  onOpen,
  successCount,
  failCount,
}: ResultsPanelProps) {
  const totalFiles =
    progress.total && progress.total > 0
      ? Math.max(1, Math.round(progress.total / 100))
      : results.length || 0;
  const completedFiles =
    progress.current && progress.total && progress.total > 0
      ? Math.floor(progress.current / Math.max(progress.total / totalFiles, 1))
      : successCount + failCount;

  const formatBytes = (bytes?: number) => {
    if (!bytes || bytes <= 0) return "-";
    const units = ["B", "KB", "MB", "GB"];
    let v = bytes;
    let i = 0;
    while (v >= 1024 && i < units.length - 1) {
      v /= 1024;
      i += 1;
    }
    return `${v.toFixed(v >= 10 ? 0 : 1)} ${units[i]}`;
  };

  return (
    <section className={`${panelStyles.panel} ${panelStyles.results}`}>
      <div className={panelStyles.resultsHeader}>
        <div className={panelStyles.statusBlock}>
          <p className="micro">상태</p>
          <p className={panelStyles.statusText}>{status || "대기 중"}</p>
        </div>
        <div className={panelStyles.statGroup}>
          <div>
            <p className="stat-value small">{successCount}</p>
            <p className="stat-label">성공</p>
          </div>
          <div>
            <p className="stat-value small">{failCount}</p>
            <p className="stat-label">실패</p>
          </div>
        </div>
      </div>
      <div className={panelStyles.resultsBody}>
        <div className={panelStyles.summaryRow}>
          <div className={panelStyles.summaryMain}>
            <Ring
              percent={progress.percent}
              size={68}
              stroke={7}
              primary={`${Math.round(progress.percent)}%`}
              secondary={
                progress.total && progress.current !== undefined
                  ? `${formatBytes(progress.current)}`
                  : undefined
              }
            />
            <div>
              <p className="summary-count">
                완료 {completedFiles} / 총 {totalFiles} 파일
              </p>
              <p className="micro subtle">
                {progress.total && progress.current !== undefined
                  ? `${formatBytes(progress.current)} / ${formatBytes(progress.total)}`
                  : "-"}
              </p>
              <p className="micro subtle">{progress.label || "대기 중"}</p>
            </div>
          </div>
        </div>
        {results.length === 0 && (
          <p className="subtle">변환 결과가 여기에 표시됩니다.</p>
        )}
        {results.map((item) => (
          <div
            key={`${item.input}-${item.output ?? item.error ?? "err"}`}
            className={`${panelStyles.resultRow} ${item.error ? panelStyles.error : panelStyles.success}`}
          >
            <div>
              <p className="file-name">{item.input.split(/[/\\]/).pop()}</p>
              <p className="file-path">{item.output || item.error}</p>
            </div>
            {item.output && (
              <Button variant="ghost" onClick={() => onOpen(item.output)}>
                열기
              </Button>
            )}
            <div className={panelStyles.perFileProgress}>
              <Ring
                percent={perFileProgress[item.input] ?? 0}
                size={52}
                stroke={6}
                primary={`${Math.round(perFileProgress[item.input] ?? 0)}%`}
                secondary={
                  fileSizes?.[item.input]
                    ? `${formatBytes(
                        (fileSizes?.[item.input] ?? 0) *
                          Math.min(perFileProgress[item.input] ?? 0, 100) /
                          100,
                      )}`
                    : undefined
                }
              />
              <p className="micro subtle">
                {formatBytes(
                  (fileSizes?.[item.input] ?? 0) *
                    Math.min(perFileProgress[item.input] ?? 0, 100) /
                    100,
                )}{" "}
                / {formatBytes(fileSizes?.[item.input])}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
