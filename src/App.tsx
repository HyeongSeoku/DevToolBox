import { useEffect, useMemo, useState, type DragEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { openPath } from "@tauri-apps/plugin-opener";
import "./App.css";

type TargetFormat = "jpeg" | "png" | "webp";
type GifQuality = "low" | "medium" | "high";

type ConversionResult = {
  input: string;
  output?: string;
  error?: string;
};

type Mode = "convert" | "gif";
type ProgressPayload = {
  job_id: string;
  total: number;
  current: number;
  path: string;
  status: string;
};
type CompletePayload = { job_id: string; results: ConversionResult[] };

const qualityPresets = [
  { label: "100% · 거의 무손실", value: 100 },
  { label: "95% · 고품질", value: 95 },
  { label: "90% · 업로드 기본", value: 90 },
  { label: "80% · 블로그 최적화", value: 80 },
  { label: "70% · 최대 압축", value: 70 },
];

const webPresets = [
  {
    label: "블로그 최적화",
    targetFormat: "jpeg" as TargetFormat,
    quality: 85,
    scale: 70,
  },
  {
    label: "썸네일",
    targetFormat: "jpeg" as TargetFormat,
    quality: 80,
    scale: 50,
  },
  {
    label: "고품질 WebP",
    targetFormat: "webp" as TargetFormat,
    quality: 90,
    scale: 100,
  },
];

const detectTauri = () => {
  if (typeof window === "undefined") return false;
  const w = window as any;
  return Boolean(w.__TAURI_INTERNALS__ || w.__TAURI_IPC__ || w.__TAURI__);
};

function App() {
  const [isTauriEnv, setIsTauriEnv] = useState(false);
  const [mode, setMode] = useState<Mode>("convert");
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [isHovering, setIsHovering] = useState(false);
  const [targetFormat, setTargetFormat] = useState<TargetFormat>("webp");
  const [qualityPercent, setQualityPercent] = useState(90);
  const [scalePercent, setScalePercent] = useState(100);
  const [outputDir, setOutputDir] = useState<string | null>(null);
  const [renamePattern, setRenamePattern] = useState("{basename}_converted");
  const [stripExif, setStripExif] = useState(false);
  const [batchMode, setBatchMode] = useState(true);

  const [gifFps, setGifFps] = useState(15);
  const [gifQuality, setGifQuality] = useState<GifQuality>("medium");

  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [results, setResults] = useState<ConversionResult[]>([]);
  const [progress, setProgress] = useState<{ percent: number; label: string }>({
    percent: 0,
    label: "",
  });
  const [jobId, setJobId] = useState<string | null>(null);

  useEffect(() => {
    setIsTauriEnv(detectTauri());
  }, []);

  useEffect(() => {
    if (!isTauriEnv) return;
    const progressUnlistenPromise = listen<ProgressPayload>(
      "conversion-progress",
      (event) => {
        const { job_id, total, current, path, status } = event.payload;
        if (!jobId || jobId !== job_id) return;
        const percent = Math.round((current / Math.max(total, 1)) * 100);
        setProgress({
          percent,
          label: `${percent}% · ${status === "error" ? "실패" : "진행"} · ${
            path.split(/[/\\]/).pop() || ""
          }`,
        });
      }
    );

    const completeUnlistenPromise = listen<CompletePayload>(
      "conversion-complete",
      (event) => {
        if (!jobId || jobId !== event.payload.job_id) return;
        setResults(event.payload.results);
        setStatus("일괄 변환 완료");
        setBusy(false);
        setProgress({ percent: 100, label: "완료" });
        setJobId(null);
      }
    );

    const unlistenPromise = listen<string[]>("tauri://file-drop", (event) => {
      const paths = event.payload || [];
      if (paths.length) {
        addFiles(paths);
      }
    });

    return () => {
      progressUnlistenPromise.then((unlisten) => unlisten());
      completeUnlistenPromise.then((unlisten) => unlisten());
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, [isTauriEnv, jobId]);

  const addFiles = (paths: string[]) => {
    setSelectedFiles((prev) => {
      const merged = [...prev, ...paths];
      return Array.from(new Set(merged));
    });
  };

  const removeFile = (path: string) => {
    setSelectedFiles((prev) => prev.filter((item) => item !== path));
  };

  const pickFiles = async () => {
    if (!isTauriEnv) {
      setStatus("Tauri 환경에서 실행하세요. (파일 시스템 접근 필요)");
      return;
    }
    try {
      const paths = await invoke<string[]>("pick_files", { multiple: true });
      if (paths && paths.length) {
        addFiles(paths);
      }
    } catch (error) {
      setStatus(`파일 선택 실패: ${error}`);
    }
  };

  const pickFolder = async () => {
    if (!isTauriEnv) {
      setStatus("Tauri 환경에서 실행하세요. (파일 시스템 접근 필요)");
      return;
    }
    try {
      const path = await invoke<string | null>("pick_folder");
      if (path) {
        setOutputDir(path);
      }
    } catch (error) {
      setStatus(`폴더 선택 실패: ${error}`);
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsHovering(false);
    const paths: string[] = [];
    // Tauri will also fire a tauri://file-drop event, but we keep this for browsers.
    if (event.dataTransfer?.files?.length) {
      for (const file of Array.from(event.dataTransfer.files)) {
        const path = (file as File & { path?: string }).path;
        if (path) {
          paths.push(path);
        }
      }
    }
    if (paths.length) {
      addFiles(paths);
    }
  };

  const conversionSummary = useMemo(() => {
    const success = results.filter((r) => r.output).length;
    const failed = results.filter((r) => r.error).length;
    return { success, failed };
  }, [results]);

  const qualityWarning = useMemo(() => {
    if (mode !== "convert") return "";
    const reasons: string[] = [];
    if (scalePercent < 100) reasons.push("스케일 축소로 선명도 감소");
    if (targetFormat !== "webp") reasons.push("JPEG/PNG로 저장 시 손실 가능");
    if (qualityPercent < 95 && targetFormat !== "png") {
      reasons.push(`품질 ${qualityPercent}%로 손실 압축`);
    }
    if (stripExif) reasons.push("EXIF 제거");
    return reasons.length ? `화질 손실 가능: ${reasons.join(" · ")}` : "";
  }, [mode, qualityPercent, scalePercent, targetFormat, stripExif]);

  const runConversion = async () => {
    if (!isTauriEnv) {
      setStatus("Tauri 환경에서 실행하세요. (파일 변환은 데스크톱 권한 필요)");
      return;
    }
    if (!selectedFiles.length) {
      setStatus("이미지 파일을 추가하세요.");
      return;
    }
    if (mode === "gif" && selectedFiles.length > 1) {
      setStatus("GIF는 첫 번째 비디오만 사용합니다.");
    }
    setBusy(true);
    setResults([]);
    setStatus("작업 실행 중...");
    setProgress({ percent: 0, label: "준비 중..." });
    if (!(batchMode && selectedFiles.length > 1)) {
      setJobId(null);
    }
    try {
      if (mode === "gif") {
        const outputPath = await invoke<string>("video_to_gif", {
          path: selectedFiles[0],
          options: {
            fps: gifFps,
            quality: gifQuality,
            scale_percent: scalePercent,
            output_dir: outputDir,
            rename_pattern: renamePattern || null,
          },
        });
        setResults([{ input: selectedFiles[0], output: outputPath }]);
        setStatus("GIF 생성 완료");
        setProgress({ percent: 100, label: "완료" });
        return;
      }

      const options = {
        target_format: targetFormat,
        quality_percent: qualityPercent,
        output_dir: outputDir,
        scale_percent: scalePercent,
        rename_pattern: renamePattern || null,
        strip_exif: stripExif,
      };

      if (batchMode && selectedFiles.length > 1) {
        const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        setJobId(id);
        await invoke<void>("batch_convert", {
          // tauri commands expect camelCase args (jobId), while events emit job_id.
          jobId: id,
          paths: selectedFiles,
          options,
        });
        setStatus("일괄 변환 중...");
      } else {
        const single = await invoke<{ input: string; output: string }>(
          "convert_image",
          {
            path: selectedFiles[0],
            options,
          }
        );
        setResults([{ input: single.input, output: single.output }]);
        setStatus("변환 완료");
      }
    } catch (error) {
      setStatus(`오류: ${error}`);
      setBusy(false);
      setJobId(null);
    } finally {
      setProgress((prev) =>
        prev.percent === 0 ? { percent: 100, label: "완료" } : prev
      );
      if (!batchMode || selectedFiles.length <= 1) {
        setBusy(false);
      }
    }
  };

  const handleOpen = async (path?: string) => {
    if (!path) return;
    try {
      await openPath(path);
    } catch (error) {
      setStatus(`열기 실패: ${error}`);
    }
  };

  return (
    <main className="page">
      <header className="hero">
        <div>
          <p className="eyebrow">Image Utility · Tauri</p>
          <h1>멀티 포맷 변환 · 압축 · GIF 빌더</h1>
          <p className="lede">
            로컬 이미지를 원하는 포맷으로 빠르게 변환하고, 품질/스케일/EXIF
            옵션을 한번에 조절하세요. 드래그 앤 드롭, 배치 변환, 웹 최적화
            프리셋까지 지원합니다.
          </p>
          <div className="preset-row">
            {webPresets.map((preset) => (
              <button
                key={preset.label}
                className="chip"
                onClick={() => {
                  setTargetFormat(preset.targetFormat);
                  setQualityPercent(preset.quality);
                  setScalePercent(preset.scale);
                  setMode("convert");
                  setStatus(`프리셋 적용: ${preset.label}`);
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
        <div className="hero-card">
          <p className="hero-label">빠른 실행</p>
          <div className="hero-stats">
            <div>
              <p className="stat-value">{qualityPercent}%</p>
              <p className="stat-label">품질</p>
            </div>
            <div>
              <p className="stat-value">{scalePercent}%</p>
              <p className="stat-label">스케일</p>
            </div>
            <div>
              <p className="stat-value">{selectedFiles.length}</p>
              <p className="stat-label">선택된 파일</p>
            </div>
          </div>
          <button className="primary" onClick={runConversion} disabled={busy}>
            {busy ? "처리 중..." : mode === "gif" ? "GIF 만들기" : "변환 실행"}
          </button>
          <p className="micro">
            PNG는 무손실 저장 · 비디오 → GIF 지원 (ffmpeg 필요)
          </p>
        </div>
      </header>

      <section className="layout">
        <div
          className={`panel drop-panel ${isHovering ? "hover" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsHovering(true);
          }}
          onDragLeave={() => setIsHovering(false)}
          onDrop={handleDrop}
        >
          <div className="drop-zone">
            <p className="drop-title">파일 끌어다 놓기</p>
            <p className="drop-sub">
              이미지 변환: jpg, jpeg, png, webp, bmp, gif · 비디오 → GIF: mp4,
              mov, mkv, avi
            </p>
            <div className="drop-actions">
              <button className="ghost" onClick={pickFiles} disabled={busy}>
                파일 선택
              </button>
              <button className="ghost" onClick={pickFolder} disabled={busy}>
                출력 폴더 지정
              </button>
              <button
                className="ghost"
                onClick={() => setSelectedFiles([])}
                disabled={busy}
              >
                리스트 초기화
              </button>
            </div>
          </div>

          <div className="file-list">
            <div className="file-list-header">
              <div>
                <p className="micro">선택된 파일</p>
                <p className="subtle">
                  {selectedFiles.length ? `${selectedFiles.length}개` : "없음"}
                </p>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={batchMode}
                  onChange={(e) => setBatchMode(e.target.checked)}
                />
                <span>일괄 변환</span>
              </label>
            </div>
            <div className="file-scroll">
              {selectedFiles.length === 0 && (
                <p className="subtle">
                  변환할 파일을 추가하세요. 드래그 앤 드롭 지원.
                </p>
              )}
              {selectedFiles.map((path) => (
                <div key={path} className="file-row">
                  <div>
                    <p className="file-name">{path.split(/[/\\]/).pop()}</p>
                    <p className="file-path">{path}</p>
                  </div>
                  <button
                    className="icon-button"
                    onClick={() => removeFile(path)}
                    aria-label="삭제"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="panel options-panel">
          <div className="mode-switch">
            <button
              className={`pill ${mode === "convert" ? "active" : ""}`}
              onClick={() => setMode("convert")}
            >
              포맷 변환 / 압축
            </button>
            <button
              className={`pill ${mode === "gif" ? "active" : ""}`}
              onClick={() => setMode("gif")}
            >
              비디오 → GIF
            </button>
          </div>

          {mode === "convert" ? (
            <>
              <div className="option-grid">
                <div>
                  <p className="label">타겟 포맷</p>
                  <div className="chip-row">
                    {(["jpeg", "png", "webp"] as TargetFormat[]).map((fmt) => (
                      <button
                        key={fmt}
                        className={`chip ${
                          targetFormat === fmt ? "active" : ""
                        }`}
                        onClick={() => setTargetFormat(fmt)}
                      >
                        {fmt.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="label">품질 {qualityPercent}%</p>
                  <input
                    type="range"
                    min={50}
                    max={100}
                    value={qualityPercent}
                    onChange={(e) => setQualityPercent(Number(e.target.value))}
                  />
                  <div className="chip-row">
                    {qualityPresets.map((preset) => (
                      <button
                        key={preset.label}
                        className="mini-chip"
                        onClick={() => setQualityPercent(preset.value)}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="option-grid">
                <div>
                  <p className="label">스케일 {scalePercent}%</p>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    value={scalePercent}
                    onChange={(e) => setScalePercent(Number(e.target.value))}
                  />
                  <p className="micro">10~100% 리사이즈. 100%는 원본 크기.</p>
                </div>
                <div>
                  <p className="label">EXIF 제거</p>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={stripExif}
                      onChange={(e) => setStripExif(e.target.checked)}
                    />
                    <span>EXIF 제거 (기본 Off)</span>
                  </label>
                </div>
              </div>
              {qualityWarning && <p className="warning">{qualityWarning}</p>}
            </>
          ) : (
            <>
              <div className="option-grid">
                <div>
                  <p className="label">FPS {gifFps}</p>
                  <input
                    type="range"
                    min={1}
                    max={30}
                    value={gifFps}
                    onChange={(e) => setGifFps(Number(e.target.value))}
                  />
                </div>
                <div>
                  <p className="label">GIF 품질</p>
                  <div className="chip-row">
                    {(["low", "medium", "high"] as GifQuality[]).map(
                      (preset) => (
                        <button
                          key={preset}
                          className={`chip ${
                            gifQuality === preset ? "active" : ""
                          }`}
                          onClick={() => setGifQuality(preset)}
                        >
                          {preset === "low"
                            ? "Low"
                            : preset === "medium"
                            ? "Medium"
                            : "High"}
                        </button>
                      )
                    )}
                  </div>
                </div>
                <div>
                  <p className="label">스케일 {scalePercent}%</p>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    value={scalePercent}
                    onChange={(e) => setScalePercent(Number(e.target.value))}
                  />
                </div>
              </div>
              <p className="micro">
                비디오는 1개만 사용합니다. 여러 개 선택 시 첫 번째 파일을
                변환합니다.
              </p>
            </>
          )}

          <div className="option-grid">
            <div>
              <p className="label">출력 폴더</p>
              <div className="inline-row">
                <input
                  type="text"
                  value={outputDir || ""}
                  placeholder="입력 폴더와 동일"
                  onChange={(e) => setOutputDir(e.target.value || null)}
                />
                <button className="ghost" onClick={pickFolder} disabled={busy}>
                  찾기
                </button>
              </div>
            </div>
            <div>
              <p className="label">파일 이름 패턴</p>
              <input
                type="text"
                value={renamePattern}
                onChange={(e) => setRenamePattern(e.target.value)}
                placeholder="{basename}_converted"
              />
              <p className="micro">
                사용 가능: {"{basename}"}, {"{ext}"}, {"{YYYYMMDD_HHmmss}"},{" "}
                {"{index_0001}"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="panel results">
        <div className="results-header">
          <div>
            <p className="micro">상태</p>
            <p className="status-text">{status || "대기 중"}</p>
            {progress.percent > 0 && (
              <div className="progress-row">
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${Math.min(progress.percent, 100)}%` }}
                  />
                </div>
                <p className="micro">{progress.label}</p>
              </div>
            )}
          </div>
          <div className="stat-group">
            <div>
              <p className="stat-value small">{conversionSummary.success}</p>
              <p className="stat-label">성공</p>
            </div>
            <div>
              <p className="stat-value small">{conversionSummary.failed}</p>
              <p className="stat-label">실패</p>
            </div>
          </div>
        </div>
        <div className="results-body">
          {results.length === 0 && (
            <p className="subtle">변환 결과가 여기에 표시됩니다.</p>
          )}
          {results.map((item) => (
            <div
              key={`${item.input}-${item.output ?? item.error ?? "err"}`}
              className={`result-row ${item.error ? "error" : "success"}`}
            >
              <div>
                <p className="file-name">{item.input.split(/[/\\]/).pop()}</p>
                <p className="file-path">{item.output || item.error}</p>
              </div>
              {item.output && (
                <button
                  className="ghost"
                  onClick={() => handleOpen(item.output)}
                >
                  열기
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

export default App;
