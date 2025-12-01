import { useState, type DragEvent } from "react";

import panelStyles from "./Panels.module.scss";
import { Button } from "@/components/ui/Button";

type DropZoneProps = {
  onFilesAdded: (paths: string[]) => void;
  onHoverChange?: (isHovering: boolean) => void;
  onPickFiles: () => void;
  onPickFolder: () => void;
  onClear: () => void;
  busy: boolean;
  title?: string;
  subtitle?: string;
};

export function DropZone({
  onFilesAdded,
  onPickFiles,
  onPickFolder,
  onClear,
  busy,
  title,
  subtitle,
}: DropZoneProps) {
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
    onHoverChange?.(false);
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
      onDragLeave={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsHovering(false);
        onHoverChange?.(false);
      }}
      onDrop={handleDrop}
      onDragEnter={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsHovering(true);
        onHoverChange?.(true);
      }}
    >
      <div className={panelStyles.dropZone}>
        <p className={panelStyles.dropTitle}>{title ?? "파일 끌어다 놓기"}</p>
        <p className={panelStyles.dropSub}>
          {subtitle ??
            "이미지 변환: jpg, jpeg, png, webp, bmp, gif · 비디오 → GIF: mp4, mov, mkv, avi"}
        </p>
        <div className={panelStyles.dropActions}>
          <Button variant="ghost" onClick={onPickFiles} disabled={busy}>
            파일 선택
          </Button>
          <Button variant="ghost" onClick={onPickFolder} disabled={busy}>
            출력 폴더 지정
          </Button>
          <Button variant="ghost" onClick={onClear} disabled={busy}>
            리스트 초기화
          </Button>
        </div>
      </div>
    </div>
  );
}
