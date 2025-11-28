import panelStyles from "./Panels.module.scss";
import { type GifQuality } from "../hooks/useConversionJob";

type GifOptionsProps = {
  fps: number;
  onFpsChange: (value: number) => void;
  gifQuality: GifQuality;
  onQualityChange: (value: GifQuality) => void;
  scalePercent: number;
  onScaleChange: (value: number) => void;
};

export function GifOptions({
  fps,
  onFpsChange,
  gifQuality,
  onQualityChange,
  scalePercent,
  onScaleChange,
}: GifOptionsProps) {
  return (
    <div className="option-grid">
      <div>
        <p className={panelStyles.label}>FPS {fps}</p>
        <input type="range" min={1} max={30} value={fps} onChange={(e) => onFpsChange(Number(e.target.value))} />
      </div>
      <div>
        <p className={panelStyles.label}>GIF 품질</p>
        <div className={panelStyles.chipRow}>
          {(["low", "medium", "high"] as GifQuality[]).map((preset) => (
            <button
              key={preset}
              className={`chip ${gifQuality === preset ? "active" : ""}`}
              onClick={() => onQualityChange(preset)}
            >
              {preset === "low" ? "Low" : preset === "medium" ? "Medium" : "High"}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className={panelStyles.label}>스케일 {scalePercent}%</p>
        <input
          type="range"
          min={10}
          max={100}
          value={scalePercent}
          onChange={(e) => onScaleChange(Number(e.target.value))}
        />
      </div>
      <p className="micro">비디오는 1개만 사용합니다. 여러 개 선택 시 첫 번째 파일을 변환합니다.</p>
    </div>
  );
}
