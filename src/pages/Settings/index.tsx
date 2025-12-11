import { useEffect } from "react";

import { invoke } from "@tauri-apps/api/core";

import styles from "./index.module.scss";
import { useToast } from "@/components/ToastProvider";
import { Button } from "@/components/ui/Button";
import { useTauriEnv } from "@/hooks/useTauriEnv";
import { useVaultStore } from "@/stores/useVaultStore";

export function SettingsPage() {
  const toast = useToast();
  const isTauriEnv = useTauriEnv();
  const { settings, loading, error, initVault, setVaultPath, reload } =
    useVaultStore((state) => ({
      settings: state.settings,
      loading: state.loading,
      error: state.error,
      initVault: state.initVault,
      setVaultPath: state.setVaultPath,
      reload: state.reload,
    }));

  useEffect(() => {
    if (!isTauriEnv || settings || loading) return;
    void initVault(null);
  }, [initVault, isTauriEnv, loading, settings]);

  const handlePickVault = async () => {
    if (!isTauriEnv) {
      toast.show("Vault 변경은 Tauri 환경에서만 가능합니다.", {
        type: "error",
      });
      return;
    }
    try {
      const picked = await invoke<string | null>("pick_folder");
      if (!picked) return;
      await setVaultPath(picked);
      toast.show("Vault 경로를 변경했습니다.", { type: "success" });
    } catch (err) {
      toast.show(`폴더 선택 실패: ${err}`, { type: "error" });
    }
  };

  const handleUseDefault = async () => {
    if (!isTauriEnv) return;
    await initVault(null);
    toast.show("기본 Vault 위치를 사용합니다.", { type: "success" });
  };

  const handleReload = async () => {
    await reload();
    toast.show("Vault 설정을 새로 불러왔습니다.", { type: "success" });
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className="eyebrow">설정</p>
        <h1>Vault 및 데이터 경로</h1>
        <p className="micro">
          모든 히스토리와 설정은 로컬 Vault에 저장됩니다. 기본 경로가 없으면
          실행 시 자동으로 생성합니다.
        </p>
      </header>

      {!isTauriEnv && (
        <div className={styles.callout}>
          <p>Tauri 환경에서 실행해야 파일 시스템에 접근할 수 있습니다.</p>
          <p className="micro">
            브라우저에서 열었다면 데스크톱 앱으로 실행해 주세요.
          </p>
        </div>
      )}

      <section className={styles.card}>
        <div>
          <p className={styles.label}>현재 Vault 경로</p>
          <p className={styles.path}>{settings?.vaultPath ?? "미설정"}</p>
          {error && <p className={styles.error}>{error}</p>}
          {loading && <p className="micro">저장 위치를 확인하는 중...</p>}
        </div>
        <div className={styles.actions}>
          <Button variant="ghost" onClick={handleReload}>
            새로고침
          </Button>
          <Button variant="ghost" onClick={handleUseDefault}>
            기본 위치 사용
          </Button>
          <Button variant="primary" onClick={handlePickVault}>
            다른 폴더 선택
          </Button>
        </div>
      </section>

      <section className={styles.card}>
        <p className={styles.label}>폴더 구조</p>
        <ul className={styles.list}>
          <li>
            <span className={styles.folder}>settings.json</span> · Vault 설정
          </li>
          <li>
            <span className={styles.folder}>env-history/</span> · .env 백업
          </li>
          <li>
            <span className={styles.folder}>convert-history/</span> · 변환
            기록(JSON)
          </li>
          <li>
            <span className={styles.folder}>diff/</span> · 파일 비교 임시 저장
          </li>
          <li>
            <span className={styles.folder}>tmp/</span> · 임시 파일 (필요 시
            정리)
          </li>
        </ul>
      </section>
    </div>
  );
}
