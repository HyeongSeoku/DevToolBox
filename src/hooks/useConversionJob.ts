import { useCallback, useEffect, useRef, useState } from "react";

import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export type TargetFormat = "jpeg" | "png" | "webp";
export type GifQuality = "low" | "medium" | "high";
export type ImageConvertMode = "convert" | "gif";

export type ConversionResult = {
  input: string;
  output?: string;
  error?: string;
};

type ProgressPayload = {
  job_id: string;
  total: number;
  current: number;
  path: string;
  status: string;
  size_bytes: number;
};
type CompletePayload = { job_id: string; results: ConversionResult[] };
type PartialPayload = {
  job_id: string;
  input: string;
  output?: string;
  error?: string;
};

type ConvertOptionsPayload = {
  target_format: TargetFormat;
  quality_percent: number;
  output_dir: string | null;
  scale_percent: number;
  rename_pattern: string | null;
  strip_exif: boolean;
};

type GifOptionsPayload = {
  fps: number;
  quality: GifQuality;
  scale_percent: number;
  output_dir: string | null;
  rename_pattern: string | null;
};

type RunArgs = {
  mode: ImageConvertMode;
  selectedFiles: string[];
  batchMode: boolean;
  convertOptions: ConvertOptionsPayload;
  gifOptions: GifOptionsPayload;
  onCompleted?: (items: ConversionResult[]) => void;
};

type ProgressState = {
  percent: number;
  label: string;
  current?: number;
  total?: number;
  path?: string;
};

export function useConversionJob(isTauriEnv: boolean) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [results, setResults] = useState<ConversionResult[]>([]);
  const [perFileProgress, setPerFileProgress] = useState<
    Record<string, number>
  >({});
  const [progress, setProgress] = useState<ProgressState>({
    percent: 0,
    label: "",
    current: 0,
    total: 0,
  });
  const [jobId, setJobId] = useState<string | null>(null);
  const jobIdRef = useRef<string | null>(null);
  const [fileSizes, setFileSizes] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!isTauriEnv) return;

    const progressUnlistenPromise = listen<ProgressPayload>(
      "conversion-progress",
      (event) => {
        const {
          job_id,
          total,
          current,
          path,
          status: currentStatus,
        } = event.payload;

        const activeJob = jobIdRef.current;
        if (!activeJob || activeJob !== job_id) return;
        const percent = Math.round((current / Math.max(total, 1)) * 100);
        // 로그로도 진행률을 확인할 수 있도록 출력
        console.info(
          `[convert:${job_id}] ${current}/${total} (${percent}%) - ${currentStatus} - ${path}`,
        );
        setPerFileProgress((prev) => ({
          ...prev,
          [path]: percent,
        }));
        if (event.payload.size_bytes >= 0) {
          setFileSizes((prev) => ({
            ...prev,
            [path]: event.payload.size_bytes,
          }));
        }
        setProgress({
          percent,
          label: `${percent}% · ${
            currentStatus === "error" ? "실패" : "진행"
          } · ${path.split(/[/\\]/).pop() || ""}`,
          current,
          total,
          path,
        });
      },
    );

    const completeUnlistenPromise = listen<CompletePayload>(
      "conversion-complete",
      (event) => {
        const activeJob = jobIdRef.current;
        if (!activeJob || activeJob !== event.payload.job_id) return;
        setResults(event.payload.results);
        setStatus("일괄 변환 완료");
        setBusy(false);
        setProgress({ percent: 100, label: "완료", current: progress.total, total: progress.total });
        setJobId(null);
        jobIdRef.current = null;
      },
    );

    const partialUnlistenPromise = listen<PartialPayload>(
      "conversion-partial",
      (event) => {
        console.log("TEST conversion-partial ID ", event.payload);
        const activeJob = jobIdRef.current;
        if (!activeJob || activeJob !== event.payload.job_id) return;
        const { input, output, error } = event.payload;
        setPerFileProgress((prev) => ({ ...prev, [input]: 100 }));
        setResults((prev) => {
          const others = prev.filter((r) => r.input !== input);
          return [...others, { input, output, error }];
        });
      },
    );

    return () => {
      progressUnlistenPromise.then((unlisten) => unlisten());
      completeUnlistenPromise.then((unlisten) => unlisten());
      partialUnlistenPromise.then((unlisten) => unlisten());
    };
  }, [isTauriEnv, jobId]);

  const runConversion = useCallback(
    async ({
      mode,
      selectedFiles,
      batchMode,
      convertOptions,
      gifOptions,
      onCompleted,
    }: RunArgs) => {
      if (!isTauriEnv) {
        setStatus(
          "Tauri 환경에서 실행하세요. (파일 변환은 데스크톱 권한 필요)",
        );
        return;
      }
      if (!selectedFiles.length) {
        setStatus("변환할 파일을 추가하세요.");
        return;
      }

    setBusy(true);
    // 초기 리스트를 미리 채워 진행률 UI를 바로 표시
    setResults(selectedFiles.map((path) => ({ input: path, output: undefined })));
    setPerFileProgress(
      selectedFiles.reduce<Record<string, number>>((acc, path) => {
        acc[path] = 0;
        return acc;
      }, {}),
    );
    setProgress({ percent: 0, label: "준비 중...", current: 0, total: 0 });
    setFileSizes(
      selectedFiles.reduce<Record<string, number>>((acc, path) => {
        acc[path] = 0;
        return acc;
      }, {}),
    );

      try {
        if (mode === "gif") {
          const outputPath = await invoke<string>("video_to_gif", {
            path: selectedFiles[0],
            options: gifOptions,
          });
          setResults([{ input: selectedFiles[0], output: outputPath }]);
          setPerFileProgress({ [selectedFiles[0]]: 100 });
          setStatus("GIF 생성 완료");
          setProgress({ percent: 100, label: "완료" });
          setBusy(false);
          onCompleted?.([{ input: selectedFiles[0], output: outputPath }]);
          return;
        }

        if (batchMode && selectedFiles.length > 1) {
          const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
          setJobId(id);
          jobIdRef.current = id;
          await invoke<void>("batch_convert", {
            jobId: id,
            paths: selectedFiles,
            options: convertOptions,
          });
          setStatus("일괄 변환 중...");
          // busy will be reset on completion event
        } else {
          const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
          setJobId(id);
          jobIdRef.current = id;
          const single = await invoke<{ input: string; output: string }>(
            "convert_image",
            {
              jobId: id,
              path: selectedFiles[0],
              options: convertOptions,
            },
          );
          setResults([{ input: single.input, output: single.output }]);
          setPerFileProgress({ [selectedFiles[0]]: 100 });
          setStatus("변환 완료");
          setProgress({ percent: 100, label: "완료" });
          setBusy(false);
          setJobId(null);
          jobIdRef.current = null;
          onCompleted?.([{ input: single.input, output: single.output }]);
        }
      } catch (error) {
        setStatus(`오류: ${error}`);
        setBusy(false);
        setJobId(null);
        jobIdRef.current = null;
      }
    },
    [isTauriEnv],
  );

  return {
    busy,
    status,
    results,
    perFileProgress,
    progress,
    runConversion,
    setStatus,
    setResults,
  };
}
