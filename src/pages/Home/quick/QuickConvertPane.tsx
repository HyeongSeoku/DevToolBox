import { useState } from "react";

import { invoke } from "@tauri-apps/api/core";

import { useToast } from "@/components/ToastProvider";
import { useTauriEnv } from "@/hooks/useTauriEnv";
import styles from "../index.module.scss";

const imageExts = ["jpg", "jpeg", "png", "webp", "bmp", "gif"];

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
      const paths = await invoke<string[]>("pick_files", {
        multiple: true,
        extensions: imageExts,
      });
      if (!paths || !paths.length) {
        setStatus("선택된 파일이 없습니다.");
        setBusy(false);
        return;
      }
      setStatus("변환 중...");
      for (const path of paths.slice(0, 2)) {
        await invoke("convert_image", {
          path,
          options: {
            target_format: "webp",
            quality_percent: 90,
            scale_percent: 100,
            output_dir: null,
            rename_pattern: "{basename}_quick",
            strip_exif: false,
          },
        });
      }
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
