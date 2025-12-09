import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";

import panelStyles from "./Panels.module.scss";
import { type TargetFormat } from "../hooks/useConversionJob";

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
              <Button
                key={fmt}
                variant="pill"
                active={targetFormat === fmt}
                onClick={() => onTargetChange(fmt)}
              >
                {fmt.toUpperCase()}
              </Button>
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
              <Button
                key={preset.label}
                variant="pill"
                onClick={() => onQualityChange(preset.value)}
              >
                {preset.label}
              </Button>
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
          <Checkbox
            checked={stripExif}
            onChange={(e) => onStripExifChange(e.target.checked)}
            label="EXIF 제거 (기본 Off)"
          />
        </div>
      </div>
      {qualityWarning && <p className="warning">{qualityWarning}</p>}
    </>
  );
}
