import Close from "@/assets/icons/close.svg?react";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";

import panelStyles from "./Panels.module.scss";

type FileListProps = {
  files: string[];
  onRemove: (path: string) => void;
  batchMode: boolean;
  onToggleBatch: (value: boolean) => void;
};

export function FileList({
  files,
  onRemove,
  batchMode,
  onToggleBatch,
}: FileListProps) {
  return (
    <div className={panelStyles.fileList}>
      <div className={panelStyles.fileListHeader}>
        <div>
          <p className="micro">선택된 파일</p>
          <p className="subtle">
            {files.length ? `${files.length}개` : "없음"}
          </p>
        </div>
        <Checkbox
          checked={batchMode}
          onChange={(e) => onToggleBatch(e.target.checked)}
          label="일괄 변환"
        />
      </div>
      <div className={panelStyles.fileScroll}>
        {files.length === 0 && (
          <p className="subtle">
            변환할 파일을 추가하세요. 드래그 앤 드롭 지원. 비디오는 GIF 모드에서
            1개만 처리됩니다.
          </p>
        )}
        {files.map((path) => (
          <div key={path} className={panelStyles.fileRow}>
            <div>
              <p className={panelStyles.fileName}>
                {path.split(/[/\\]/).pop()}
              </p>
              <p className={panelStyles.filePath}>{path}</p>
            </div>
            <Button
              variant="ghost"
              onClick={() => onRemove(path)}
              aria-label="삭제"
            >
              <Close width={14} height={14} />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
