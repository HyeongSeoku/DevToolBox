import { invoke } from "@tauri-apps/api/core";

import type { GifQuality, TargetFormat } from "@/hooks/useConversionJob";

export const imageExtensions = ["jpg", "jpeg", "png", "webp", "bmp", "gif"];
export const videoExtensions = ["mp4", "mov", "mkv", "avi"];

export const defaultQuickConvertOptions = {
  target_format: "webp" as TargetFormat,
  quality_percent: 90,
  scale_percent: 100,
  output_dir: null as string | null,
  rename_pattern: "{basename}_quick",
  strip_exif: false,
};

export const defaultQuickGifOptions = {
  fps: 15,
  quality: "medium" as GifQuality,
  scale_percent: 100,
  output_dir: null as string | null,
  rename_pattern: "{basename}_quick",
};

export const filterByExtensions = (paths: string[], exts: string[]) =>
  paths.filter((p) => {
    const lower = p.toLowerCase();
    return exts.some((ext) => lower.endsWith(`.${ext}`));
  });

export const pickFilesByExtensions = async (exts: string[], multiple = true) =>
  invoke<string[]>("pick_files", { multiple, extensions: exts });

export async function convertImagesQuick(
  paths: string[],
  options = defaultQuickConvertOptions,
) {
  for (const path of paths) {
    await invoke("convert_image", { path, options });
  }
}
