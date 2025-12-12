import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

import panelStyles from "./Panels.module.scss";

type OutputSettingsProps = {
  outputDir: string | null;
  renamePattern: string;
  onOutputDirChange: (value: string | null) => void;
  onBrowseOutput: () => void;
  onRenamePatternChange: (value: string) => void;
};

export function OutputSettings({
  outputDir,
  renamePattern,
  onOutputDirChange,
  onBrowseOutput,
  onRenamePatternChange,
}: OutputSettingsProps) {
  return (
    <div className="option-grid">
      <div>
        <p className={panelStyles.label}>출력 폴더</p>
        <p className="micro">
          {outputDir ? outputDir : "입력 폴더와 동일 (미지정 시 자동 적용)"}
        </p>
        <div className="inline-row" style={{ gridTemplateColumns: "auto auto" }}>
          <Button variant="ghost" onClick={onBrowseOutput}>
            폴더 선택
          </Button>
          <Button
            variant="ghost"
            onClick={() => onOutputDirChange(null)}
            disabled={!outputDir}
          >
            기본 사용
          </Button>
        </div>
      </div>
      <div>
        <p className={panelStyles.label}>파일 이름 패턴</p>
        <Input
          type="text"
          value={renamePattern}
          onChange={(e) => onRenamePatternChange(e.target.value)}
          placeholder="{basename}_converted"
        />
        <p className="micro">
          사용 가능: {"{basename}"}, {"{ext}"}, {"{YYYYMMDD_HHmmss}"},{" "}
          {"{index_0001}"}
        </p>
      </div>
    </div>
  );
}
