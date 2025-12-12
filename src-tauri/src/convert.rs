use std::fs;
use std::fs::File;
use std::io::BufWriter;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
};
use std::thread;
use std::time::Duration;

use image::codecs::jpeg::JpegEncoder;
use image::codecs::png::PngEncoder;
use image::codecs::webp::WebPEncoder;
use image::imageops::FilterType;
use image::{ColorType, DynamicImage, GenericImageView, ImageEncoder, ImageFormat};
use rfd::{MessageDialog, MessageDialogResult};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};

use crate::util::{apply_pattern, map_image_error, timestamp_string};

#[derive(Debug, Deserialize)]
pub struct ConvertOptions {
    pub target_format: Option<String>,
    pub quality_percent: Option<u8>,
    pub output_dir: Option<String>,
    pub scale_percent: Option<u32>,
    pub rename_pattern: Option<String>,
    pub strip_exif: Option<bool>,
}

#[derive(Debug, Serialize)]
pub struct ConversionResult {
    pub input: String,
    pub output: String,
}

#[derive(Debug, Serialize)]
pub struct BatchItemResult {
    pub input: String,
    pub output: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct GifOptions {
    pub fps: Option<u32>,
    pub quality: Option<String>,
    pub scale_percent: Option<u32>,
    pub output_dir: Option<String>,
    pub rename_pattern: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
pub struct ProgressPayload {
    pub job_id: String,
    pub total: usize,   // 총 바이트 (가능하면), fallback 시 퍼센트 스케일
    pub current: usize, // 현재 바이트 (가능하면)
    pub path: String,
    pub status: String,
    pub size_bytes: u64,
}

#[derive(Debug, Serialize, Clone)]
pub struct PartialResultPayload {
    pub job_id: String,
    pub input: String,
    pub output: Option<String>,
    pub error: Option<String>,
    pub status: String,
}

#[tauri::command]
pub async fn convert_image(
    app: AppHandle,
    job_id: Option<String>,
    path: String,
    options: ConvertOptions,
) -> Result<ConversionResult, String> {
    let job = job_id.unwrap_or_else(|| format!("single-{}", timestamp_string()));
    let size_bytes = fs::metadata(&path).map(|m| m.len()).unwrap_or(0);
    let total = if size_bytes > 0 { size_bytes as usize } else { 100usize };

    let _ = app.emit(
        "conversion-progress",
        ProgressPayload {
            job_id: job.clone(),
            total,
            current: 0,
            path: path.clone(),
            status: "processing".into(),
            size_bytes,
        },
    );

    let running = Arc::new(AtomicBool::new(true));
    let tick_running = running.clone();
    let tick_app = app.clone();
    let tick_job = job.clone();
    let tick_path = path.clone();
    let progress_ticker = thread::spawn(move || {
        let mut current_percent = 1usize;
        while tick_running.load(Ordering::Relaxed) {
            if current_percent >= 99 {
                break;
            }
            let current = if size_bytes > 0 {
                ((size_bytes * current_percent as u64) / 100) as usize
            } else {
                current_percent
            };
            let _ = tick_app.emit(
                "conversion-progress",
                ProgressPayload {
                    job_id: tick_job.clone(),
                    total,
                    current,
                    path: tick_path.clone(),
                    status: "processing".into(),
                    size_bytes,
                },
            );
            current_percent += 1;
            thread::sleep(Duration::from_millis(60));
        }
    });

    let input_path = path.clone();
    let app_clone = app.clone();
    let converted: PathBuf = tauri::async_runtime::spawn_blocking(move || {
        let _ = app_clone;
        convert_single(Path::new(&input_path), &options, 1)
    })
    .await
    .map_err(|e| e.to_string())??;

    running.store(false, Ordering::Relaxed);
    let _ = progress_ticker.join();

    let final_current = if size_bytes > 0 { size_bytes as usize } else { total };
    let _ = app.emit(
        "conversion-progress",
        ProgressPayload {
            job_id: job.clone(),
            total,
            current: final_current,
            path: path.clone(),
            status: "success".into(),
            size_bytes,
        },
    );

    Ok(ConversionResult {
        input: path,
        output: converted.to_str().unwrap_or_default().to_string(),
    })
}

#[tauri::command]
pub async fn batch_convert(
    app: AppHandle,
    job_id: String,
    paths: Vec<String>,
    options: ConvertOptions,
) -> Result<(), String> {
    if paths.is_empty() {
        return Err("No input files provided".to_string());
    }

    let total_files = paths.len();
    let sizes: Vec<u64> = paths
        .iter()
        .map(|p| fs::metadata(p).map(|m| m.len()).unwrap_or(0))
        .collect();
    let total_units: usize = sizes.iter().sum::<u64>() as usize;
    let app_for_task = app.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let mut results = Vec::with_capacity(total_files);
        let mut accumulated_bytes: usize = 0;
        for (idx, path) in paths.iter().enumerate() {
            let size_bytes = *sizes.get(idx).unwrap_or(&0) as usize;
            let base_progress = accumulated_bytes;
            let size_bytes_u64 = *sizes.get(idx).unwrap_or(&0);
            let _ = app_for_task.emit(
                "conversion-progress",
                ProgressPayload {
                    job_id: job_id.clone(),
                    total: total_units,
                    current: base_progress,
                    path: path.clone(),
                    status: "processing".into(),
                    size_bytes: size_bytes_u64,
                },
            );
            let _ = app_for_task.emit(
                "conversion-partial",
                PartialResultPayload {
                    job_id: job_id.clone(),
                    input: path.clone(),
                    output: None,
                    error: None,
                    status: "started".into(),
                },
            );

            let running = Arc::new(AtomicBool::new(true));
            let tick_running = running.clone();
            let tick_app = app_for_task.clone();
            let tick_job = job_id.clone();
            let tick_path = path.clone();
            let tick_total = total_units;
            let tick_base = base_progress;
            let tick_size = size_bytes as usize;
            let size_bytes_clone = size_bytes_u64;
            let progress_ticker = thread::spawn(move || {
                let mut percent = 1usize;
                let max_percent = 99usize;
                while tick_running.load(Ordering::Relaxed) {
                    if percent >= max_percent {
                        break;
                    }
                    let current = if tick_size > 0 {
                        tick_base + ((tick_size as usize * percent) / 100)
                    } else {
                        tick_base + percent
                    };
                    let _ = tick_app.emit(
                        "conversion-progress",
                        ProgressPayload {
                            job_id: tick_job.clone(),
                            total: tick_total,
                            current,
                            path: tick_path.clone(),
                            status: "processing".into(),
                            size_bytes: size_bytes_clone,
                        },
                    );
                    percent += 1;
                    thread::sleep(Duration::from_millis(60));
                }
            });

            let conversion = convert_single(Path::new(path), &options, idx + 1);
            running.store(false, Ordering::Relaxed);
            let _ = progress_ticker.join();
            let payload = ProgressPayload {
                job_id: job_id.clone(),
                total: total_units,
                current: base_progress + if size_bytes > 0 { size_bytes as usize } else { 100 },
                path: path.clone(),
                status: match &conversion {
                    Ok(_) => "success".into(),
                    Err(_) => "error".into(),
                },
                size_bytes: size_bytes_u64,
            };
            let _ = app_for_task.emit("conversion-progress", payload);

            match conversion {
                Ok(out) => {
                    let out_str: Option<String> = out.to_str().map(|s: &str| s.to_string());
                    results.push(BatchItemResult {
                        input: path.clone(),
                        output: out_str.clone(),
                        error: None,
                    });
                    let _ = app_for_task.emit(
                        "conversion-partial",
                        PartialResultPayload {
                            job_id: job_id.clone(),
                            input: path.clone(),
                            output: out_str,
                            error: None,
                            status: "success".into(),
                        },
                    );
                }
                Err(err) => {
                    results.push(BatchItemResult {
                        input: path.clone(),
                        output: None,
                        error: Some(err.clone()),
                    });
                    let _ = app_for_task.emit(
                        "conversion-partial",
                        PartialResultPayload {
                            job_id: job_id.clone(),
                            input: path.clone(),
                            output: None,
                            error: Some(err),
                            status: "error".into(),
                        },
                    );
                }
            }
            accumulated_bytes += size_bytes.max(1);
        }
        let _ = app_for_task.emit(
            "conversion-complete",
            serde_json::json!({ "job_id": job_id, "results": results }),
        );
    });

    Ok(())
}

#[tauri::command]
pub async fn video_to_gif(path: String, options: GifOptions) -> Result<String, String> {
    if path.is_empty() {
        return Err("No video selected for GIF creation".into());
    }

    tauri::async_runtime::spawn_blocking(move || {
        ensure_ffmpeg_available()?;

        let fps = options.fps.unwrap_or(15).clamp(1, 60);
        let quality = options
            .quality
            .unwrap_or_else(|| "medium".to_string())
            .to_lowercase();
        let scale_percent = options.scale_percent.unwrap_or(100).clamp(10, 100);

        let source_dir = Path::new(&path)
            .parent()
            .unwrap_or_else(|| Path::new("."))
            .to_path_buf();
        let target_dir = options
            .output_dir
            .as_ref()
            .map(PathBuf::from)
            .unwrap_or(source_dir);

        fs::create_dir_all(&target_dir).map_err(|e| e.to_string())?;

        let base_name = Path::new(&path)
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("animation");
        let ext = "gif";
        let timestamp = timestamp_string();
        let filename = options
            .rename_pattern
            .as_ref()
            .map(|pattern| apply_pattern(pattern, base_name, ext, 1, &timestamp))
            .unwrap_or_else(|| format!("{base_name}_animated.{ext}"));

        let output_path = target_dir.join(filename);
        let scale_expr = format!("scale=iw*{scale_percent}/100:ih*{scale_percent}/100:flags=lanczos");
        let max_colors = match quality.as_str() {
            "high" => 256,
            "low" => 96,
            _ => 160,
        };

        let filter = format!(
            "[0:v]fps={fps},{scale_expr},palettegen=max_colors={max_colors}:stats_mode=diff[pal];\
[0:v]fps={fps},{scale_expr}[x];[x][pal]paletteuse=dither=sierra2_4a"
        );

        let status = Command::new("ffmpeg")
            .arg("-y")
            .arg("-i")
            .arg(&path)
            .arg("-filter_complex")
            .arg(filter)
            .arg("-loop")
            .arg("0")
            .arg(&output_path)
            .status()
            .map_err(|e| format!("ffmpeg failed to start: {e}"))?;

        if !status.success() {
            return Err(format!("ffmpeg exited with status {status:?}"));
        }

        Ok(output_path
            .to_str()
            .unwrap_or_default()
            .to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

fn ensure_ffmpeg_available() -> Result<(), String> {
    let status = Command::new("ffmpeg")
        .arg("-version")
        .status()
        .map_err(|_| "ffmpeg not found. Please install ffmpeg and ensure it is in PATH.".to_string())?;
    if status.success() {
        Ok(())
    } else {
        Err("ffmpeg not available or failed to run -version".to_string())
    }
}

fn parse_format(format: &str) -> Result<ImageFormat, String> {
    match format.to_lowercase().as_str() {
        "jpeg" | "jpg" => Ok(ImageFormat::Jpeg),
        "png" => Ok(ImageFormat::Png),
        "webp" => Ok(ImageFormat::WebP),
        other => Err(format!("Unsupported format: {other}")),
    }
}

fn resize_if_needed(img: &DynamicImage, scale_percent: u32) -> DynamicImage {
    if scale_percent >= 100 {
        return img.clone();
    }

    let (w, h) = img.dimensions();
    let new_w = (w.saturating_mul(scale_percent) / 100).max(1);
    let new_h = (h.saturating_mul(scale_percent) / 100).max(1);
    img.resize(new_w, new_h, FilterType::CatmullRom)
}

fn save_image(
    img: &DynamicImage,
    format: ImageFormat,
    quality: u8,
    output_path: &Path,
) -> Result<(), String> {
    let file = File::create(output_path).map_err(|e: std::io::Error| e.to_string())?;
    let writer = BufWriter::new(file);
    match format {
        ImageFormat::Jpeg => {
            let mut encoder = JpegEncoder::new_with_quality(writer, quality);
            encoder.encode_image(img).map_err(map_image_error)?;
        }
        ImageFormat::Png => {
            let encoder = PngEncoder::new(writer);
            let data = img.to_rgba8();
            let (w, h) = img.dimensions();
            encoder
                .write_image(&data, w, h, ColorType::Rgba8.into())
                .map_err(map_image_error)?;
        }
        ImageFormat::WebP => {
            let encoder = WebPEncoder::new_lossless(writer);
            let data = img.to_rgba8();
            let (w, h) = img.dimensions();
            encoder
                .write_image(&data, w, h, ColorType::Rgba8.into())
                .map_err(map_image_error)?;
        }
        _ => return Err("Unsupported target format".into()),
    }
    Ok(())
}

fn convert_single(path: &Path, options: &ConvertOptions, index: usize) -> Result<PathBuf, String> {
    let target_format = parse_format(options.target_format.as_deref().unwrap_or("jpeg"))?;
    let quality = options.quality_percent.unwrap_or(90).clamp(50, 100);
    let scale_percent = options.scale_percent.unwrap_or(100).clamp(10, 100);
    let strip_exif = options.strip_exif.unwrap_or(false);

    let input_format = ImageFormat::from_path(path).ok();
    let image = image::open(path).map_err(|e| format!("Failed to open {}: {e}", path.display()))?;
    let processed = resize_if_needed(&image, scale_percent);

    let target_dir = options.output_dir.as_ref().map(PathBuf::from).unwrap_or_else(|| {
        path.parent()
            .unwrap_or_else(|| Path::new("."))
            .to_path_buf()
    });
    fs::create_dir_all(&target_dir).map_err(|e| e.to_string())?;

    let ext = match target_format {
        ImageFormat::Jpeg => "jpeg",
        ImageFormat::Png => "png",
        ImageFormat::WebP => "webp",
        _ => return Err("Unsupported target format".into()),
    };

    let base_name = path
        .file_stem()
        .and_then(|s: &std::ffi::OsStr| s.to_str())
        .unwrap_or("image");
    let timestamp = timestamp_string();
    let file_name = options
        .rename_pattern
        .as_ref()
        .map(|pattern| apply_pattern(pattern, base_name, ext, index, &timestamp))
        .unwrap_or_else(|| format!("{base_name}_converted.{ext}"));

    let mut output_path = target_dir.join(file_name);
    let can_copy_without_changes = !strip_exif
        && scale_percent == 100
        && quality == 100
        && input_format.map(|f| f == target_format).unwrap_or(false);

    if output_path.exists() {
        let overwrite = MessageDialog::new()
            .set_title("이름 충돌")
            .set_description(&format!(
                "파일이 이미 존재합니다.\n{}\n\n확인: 기존 파일을 덮어씁니다.\n취소: 새 이름(_1, _2...)으로 저장합니다.",
                output_path.to_string_lossy(),
            ))
            .set_buttons(rfd::MessageButtons::OkCancel)
            .show();
        if overwrite != MessageDialogResult::Ok {
            let stem = output_path
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("image");
            let ext = output_path
                .extension()
                .and_then(|e| e.to_str())
                .unwrap_or("img");
            let mut counter = 1;
            loop {
                let candidate = output_path.with_file_name(format!("{stem}_{counter}.{ext}"));
                if !candidate.exists() {
                    output_path = candidate;
                    break;
                }
                counter += 1;
            }
        }
    }

    if can_copy_without_changes {
        fs::copy(path, &output_path).map_err(|e| e.to_string())?;
    } else {
        save_image(&processed, target_format, quality, &output_path)?;
    }

    Ok(output_path)
}
