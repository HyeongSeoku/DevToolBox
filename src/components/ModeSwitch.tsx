import { Mode } from "../hooks/useConversionJob";
import panelStyles from "./Panels.module.scss";

type ModeSwitchProps = {
  mode: Mode;
  onChange: (mode: Mode) => void;
};

export function ModeSwitch({ mode, onChange }: ModeSwitchProps) {
  return (
    <div className={panelStyles.modeSwitch}>
      <button
        className={`${panelStyles.pill} ${mode === "convert" ? panelStyles.pillActive : ""}`}
        onClick={() => onChange("convert")}
      >
        포맷 변환 / 압축
      </button>
      <button
        className={`${panelStyles.pill} ${mode === "gif" ? panelStyles.pillActive : ""}`}
        onClick={() => onChange("gif")}
      >
        비디오 → GIF
      </button>
    </div>
  );
}
