import { useState } from "react";

import { useToast } from "@/components/ToastProvider";
import { useTauriEnv } from "@/hooks/useTauriEnv";
import {
  convertImagesQuick,
  defaultQuickConvertOptions,
  filterByExtensions,
  imageExtensions,
  pickFilesByExtensions,
} from "@/utils/convert";

import styles from "./QuickConvertPane.module.scss";

export function QuickConvertPane() {
  const toast = useToast();
  const isTauriEnv = useTauriEnv();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string>("");

  const handlePick = async () => {
    if (!isTauriEnv) {
      setStatus("Tauri 환경에서만 바로 변환이 가능합니다.");
      return;
    }
    try {
      setBusy(true);
      setStatus("파일 선택 중...");
      const paths = await pickFilesByExtensions(imageExtensions, true);
      if (!paths || !paths.length) {
        setStatus("선택된 파일이 없습니다.");
        setBusy(false);
        return;
      }
      const filtered = filterByExtensions(paths, imageExtensions);
      if (!filtered.length) {
        setStatus("이미지 파일만 선택하세요.");
        setBusy(false);
        return;
      }
      setStatus("변환 중...");
      await convertImagesQuick(
        filtered.slice(0, 2),
        defaultQuickConvertOptions,
      );
      setStatus("완료! 동일 폴더에 _quick.webp 저장.");
      toast.show("빠른 변환 완료", { type: "success" });
    } catch (error) {
      setStatus(`실패: ${error}`);
      toast.show("빠른 변환 실패", { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.pane}>
      <div className={styles.paneHeader}>
        <p className={styles.title}>빠른 이미지 변환</p>
        <p className="subtle">WebP · 품질 90% · 최대 2개</p>
      </div>
      <button className="primary" disabled={busy} onClick={handlePick}>
        {busy ? "변환 중..." : "이미지 선택해서 변환"}
      </button>
      {status && <p className="micro">{status}</p>}
    </div>
  );
}
