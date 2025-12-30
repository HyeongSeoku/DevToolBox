import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";

import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { type Event as TauriEvent } from "@tauri-apps/api/event";
import { getCurrentWebview, type DragDropEvent } from "@tauri-apps/api/webview";
import { openPath } from "@tauri-apps/plugin-opener";

import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { VideoPlayer } from "@/components/VideoPlayer";

import styles from "./index.module.scss";
import { ConvertOptions } from "../../components/ConvertOptions";
import { FileList } from "../../components/FileList";
import { OutputSettings } from "../../components/OutputSettings";
import { ResultsPanel } from "../../components/ResultsPanel";
import { useToast } from "../../components/ToastProvider";
import {
  useConversionJob,
  type TargetFormat,
  type GifQuality,
  type ImageConvertMode,
} from "../../hooks/useConversionJob";
import { useFileSelection } from "../../hooks/useFileSelection";
import { useTauriEnv } from "../../hooks/useTauriEnv";
import {
  filterByExtensions,
  imageExtensions,
  pickFilesByExtensions,
  videoExtensions,
} from "../../utils/convert";

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

type ConvertPageProps = {
  modeOverride?: ImageConvertMode;
  onModeChange?: (mode: ImageConvertMode) => void;
  recentAdd: (title: string, detail: string) => void;
};

export function ConvertPage({
  modeOverride,
  onModeChange,
  recentAdd,
}: ConvertPageProps) {
  const isTauriEnv = useTauriEnv();
  const {
    files: selectedFiles,
    addFiles,
    removeFile,
    clearFiles,
    replaceFiles,
  } = useFileSelection();
  const toast = useToast();
  const [mode, setMode] = useState<ImageConvertMode>(modeOverride ?? "convert");
  const [targetFormat, setTargetFormat] = useState<TargetFormat>("webp");
  const [qualityPercent, setQualityPercent] = useState(90);
  const [scalePercent, setScalePercent] = useState(100);
  const [outputDir, setOutputDir] = useState<string | null>(null);
  const [renamePattern, setRenamePattern] = useState("{basename}_converted");
  const [stripExif, setStripExif] = useState(false);
  const [batchMode, setBatchMode] = useState(true);

  const [gifFps, setGifFps] = useState(15);
  const [gifQuality, setGifQuality] = useState<GifQuality>("medium");
  const isGif = mode === "gif";
  const lastModeRef = useRef(mode);
  const [isPreviewHovering, setIsPreviewHovering] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const segmentRef = useRef<HTMLDivElement | null>(null);
  const [durationSec, setDurationSec] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [dragHandle, setDragHandle] = useState<"start" | "end" | null>(null);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [sourceDimensions, setSourceDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [outputWidth, setOutputWidth] = useState<number | "">("");
  const [outputHeight, setOutputHeight] = useState<number | "">("");
  const [lockAspect, setLockAspect] = useState(true);

  const {
    busy,
    status,
    results,
    progress,
    perFileProgress,
    fileSizes,
    runConversion,
    setStatus,
  } = useConversionJob(isTauriEnv);
  const latestResult = results.length ? results[results.length - 1] : null;

  useEffect(() => {
    if (modeOverride) {
      setMode(modeOverride);
    }
  }, [modeOverride]);

  useEffect(() => {
    if (lastModeRef.current !== mode) {
      clearFiles();
      lastModeRef.current = mode;
    }
  }, [mode, clearFiles]);

  useEffect(() => {
    setSourceDimensions(null);
    setOutputWidth("");
    setOutputHeight("");
    setLockAspect(true);
    setScalePercent(100);
    setDurationSec(0);
    setTrimStart(0);
    setTrimEnd(0);
    setThumbnails([]);
  }, [selectedFiles[0], isGif]);

  useEffect(() => {
    if (!isTauriEnv) return;
    const unlistenPromise = getCurrentWebview().onDragDropEvent(
      (event: TauriEvent<DragDropEvent>) => {
        if (event.payload.type !== "drop") return;
        const paths = isGif
          ? filterByExtensions(event.payload.paths || [], videoExtensions)
          : filterByExtensions(event.payload.paths || [], imageExtensions);
        if (paths.length) {
          if (isGif) {
            replaceFiles([paths[0]]);
          } else {
            addFiles(paths);
          }
        } else {
          setStatus(
            isGif
              ? "지원하지 않는 비디오 형식입니다."
              : "지원하지 않는 이미지 형식입니다.",
          );
        }
      },
    );

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, [isTauriEnv, addFiles, replaceFiles, isGif, setStatus]);

  useEffect(() => {
    if (!results.length) return;
    const latest = results[results.length - 1];
    const kind = isGif ? "비디오→GIF" : "이미지 변환";
    const detail = latest.output || latest.error || latest.input;
    recentAdd(kind, detail);
  }, [results, isGif, recentAdd]);

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

  const handleAddPaths = (paths: string[]) => {
    const filtered = isGif
      ? filterByExtensions(paths, videoExtensions)
      : filterByExtensions(paths, imageExtensions);
    if (!filtered.length) {
      setStatus(
        isGif ? "mp4/mov/mkv/avi만 지원합니다." : "이미지 파일만 지원합니다.",
      );
      return;
    }
    if (isGif) {
      replaceFiles([filtered[0]]);
    } else {
      addFiles(filtered);
    }
  };

  const previewSrc = selectedFiles[0]
    ? isTauriEnv
      ? convertFileSrc(selectedFiles[0])
      : null
    : null;

  useEffect(() => {
    if (!previewSrc) return;
    if (videoRef.current) {
      videoRef.current.load();
    }
  }, [previewSrc]);

  useEffect(() => {
    if (!previewSrc || !isGif) {
      setThumbnails([]);
      return;
    }
    let cancelled = false;
    const video = document.createElement("video");
    video.src = previewSrc;
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";

    const handleLoaded = async () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      if (!duration) {
        setThumbnails([]);
        return;
      }
      const count = 12;
      const baseOffset = Math.min(0.2, duration * 0.05);
      const canvas = document.createElement("canvas");
      const baseWidth = sourceDimensions?.width ?? 160;
      const baseHeight = sourceDimensions?.height ?? 90;
      const ratio = baseWidth / Math.max(baseHeight, 1);
      canvas.width = 120;
      canvas.height = Math.round(canvas.width / ratio);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const nextThumbs: string[] = [];
      const seekTo = (time: number) =>
        new Promise<void>((resolve) => {
          const handler = () => {
            video.removeEventListener("seeked", handler);
            resolve();
          };
          video.addEventListener("seeked", handler);
          video.currentTime = time;
        });

      for (let i = 0; i < count; i += 1) {
        const slice = (duration - baseOffset) / count;
        const time = Math.min(duration, baseOffset + slice * (i + 0.5));
        await seekTo(time);
        if (cancelled) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        nextThumbs.push(canvas.toDataURL("image/jpeg", 0.7));
      }

      if (!cancelled) {
        setThumbnails(nextThumbs);
      }
    };

    video.addEventListener("loadedmetadata", handleLoaded);

    return () => {
      cancelled = true;
      video.removeEventListener("loadedmetadata", handleLoaded);
      video.src = "";
    };
  }, [previewSrc, isGif, sourceDimensions]);

  const formatTime = (value: number) => {
    const safe = Math.max(0, value);
    const minutes = Math.floor(safe / 60);
    const seconds = Math.floor(safe % 60);
    const ms = Math.floor((safe - Math.floor(safe)) * 100);
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
      2,
      "0",
    )}.${String(ms).padStart(2, "0")}`;
  };

  const formatBytes = (value?: number) => {
    if (!value || value <= 0 || !Number.isFinite(value)) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    let size = value;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex += 1;
    }
    const precision = size >= 10 || unitIndex === 0 ? 0 : 1;
    return `${size.toFixed(precision)} ${units[unitIndex]}`;
  };

  const progressSizeLabel =
    progress.total && progress.total > 0
      ? `${formatBytes(progress.current)} / ${formatBytes(progress.total)}`
      : "";
  const gifFinalSizeLabel =
    isGif && status === "GIF 생성 완료" && selectedFiles[0]
      ? formatBytes(fileSizes[selectedFiles[0]])
      : "";

  const clampDimension = (value: number, max: number | undefined) => {
    const rounded = Math.round(Math.max(1, value));
    if (!max || !Number.isFinite(max)) return rounded;
    return Math.min(rounded, Math.round(max));
  };

  const clampTrim = (start: number, end: number) => {
    const clampedStart = Math.max(0, Math.min(start, durationSec));
    const clampedEnd = Math.max(clampedStart + 0.1, Math.min(end, durationSec));
    setTrimStart(clampedStart);
    setTrimEnd(clampedEnd);
  };

  useEffect(() => {
    if (!dragHandle) return;
    const handleMove = (event: PointerEvent) => {
      if (!segmentRef.current || !durationSec) return;
      const rect = segmentRef.current.getBoundingClientRect();
      const ratio = (event.clientX - rect.left) / rect.width;
      const nextTime = Math.max(0, Math.min(ratio * durationSec, durationSec));
      if (dragHandle === "start") {
        clampTrim(nextTime, trimEnd);
      } else {
        clampTrim(trimStart, nextTime);
      }
      if (videoRef.current) {
        videoRef.current.currentTime = nextTime;
      }
    };

    const handleUp = () => setDragHandle(null);

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);

    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [dragHandle, durationSec, trimEnd, trimStart]);

  const updateScaleFromWidth = (widthValue: number) => {
    if (!sourceDimensions) return;
    const percent = Math.round(
      (widthValue / Math.max(sourceDimensions.width, 1)) * 100,
    );
    setScalePercent(Math.min(100, Math.max(10, percent)));
  };

  const updateScaleFromHeight = (heightValue: number) => {
    if (!sourceDimensions) return;
    const percent = Math.round(
      (heightValue / Math.max(sourceDimensions.height, 1)) * 100,
    );
    setScalePercent(Math.min(100, Math.max(10, percent)));
  };

  const handlePreviewDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsPreviewHovering(false);
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
      handleAddPaths(paths);
    }
  };

  const pickFiles = async () => {
    if (!isTauriEnv) {
      const msg = "Tauri 환경에서 실행하세요. (파일 시스템 접근 필요)";
      setStatus(msg);
      toast.show(msg, { type: "error" });
      return;
    }
    try {
      const exts = isGif ? videoExtensions : imageExtensions;
      const paths = await pickFilesByExtensions(exts, true);
      if (paths && paths.length) {
        if (isGif) {
          replaceFiles([paths[0]]);
        } else {
          addFiles(paths);
        }
      }
    } catch (error) {
      const msg = `파일 선택 실패: ${error}`;
      setStatus(msg);
      toast.show(msg, { type: "error" });
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
      toast.show(msg, { type: "error" });
    }
  };

  const handleRun = () => {
    if (isGif && selectedFiles.length > 1) {
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
        trim_start_sec: trimStart,
        trim_end_sec: trimEnd,
        duration_sec: durationSec,
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
      toast.show(msg, { type: "error" });
    }
  };

  useEffect(() => {
    if (!modeOverride) return;
    setMode(modeOverride);
  }, [modeOverride]);

  const handleModeChange = (nextMode: ImageConvertMode) => {
    if (onModeChange) {
      onModeChange(nextMode);
      return;
    }
    setMode(nextMode);
  };

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.headerActions}>
          <div className={styles.modePills}>
            <Button
              variant="ghost"
              className={`${styles.modePill} ${
                mode === "convert" ? styles.modePillActive : ""
              }`}
              onClick={() => handleModeChange("convert")}
            >
              <span className={styles.icon}>아이콘</span>
              이미지 변환
            </Button>
            <Button
              variant="ghost"
              className={`${styles.modePill} ${
                isGif ? styles.modePillActive : ""
              }`}
              onClick={() => handleModeChange("gif")}
            >
              <span className={styles.icon}>아이콘</span>
              비디오 → GIF
            </Button>
          </div>
          <Button className={styles.headerButton} onClick={pickFiles}>
            <span className={styles.icon}>아이콘</span>
            Open Project
          </Button>
        </div>
      </header>

      {isGif ? (
        <section className={styles.mainGrid}>
          <div className={styles.leftColumn}>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardTitle}>
                  <span className={styles.icon}>아이콘</span>
                  Source Preview
                </div>
                <div className={styles.cardMeta}>
                  <span className={styles.badge}>
                    {selectedFiles[0]
                      ? selectedFiles[0].split(/[/\\]/).pop()
                      : "demo_recording_001.mp4"}
                  </span>
                  <span className={styles.badge}>
                    {sourceDimensions
                      ? `${sourceDimensions.width}x${sourceDimensions.height}`
                      : "1920x1080"}
                  </span>
                  <Button
                    variant="ghost"
                    className={styles.linkButton}
                    onClick={pickFiles}
                  >
                    Replace
                  </Button>
                </div>
              </div>
              <div className={styles.cardBody}>
                <div
                  className={`${styles.previewFrame} ${
                    isPreviewHovering ? styles.previewHover : ""
                  }`}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setIsPreviewHovering(true);
                  }}
                  onDragLeave={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setIsPreviewHovering(false);
                  }}
                  onDrop={handlePreviewDrop}
                >
                  {previewSrc ? (
                    <VideoPlayer
                      className={styles.previewMediaWrapper}
                      videoClassName={styles.previewMedia}
                      src={previewSrc}
                      playsInline
                      preload="metadata"
                      key={previewSrc}
                      ref={videoRef}
                      onPlay={(event) => {
                        if (trimEnd <= 0) return;
                        const current = event.currentTarget.currentTime;
                        if (current >= Math.max(trimEnd - 0.05, 0)) {
                          event.currentTarget.currentTime = trimStart;
                          return;
                        }
                        if (current < trimStart || current > trimEnd) {
                          event.currentTarget.currentTime = trimStart;
                        }
                      }}
                      onPause={(event) => {
                        if (event.currentTarget.currentTime >= trimEnd) {
                          event.currentTarget.currentTime = trimStart;
                        }
                      }}
                      onEnded={(event) => {
                        event.currentTarget.currentTime = trimStart;
                      }}
                      onLoadedMetadata={(event) => {
                        const video = event.currentTarget;
                        const next = {
                          width: video.videoWidth,
                          height: video.videoHeight,
                        };
                        setSourceDimensions(next);
                        setOutputWidth(next.width);
                        setOutputHeight(next.height);
                        setScalePercent(100);
                        const nextDuration = Number.isFinite(video.duration)
                          ? video.duration
                          : 0;
                        setDurationSec(nextDuration);
                        setTrimStart(0);
                        setTrimEnd(nextDuration);
                      }}
                      onTimeUpdate={(event) => {
                        if (trimEnd <= 0) return;
                        if (event.currentTarget.currentTime >= trimEnd) {
                          event.currentTarget.pause();
                          event.currentTarget.currentTime = trimStart;
                        }
                      }}
                    />
                  ) : (
                    <>
                      <Button
                        type="button"
                        className={styles.playButton}
                        onClick={pickFiles}
                        variant="ghost"
                      >
                        <span className={styles.icon}>아이콘</span>
                      </Button>
                      <p className={styles.previewHint}>
                        Drop a video or click to open
                      </p>
                    </>
                  )}
                </div>
                <div className={styles.previewActions}>
                  <Button variant="ghost" onClick={pickFiles} disabled={busy}>
                    파일 선택
                  </Button>
                  <Button variant="ghost" onClick={pickFolder} disabled={busy}>
                    출력 폴더 지정
                  </Button>
                  <Button variant="ghost" onClick={clearFiles} disabled={busy}>
                    리스트 초기화
                  </Button>
                </div>
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.segmentHeader}>
                <div className={styles.segmentTitle}>
                  <span className={styles.icon}>아이콘</span>
                  Segment
                </div>
                <div className={styles.segmentMeta}>
                  Duration: {formatTime(durationSec || 12)}
                </div>
              </div>
              <div className={styles.cardBody}>
                <div
                  ref={segmentRef}
                  className={styles.segmentTrack}
                  style={
                    durationSec
                      ? ({
                          "--start": `${(trimStart / durationSec) * 100}%`,
                          "--end": `${(trimEnd / durationSec) * 100}%`,
                        } as React.CSSProperties)
                      : undefined
                  }
                  onPointerDown={(event) => {
                    if (!segmentRef.current || !durationSec) return;
                    const rect = segmentRef.current.getBoundingClientRect();
                    const ratio = (event.clientX - rect.left) / rect.width;
                    const nextTime = Math.max(
                      0,
                      Math.min(ratio * durationSec, durationSec),
                    );
                    const toStart = Math.abs(nextTime - trimStart);
                    const toEnd = Math.abs(nextTime - trimEnd);
                    if (toStart <= toEnd) {
                      clampTrim(nextTime, trimEnd);
                      setDragHandle("start");
                    } else {
                      clampTrim(trimStart, nextTime);
                      setDragHandle("end");
                    }
                    if (videoRef.current) {
                      videoRef.current.currentTime = nextTime;
                    }
                  }}
                >
                  <div className={styles.segmentFrames}>
                    {thumbnails.length ? (
                      thumbnails.map((src, index) => (
                        <img
                          key={`${src}-${index}`}
                          src={src}
                          alt=""
                          className={styles.segmentFrame}
                        />
                      ))
                    ) : (
                      <div className={styles.segmentPlaceholder}>
                        <span className={styles.icon}>아이콘</span>
                        Frames
                      </div>
                    )}
                  </div>
                  <div className={styles.segmentMaskLeft} />
                  <div className={styles.segmentMaskRight} />
                  <div className={styles.segmentRange} />
                  <div className={styles.segmentBadgeLeft}>
                    {formatTime(trimStart)}
                  </div>
                  <div className={styles.segmentBadgeRight}>
                    {formatTime(trimEnd)}
                  </div>
                  <Button
                    type="button"
                    className={`${styles.segmentHandle} ${styles.segmentHandleStart}`}
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      setDragHandle("start");
                    }}
                    aria-label="Trim start"
                    variant="ghost"
                  />
                  <Button
                    type="button"
                    className={`${styles.segmentHandle} ${styles.segmentHandleEnd}`}
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      setDragHandle("end");
                    }}
                    aria-label="Trim end"
                    variant="ghost"
                  />
                </div>
                <div className={styles.segmentRow}>
                  <div className={styles.segmentField}>
                    <span>Start</span>
                    <Input
                      type="text"
                      value={formatTime(trimStart)}
                      readOnly
                      className={styles.segmentInput}
                    />
                  </div>
                  <div className={styles.segmentField}>
                    <span>End</span>
                    <Input
                      type="text"
                      value={formatTime(trimEnd)}
                      readOnly
                      className={styles.segmentInput}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <aside className={styles.rightColumn}>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardTitle}>
                  <span className={styles.icon}>아이콘</span>
                  Settings
                </div>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.settingGroup}>
                  <p className={styles.settingLabel}>Frame Rate (FPS)</p>
                  <div className={styles.settingButtons}>
                    {[10, 15, 24, 30].map((value) => (
                      <Button
                        key={value}
                        variant="ghost"
                        className={`${styles.settingButton} ${
                          gifFps === value ? styles.settingButtonActive : ""
                        }`}
                        onClick={() => setGifFps(value)}
                      >
                        {value}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className={styles.settingGroup}>
                  <p className={styles.settingLabel}>Resolution (px)</p>
                  <div className={styles.resolutionRow}>
                    <Input
                      type="number"
                      value={outputWidth}
                      min={1}
                      max={sourceDimensions?.width ?? 10000}
                      disabled={!sourceDimensions}
                      className={styles.resolutionInput}
                      onChange={(event) =>
                        setOutputWidth(
                          event.target.value === ""
                            ? ""
                            : Number(event.target.value),
                        )
                      }
                      onBlur={() => {
                        if (!sourceDimensions || outputWidth === "") return;
                        const maxWidth = sourceDimensions.width;
                        const nextWidth = clampDimension(outputWidth, maxWidth);
                        if (nextWidth !== outputWidth) {
                          setOutputWidth(nextWidth);
                        }
                        if (lockAspect) {
                          const rawHeight =
                            (nextWidth / sourceDimensions.width) *
                            sourceDimensions.height;
                          const nextHeight = clampDimension(
                            rawHeight,
                            sourceDimensions.height,
                          );
                          setOutputHeight(nextHeight);
                        }
                        updateScaleFromWidth(nextWidth);
                      }}
                    />
                    <span className={styles.resolutionSplit}>W</span>
                    <Input
                      type="number"
                      value={outputHeight}
                      min={1}
                      max={sourceDimensions?.height ?? 10000}
                      disabled={!sourceDimensions}
                      className={styles.resolutionInput}
                      onChange={(event) =>
                        setOutputHeight(
                          event.target.value === ""
                            ? ""
                            : Number(event.target.value),
                        )
                      }
                      onBlur={() => {
                        if (!sourceDimensions || outputHeight === "") return;
                        const maxHeight = sourceDimensions.height;
                        const nextHeight = clampDimension(
                          outputHeight,
                          maxHeight,
                        );
                        if (nextHeight !== outputHeight) {
                          setOutputHeight(nextHeight);
                        }
                        if (lockAspect) {
                          const rawWidth =
                            (nextHeight / sourceDimensions.height) *
                            sourceDimensions.width;
                          const nextWidth = clampDimension(
                            rawWidth,
                            sourceDimensions.width,
                          );
                          setOutputWidth(nextWidth);
                        }
                        updateScaleFromHeight(nextHeight);
                      }}
                    />
                    <span className={styles.resolutionSplit}>H</span>
                  </div>
                  <div className={styles.checkboxRow}>
                    <Checkbox
                      checked={lockAspect}
                      onChange={(event) => setLockAspect(event.target.checked)}
                      disabled={!sourceDimensions}
                      label="Maintain aspect ratio"
                      ariaLabel="Maintain aspect ratio"
                    />
                  </div>
                </div>
                <div className={styles.settingGroup}>
                  <p className={styles.settingLabel}>Quality</p>
                  <div className={styles.settingButtons}>
                    {(["low", "medium", "high"] as GifQuality[]).map(
                      (preset) => (
                        <Button
                          key={preset}
                          variant="ghost"
                          className={`${styles.settingButton} ${
                            gifQuality === preset
                              ? styles.settingButtonActive
                              : ""
                          }`}
                          onClick={() => setGifQuality(preset)}
                        >
                          {preset === "low"
                            ? "Low"
                            : preset === "medium"
                              ? "Medium"
                              : "High"}
                        </Button>
                      ),
                    )}
                  </div>
                </div>

                <OutputSettings
                  outputDir={outputDir}
                  renamePattern={renamePattern}
                  onOutputDirChange={setOutputDir}
                  onBrowseOutput={pickFolder}
                  onRenamePatternChange={setRenamePattern}
                />
              </div>
            </div>

            <Button
              className={styles.convertButton}
              onClick={handleRun}
              disabled={busy || selectedFiles.length === 0}
            >
              <span className={styles.icon}>아이콘</span>
              Convert to GIF
            </Button>

            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardTitle}>
                  <span className={styles.icon}>아이콘</span>
                  Progress
                </div>
                <div className={styles.cardMeta}>{progress.percent}%</div>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.statusBar}>
                  <div
                    className={styles.statusFill}
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>
                <p className={styles.statusText}>{status || "대기 중"}</p>
                <p className={styles.statusMeta}>{progress.label}</p>
                {gifFinalSizeLabel ? (
                  <p className={styles.statusMeta}>
                    총 용량: {gifFinalSizeLabel}
                  </p>
                ) : null}
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardTitle}>
                  <span className={styles.icon}>아이콘</span>
                  Last Export
                </div>
              </div>
              <div className={styles.cardBody}>
                {latestResult?.output ? (
                  <div className={styles.exportRow}>
                    <div className={styles.exportPreview}>아이콘</div>
                    <div>
                      <p className={styles.exportTitle}>
                        {latestResult.output.split(/[/\\]/).pop()}
                      </p>
                      <p className={styles.exportMeta}>{latestResult.output}</p>
                    </div>
                    <div className={styles.exportActions}>
                      <Button onClick={() => handleOpen(latestResult.output)}>
                        <span className={styles.icon}>아이콘</span>
                        Open
                      </Button>
                      <Button variant="ghost">
                        <span className={styles.icon}>아이콘</span>
                        Copy
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className={styles.emptyText}>No exports yet.</p>
                )}
              </div>
            </div>
          </aside>
        </section>
      ) : (
        <section className={styles.mainGrid}>
          <div className={styles.leftColumn}>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardTitle}>
                  <span className={styles.icon}>아이콘</span>
                  Source Preview
                </div>
                <div className={styles.cardMeta}>
                  <span>
                    {selectedFiles[0]
                      ? selectedFiles[0].split(/[/\\]/).pop()
                      : "No file selected"}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    className={styles.linkButton}
                    onClick={pickFiles}
                  >
                    Replace
                  </Button>
                </div>
              </div>
              <div className={styles.cardBody}>
                <div
                  className={`${styles.previewFrame} ${
                    isPreviewHovering ? styles.previewHover : ""
                  }`}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setIsPreviewHovering(true);
                  }}
                  onDragLeave={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setIsPreviewHovering(false);
                  }}
                  onDrop={handlePreviewDrop}
                >
                  {previewSrc ? (
                    <img
                      className={styles.previewMedia}
                      src={previewSrc}
                      alt="Selected preview"
                      key={previewSrc}
                      onLoad={(event) => {
                        const image = event.currentTarget;
                        const next = {
                          width: image.naturalWidth,
                          height: image.naturalHeight,
                        };
                        setSourceDimensions(next);
                        setOutputWidth(next.width);
                        setOutputHeight(next.height);
                        setScalePercent(100);
                      }}
                    />
                  ) : (
                    <>
                      <Button
                        type="button"
                        className={styles.playButton}
                        onClick={pickFiles}
                        variant="ghost"
                      >
                        <span className={styles.icon}>아이콘</span>
                      </Button>
                      <p className={styles.previewHint}>
                        Drop images or click to open
                      </p>
                    </>
                  )}
                </div>
                <div className={styles.previewActions}>
                  <Button variant="ghost" onClick={pickFiles} disabled={busy}>
                    파일 선택
                  </Button>
                  <Button variant="ghost" onClick={pickFolder} disabled={busy}>
                    출력 폴더 지정
                  </Button>
                  <Button variant="ghost" onClick={clearFiles} disabled={busy}>
                    리스트 초기화
                  </Button>
                </div>
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardTitle}>
                  <span className={styles.icon}>아이콘</span>
                  Files
                </div>
                <div className={styles.cardMeta}>
                  {selectedFiles.length} selected
                </div>
              </div>
              <div className={styles.cardBody}>
                <FileList
                  files={selectedFiles}
                  onRemove={removeFile}
                  batchMode={isGif ? false : batchMode}
                  onToggleBatch={setBatchMode}
                />
              </div>
            </div>
          </div>

          <aside className={styles.rightColumn}>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardTitle}>
                  <span className={styles.icon}>아이콘</span>
                  Settings
                </div>
              </div>
              <div className={styles.cardBody}>
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

                <div className={styles.presetRow}>
                  {webPresets.map((preset) => (
                    <Button
                      key={preset.label}
                      className={styles.presetButton}
                      variant="pill"
                      onClick={() => {
                        setTargetFormat(preset.targetFormat);
                        setQualityPercent(preset.quality);
                        setScalePercent(preset.scale);
                        setStatus(`프리셋 적용: ${preset.label}`);
                      }}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>

                <OutputSettings
                  outputDir={outputDir}
                  renamePattern={renamePattern}
                  onOutputDirChange={setOutputDir}
                  onBrowseOutput={pickFolder}
                  onRenamePatternChange={setRenamePattern}
                />
              </div>
            </div>

            <Button
              className={styles.convertButton}
              onClick={handleRun}
              disabled={busy || selectedFiles.length === 0}
            >
              <span className={styles.icon}>아이콘</span>
              Convert Image
            </Button>

            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardTitle}>
                  <span className={styles.icon}>아이콘</span>
                  Progress
                </div>
                <div className={styles.cardMeta}>
                  {progress.percent}%
                  {progressSizeLabel ? ` · ${progressSizeLabel}` : ""}
                </div>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.statusBar}>
                  <div
                    className={styles.statusFill}
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>
                <p className={styles.statusText}>{status || "대기 중"}</p>
                <p className={styles.statusMeta}>{progress.label}</p>
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardTitle}>
                  <span className={styles.icon}>아이콘</span>
                  Last Export
                </div>
              </div>
              <div className={styles.cardBody}>
                {latestResult?.output ? (
                  <div className={styles.exportRow}>
                    <div>
                      <p className={styles.exportTitle}>
                        {latestResult.output.split(/[/\\]/).pop()}
                      </p>
                      <p className={styles.exportMeta}>{latestResult.output}</p>
                    </div>
                    <div className={styles.exportActions}>
                      <Button onClick={() => handleOpen(latestResult.output)}>
                        <span className={styles.icon}>아이콘</span>
                        Open
                      </Button>
                      <Button variant="ghost">
                        <span className={styles.icon}>아이콘</span>
                        Copy
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className={styles.emptyText}>No exports yet.</p>
                )}
              </div>
            </div>
          </aside>
        </section>
      )}

      {!isGif && (
        <div className={styles.resultsWrap}>
          <ResultsPanel
            status={status}
            progress={progress}
            results={results}
            perFileProgress={perFileProgress}
            fileSizes={fileSizes}
            onOpen={handleOpen}
            successCount={conversionSummary.success}
            failCount={conversionSummary.failed}
          />
        </div>
      )}
    </div>
  );
}
