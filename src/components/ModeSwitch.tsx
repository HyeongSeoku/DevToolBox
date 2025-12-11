import { Button } from "@/components/ui/Button";

import panelStyles from "./Panels.module.scss";
import { type ImageConvertMode } from "../hooks/useConversionJob";

type ModeSwitchProps = {
  mode: ImageConvertMode;
  onChange: (mode: ImageConvertMode) => void;
};

export function ModeSwitch({ mode, onChange }: ModeSwitchProps) {
  return (
    <div className={panelStyles.modeSwitch}>
      <Button
        variant="pill"
        className={`${panelStyles.pill} ${mode === "convert" ? panelStyles.pillActive : ""}`}
        onClick={() => onChange("convert")}
      >
        포맷 변환 / 압축
      </Button>
      <Button
        variant="pill"
        className={`${panelStyles.pill} ${mode === "gif" ? panelStyles.pillActive : ""}`}
        onClick={() => onChange("gif")}
      >
        비디오 → GIF
      </Button>
    </div>
  );
}
