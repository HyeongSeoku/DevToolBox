import { useState, type DragEvent } from "react";

import panelStyles from "./Panels.module.scss";

type DropZoneProps = {
  onFilesAdded: (paths: string[]) => void;
  onHoverChange?: (isHovering: boolean) => void;
  onPickFiles: () => void;
  onPickFolder: () => void;
  onClear: () => void;
  busy: boolean;
};

export function DropZone({ onFilesAdded, onPickFiles, onPickFolder, onClear, busy }: DropZoneProps) {
  const [isHovering, setIsHovering] = useState(false);

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsHovering(false);
    const paths: string[] = [];
    if (event.dataTransfer?.files?.length) {
      for (const file of Array.from(event.dataTransfer.files)) {
        const path = (file as File & { path?: string }).path;
        if (path) {
          paths.push(path);
        }
      }
    }
    if (paths.length) {
      onFilesAdded(paths);
    }
  };

  return (
    <div
      className={`${panelStyles.panel} ${panelStyles.dropPanel} ${isHovering ? panelStyles.hover : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsHovering(true);
        onHoverChange?.(true);
      }}
      onDragLeave={() => {
        setIsHovering(false);
        onHoverChange?.(false);
      }}
      onDrop={handleDrop}
    >
      <div className={panelStyles.dropZone}>
        <p className={panelStyles.dropTitle}>파일 끌어다 놓기</p>
        <p className={panelStyles.dropSub}>
          이미지 변환: jpg, jpeg, png, webp, bmp, gif · 비디오 → GIF: mp4, mov, mkv, avi
        </p>
        <div className={panelStyles.dropActions}>
          <button className="ghost" onClick={onPickFiles} disabled={busy}>
            파일 선택
          </button>
          <button className="ghost" onClick={onPickFolder} disabled={busy}>
            출력 폴더 지정
          </button>
          <button className="ghost" onClick={onClear} disabled={busy}>
            리스트 초기화
          </button>
        </div>
      </div>
    </div>
  );
}
