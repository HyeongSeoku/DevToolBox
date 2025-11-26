import { TargetFormat } from "../hooks/useConversionJob";
import panelStyles from "./Panels.module.scss";

type QualityPreset = { label: string; value: number };

type ConvertOptionsProps = {
  targetFormat: TargetFormat;
  onTargetChange: (fmt: TargetFormat) => void;
  qualityPercent: number;
  onQualityChange: (value: number) => void;
  qualityPresets: QualityPreset[];
  scalePercent: number;
  onScaleChange: (value: number) => void;
  stripExif: boolean;
  onStripExifChange: (value: boolean) => void;
  qualityWarning: string;
};

export function ConvertOptions({
  targetFormat,
  onTargetChange,
  qualityPercent,
  onQualityChange,
  qualityPresets,
  scalePercent,
  onScaleChange,
  stripExif,
  onStripExifChange,
  qualityWarning,
}: ConvertOptionsProps) {
  return (
    <>
      <div className="option-grid">
        <div>
          <p className={panelStyles.label}>타겟 포맷</p>
          <div className={panelStyles.chipRow}>
            {(["jpeg", "png", "webp"] as TargetFormat[]).map((fmt) => (
              <button
                key={fmt}
                className={`chip ${targetFormat === fmt ? "active" : ""}`}
                onClick={() => onTargetChange(fmt)}
              >
                {fmt.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className={panelStyles.label}>품질 {qualityPercent}%</p>
          <input
            type="range"
            min={50}
            max={100}
            value={qualityPercent}
            onChange={(e) => onQualityChange(Number(e.target.value))}
          />
          <div className={panelStyles.chipRow}>
            {qualityPresets.map((preset) => (
              <button key={preset.label} className="mini-chip" onClick={() => onQualityChange(preset.value)}>
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="option-grid">
        <div>
          <p className={panelStyles.label}>스케일 {scalePercent}%</p>
          <input
            type="range"
            min={10}
            max={100}
            value={scalePercent}
            onChange={(e) => onScaleChange(Number(e.target.value))}
          />
          <p className="micro">10~100% 리사이즈. 100%는 원본 크기.</p>
        </div>
        <div>
          <p className={panelStyles.label}>EXIF 제거</p>
          <label className="switch">
            <input type="checkbox" checked={stripExif} onChange={(e) => onStripExifChange(e.target.checked)} />
            <span>EXIF 제거 (기본 Off)</span>
          </label>
        </div>
      </div>
      {qualityWarning && <p className="warning">{qualityWarning}</p>}
    </>
  );
}
