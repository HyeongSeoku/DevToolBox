import classNames from "classnames";

import CancelCircle from "@/assets/icons/cancel_circle.svg?react";
import CheckCircle from "@/assets/icons/check_circle.svg?react";
import { Button } from "@/components/ui/Button";

import panelStyles from "./Panels.module.scss";
import { type ConversionResult } from "../hooks/useConversionJob";

type Progress = {
  percent: number;
  label: string;
  current?: number;
  total?: number;
  path?: string;
};

type RingProps = {
  percent: number;
  size?: number;
  stroke?: number;
  mainText?: string;
  subText?: string;
};

const Ring: React.FC<RingProps> = ({
  percent,
  size = 56,
  stroke = 6,
  mainText,
  subText,
}) => {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(percent, 100));
  const dashoffset = circumference * (1 - clamped / 100);
  const limitedMain =
    mainText && mainText.length > 7
      ? `${mainText.slice(0, 6)}…`
      : (mainText ?? `${clamped}%`);
  const mainClass =
    (mainText?.length ?? 0) > 6
      ? `${panelStyles.ringText} ${panelStyles.ringTextSmall}`
      : panelStyles.ringText;

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
      <g transform={`rotate(90 ${size / 2} ${size / 2})`}>
        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          className={mainClass}
        >
          {limitedMain}
        </text>
      </g>
      {subText && (
        <text
          x="50%"
          y={size + 12}
          dominantBaseline="middle"
          textAnchor="middle"
          className={panelStyles.ringSubText}
        >
          {subText}
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

  const formatBytes = (bytes?: number, opts?: { noUnit?: boolean }): string => {
    if (bytes === undefined || bytes === null || bytes <= 0) return "-";
    const units = ["B", "KB", "MB", "GB"];
    let v = bytes;
    let i = 0;
    while (v >= 1024 && i < units.length - 1) {
      v /= 1024;
      i += 1;
    }
    const num = v.toFixed(v >= 10 ? 0 : 1);
    return opts?.noUnit ? num : `${num} ${units[i]}`;
  };

  return (
    <section className={`${panelStyles.panel} ${panelStyles.results}`}>
      <div className={panelStyles.resultsHeader}>
        <div className={panelStyles.statusBlock}>
          <p className="micro">상태</p>
          <p className={panelStyles.statusText}>{status || "대기 중"}</p>
        </div>
        <div className={panelStyles.statGroup}>
          <div
            className={classNames(
              panelStyles.statusContainer,
              panelStyles.successStatus,
            )}
          >
            <CheckCircle width={20} height={20} />
            <p>{successCount}</p>
          </div>
          <div
            className={classNames(
              panelStyles.statusContainer,
              panelStyles.errorStatus,
            )}
          >
            <CancelCircle width={20} height={20} />
            <p>{failCount}</p>
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
              mainText={`${Math.round(progress.percent)}%`}
              subText={
                progress.total && progress.current !== undefined
                  ? `${formatBytes(progress.current)}`
                  : undefined
              }
            />

            <div>
              <p className="summary-count">
                {completedFiles} / {totalFiles}
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
        {results.map((item) => {
          const size = fileSizes?.[item.input] ?? 0;
          const percent = perFileProgress[item.input] ?? 0;
          const clamped = Math.min(percent, 100);
          const processed = size > 0 ? (size * clamped) / 100 : undefined;
          const mainText =
            size > 0
              ? `${formatBytes(processed, { noUnit: true })} / ${formatBytes(size)}`
              : "- / -";

          return (
            <div
              key={`${item.input}-${item.output ?? item.error ?? "err"}`}
              className={`${panelStyles.resultRow} ${item.error ? panelStyles.error : panelStyles.success}`}
            >
              <div>
                <p className="file-name">{item.input.split(/[/\\]/).pop()}</p>
                <p className="file-path">{item.output || item.error}</p>
              </div>
              {item.output && (
                <Button onClick={() => onOpen(item.output)}>열기</Button>
              )}
              <div className={panelStyles.perFileProgress}>
                <Ring
                  percent={percent}
                  size={65}
                  stroke={6}
                  mainText={mainText}
                  subText={`${Math.round(percent)}%`}
                />
                <p className="micro subtle">{`${Math.round(percent)}%`}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
