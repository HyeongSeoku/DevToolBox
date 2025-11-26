import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { openPath } from "@tauri-apps/plugin-opener";
import { useTauriEnv } from "../../hooks/useTauriEnv";
import { useFileSelection } from "../../hooks/useFileSelection";
import {
  useConversionJob,
  TargetFormat,
  GifQuality,
  Mode,
} from "../../hooks/useConversionJob";
import { Hero } from "../../components/Hero";
import { DropZone } from "../../components/DropZone";
import { FileList } from "../../components/FileList";
import { ModeSwitch } from "../../components/ModeSwitch";
import { ConvertOptions } from "../../components/ConvertOptions";
import { GifOptions } from "../../components/GifOptions";
import { OutputSettings } from "../../components/OutputSettings";
import { ResultsPanel } from "../../components/ResultsPanel";
import styles from "./index.module.scss";
import { Navigate } from "react-router-dom";
import { useToast } from "../../components/ToastProvider";

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

const imageExts = ["jpg", "jpeg", "png", "webp", "bmp", "gif"];
const videoExts = ["mp4", "mov", "mkv", "avi"];

type ConvertPageProps = {
  modeOverride?: Mode;
  recentAdd: (title: string, detail: string) => void;
};

export function ConvertPage({ modeOverride, recentAdd }: ConvertPageProps) {
  const isTauriEnv = useTauriEnv();
  const {
    files: selectedFiles,
    addFiles,
    removeFile,
    clearFiles,
  } = useFileSelection();
  const toast = useToast();
  const [mode, setMode] = useState<Mode>(modeOverride ?? "convert");
  const [targetFormat, setTargetFormat] = useState<TargetFormat>("webp");
  const [qualityPercent, setQualityPercent] = useState(90);
  const [scalePercent, setScalePercent] = useState(100);
  const [outputDir, setOutputDir] = useState<string | null>(null);
  const [renamePattern, setRenamePattern] = useState("{basename}_converted");
  const [stripExif, setStripExif] = useState(false);
  const [batchMode, setBatchMode] = useState(true);

  const [gifFps, setGifFps] = useState(15);
  const [gifQuality, setGifQuality] = useState<GifQuality>("medium");

  const {
    busy,
    status,
    results,
    progress,
    perFileProgress,
    runConversion,
    setStatus,
  } = useConversionJob(isTauriEnv);

  useEffect(() => {
    if (modeOverride) {
      setMode(modeOverride);
    }
  }, [modeOverride]);

  useEffect(() => {
    if (!isTauriEnv) return;
    const unlistenPromise = listen<string[]>("tauri://file-drop", (event) => {
      const paths = (event.payload || []).filter((p) => {
        const lower = p.toLowerCase();
        return mode === "gif"
          ? videoExts.some((ext) => lower.endsWith(`.${ext}`))
          : imageExts.some((ext) => lower.endsWith(`.${ext}`));
      });
      if (paths.length) {
        addFiles(mode === "gif" ? [paths[0]] : paths);
      }
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, [isTauriEnv, addFiles, mode]);

  useEffect(() => {
    if (!results.length) return;
    const latest = results[results.length - 1];
    const kind = mode === "gif" ? "비디오→GIF" : "이미지 변환";
    const detail = latest.output || latest.error || latest.input;
    recentAdd(kind, detail);
  }, [results, mode, recentAdd]);

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

  const pickFiles = async () => {
    if (!isTauriEnv) {
      const msg = "Tauri 환경에서 실행하세요. (파일 시스템 접근 필요)";
      setStatus(msg);
      toast.show(msg, "error");
      return;
    }
    try {
      const exts = mode === "gif" ? videoExts : imageExts;
      const paths = await invoke<string[]>("pick_files", {
        multiple: true,
        extensions: exts,
      });
      if (paths && paths.length) {
        addFiles(mode === "gif" ? [paths[0]] : paths);
      }
    } catch (error) {
      const msg = `파일 선택 실패: ${error}`;
      setStatus(msg);
      toast.show(msg, "error");
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
      const msg = `폴더 선택 실패: ${error}`;
      setStatus(msg);
      toast.show(msg, "error");
    }
  };

  const handleRun = () => {
    if (mode === "gif" && selectedFiles.length > 1) {
      setStatus("GIF는 첫 번째 비디오만 사용합니다.");
    }
    runConversion({
      mode,
      selectedFiles,
      batchMode,
      convertOptions: {
        target_format: targetFormat,
        quality_percent: qualityPercent,
        output_dir: outputDir,
        scale_percent: scalePercent,
        rename_pattern: renamePattern || null,
        strip_exif: stripExif,
      },
      gifOptions: {
        fps: gifFps,
        quality: gifQuality,
        scale_percent: scalePercent,
        output_dir: outputDir,
        rename_pattern: renamePattern || null,
      },
    });
  };

  const handleOpen = async (path?: string) => {
    if (!path) return;
    try {
      await openPath(path);
    } catch (error) {
      const msg = `열기 실패: ${error}. 설정에서 opener 권한을 허용해 주세요.`;
      setStatus(msg);
      toast.show(msg, "error");
    }
  };

  return (
    <div className={styles.page}>
      <Hero
        qualityPercent={qualityPercent}
        scalePercent={scalePercent}
        fileCount={selectedFiles.length}
        mode={mode}
        busy={busy}
        onRun={handleRun}
      />

      {mode === "convert" && (
        <div className="preset-row">
          {webPresets.map((preset) => (
            <button
              key={preset.label}
              className="chip"
              onClick={() => {
                setTargetFormat(preset.targetFormat);
                setQualityPercent(preset.quality);
                setScalePercent(preset.scale);
                setStatus(`프리셋 적용: ${preset.label}`);
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}

      <section className="layout">
        <div>
          <DropZone
            onFilesAdded={(paths) => {
              const filtered = paths.filter((p) => {
                const lower = p.toLowerCase();
                return mode === "gif"
                  ? videoExts.some((ext) => lower.endsWith(`.${ext}`))
                  : imageExts.some((ext) => lower.endsWith(`.${ext}`));
              });
              if (!filtered.length) {
                setStatus(
                  mode === "gif"
                    ? "mp4/mov/mkv/avi만 지원합니다."
                    : "이미지 파일만 지원합니다."
                );
                return;
              }
              addFiles(mode === "gif" ? [filtered[0]] : filtered);
            }}
            onPickFiles={pickFiles}
            onPickFolder={pickFolder}
            onClear={clearFiles}
            busy={busy}
          />
          <FileList
            files={selectedFiles}
            onRemove={removeFile}
            batchMode={mode === "gif" ? false : batchMode}
            onToggleBatch={setBatchMode}
          />
        </div>

        <div className="panel options-panel">
          <ModeSwitch mode={mode} onChange={setMode} />

          {mode === "convert" ? (
            <ConvertOptions
              targetFormat={targetFormat}
              onTargetChange={setTargetFormat}
              qualityPercent={qualityPercent}
              onQualityChange={setQualityPercent}
              qualityPresets={qualityPresets}
              scalePercent={scalePercent}
              onScaleChange={setScalePercent}
              stripExif={stripExif}
              onStripExifChange={setStripExif}
              qualityWarning={qualityWarning}
            />
          ) : (
            <GifOptions
              fps={gifFps}
              onFpsChange={setGifFps}
              gifQuality={gifQuality}
              onQualityChange={setGifQuality}
              scalePercent={scalePercent}
              onScaleChange={setScalePercent}
            />
          )}

          <OutputSettings
            outputDir={outputDir}
            renamePattern={renamePattern}
            onOutputDirChange={setOutputDir}
            onBrowseOutput={pickFolder}
            onRenamePatternChange={setRenamePattern}
          />
        </div>
      </section>

      <ResultsPanel
        status={status}
        progress={progress}
        results={results}
        perFileProgress={perFileProgress}
        onOpen={handleOpen}
        successCount={conversionSummary.success}
        failCount={conversionSummary.failed}
      />
    </div>
  );
}
