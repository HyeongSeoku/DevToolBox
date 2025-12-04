import { Button } from "@/components/ui/Button";

import panelStyles from "./Panels.module.scss";
import { type ConversionResult } from "../hooks/useConversionJob";

type Progress = { percent: number; label: string };

type ResultsPanelProps = {
  status: string;
  progress: Progress;
  results: ConversionResult[];
  perFileProgress: Record<string, number>;
  onOpen: (path?: string) => Promise<void> | void;
  successCount: number;
  failCount: number;
};

export function ResultsPanel({
  status,
  progress,
  results,
  perFileProgress,
  onOpen,
  successCount,
  failCount,
}: ResultsPanelProps) {
  return (
    <section className={`${panelStyles.panel} ${panelStyles.results}`}>
      <div className={panelStyles.resultsHeader}>
        <div>
          <p className="micro">상태</p>
          <p className={panelStyles.statusText}>{status || "대기 중"}</p>
          {progress.percent > 0 && (
            <div className={panelStyles.progressRow}>
              <div className={panelStyles.progressBar}>
                <div
                  className={panelStyles.progressFill}
                  style={{ width: `${Math.min(progress.percent, 100)}%` }}
                />
              </div>
              <p className="micro">{progress.label}</p>
            </div>
          )}
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
            <div className={panelStyles.progressBar} style={{ maxWidth: 160 }}>
              <div
                className={panelStyles.progressFill}
                style={{
                  width: `${Math.min(perFileProgress[item.input] ?? 0, 100)}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
