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
        <div className="inline-row">
          <input
            type="text"
            value={outputDir || ""}
            placeholder="입력 폴더와 동일"
            onChange={(e) => onOutputDirChange(e.target.value || null)}
          />
          <button className="ghost" onClick={onBrowseOutput}>
            찾기
          </button>
        </div>
      </div>
      <div>
        <p className={panelStyles.label}>파일 이름 패턴</p>
        <input
          type="text"
          value={renamePattern}
          onChange={(e) => onRenamePatternChange(e.target.value)}
          placeholder="{basename}_converted"
        />
        <p className="micro">사용 가능: {"{basename}"}, {"{ext}"}, {"{YYYYMMDD_HHmmss}"}, {"{index_0001}"}</p>
      </div>
    </div>
  );
}
