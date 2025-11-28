use image::codecs::jpeg::JpegEncoder;
use image::codecs::png::PngEncoder;
use image::codecs::webp::WebPEncoder;
use image::imageops::FilterType;
use image::{ColorType, DynamicImage, GenericImageView, ImageEncoder, ImageFormat};
use dirs::data_dir;
use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::BufWriter;
use std::path::{Component, Path, PathBuf};
use std::process::Command;
use std::fs;
use time::{format_description, OffsetDateTime};
use tauri::{AppHandle, Emitter};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            convert_image,
            batch_convert,
            video_to_gif,
            pick_files,
            pick_folder,
            init_vault,
            read_settings,
            save_settings,
            read_vault_file,
            write_vault_file,
            delete_vault_entry,
            move_vault_entry
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[derive(Debug, Deserialize)]
struct ConvertOptions {
    target_format: Option<String>,
    quality_percent: Option<u8>,
    output_dir: Option<String>,
    scale_percent: Option<u32>,
    rename_pattern: Option<String>,
    strip_exif: Option<bool>,
}

#[derive(Debug, Serialize)]
struct ConversionResult {
    input: String,
    output: String,
}

#[derive(Debug, Serialize)]
struct BatchItemResult {
    input: String,
    output: Option<String>,
    error: Option<String>,
}

#[derive(Debug, Deserialize)]
struct GifOptions {
    fps: Option<u32>,
    quality: Option<String>,
    scale_percent: Option<u32>,
    output_dir: Option<String>,
    rename_pattern: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
struct ProgressPayload {
    job_id: String,
    total: usize,
    current: usize,
    path: String,
    status: String,
}

#[derive(Debug, Serialize, Clone)]
struct PartialResultPayload {
    job_id: String,
    input: String,
    output: Option<String>,
    error: Option<String>,
    status: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct AppSettings {
    vault_path: String,
    last_opened: Option<String>,
}

fn default_vault_dir() -> Result<PathBuf, String> {
    data_dir()
        .map(|p| p.join("DevToolBox"))
        .ok_or_else(|| "OS 데이터 디렉터리를 찾을 수 없습니다.".to_string())
}

fn settings_file_path(vault_dir: &Path) -> PathBuf {
    vault_dir.join("settings.json")
}

fn ensure_vault_structure(vault_dir: &Path) -> Result<(), String> {
    fs::create_dir_all(vault_dir).map_err(|e| e.to_string())?;
    let required_dirs = [
        "snippets",
        "api-presets",
        "history",
        "history/gif-convert",
        "history/json-format",
        "history/jwt-decode",
        "history/text-convert",
        "history/regex-tester",
        "history/env",
        "snippets",
        "snippets/git",
        "snippets/linux",
        "snippets/fe-utils",
        "snippets/be-utils",
    ];
    for child in required_dirs {
        fs::create_dir_all(vault_dir.join(child)).map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn write_settings_file(path: &Path, settings: &AppSettings) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())
}

fn load_settings(vault_dir: &Path) -> Result<AppSettings, String> {
    let settings_path = settings_file_path(vault_dir);
    if !settings_path.exists() {
        let fresh = AppSettings {
            vault_path: vault_dir
                .to_str()
                .unwrap_or_default()
                .to_string(),
            last_opened: None,
        };
        write_settings_file(&settings_path, &fresh)?;
        return Ok(fresh);
    }
    let text = fs::read_to_string(&settings_path).map_err(|e| e.to_string())?;
    let mut settings: AppSettings =
        serde_json::from_str(&text).map_err(|e| format!("settings.json 파싱 실패: {e}"))?;
    if settings.vault_path.is_empty() {
        settings.vault_path = vault_dir.to_str().unwrap_or_default().to_string();
    }
    Ok(settings)
}

fn sanitize_relative_path(relative: &str) -> Result<PathBuf, String> {
    let rel = PathBuf::from(relative);
    if rel.is_absolute() {
        return Err("Vault 상대 경로만 허용됩니다.".into());
    }
    for comp in rel.components() {
        if matches!(comp, Component::ParentDir | Component::RootDir | Component::Prefix(_)) {
            return Err("상위 경로 접근은 허용되지 않습니다.".into());
        }
    }
    Ok(rel)
}

fn resolve_in_vault(vault_dir: &Path, relative: &str) -> Result<PathBuf, String> {
    let rel = sanitize_relative_path(relative)?;
    Ok(vault_dir.join(rel))
}

#[tauri::command]
async fn convert_image(path: String, options: ConvertOptions) -> Result<ConversionResult, String> {
    let input_path = path.clone();
    let converted = tauri::async_runtime::spawn_blocking(move || {
        convert_single(Path::new(&input_path), &options, 1)
    })
    .await
    .map_err(|e| e.to_string())??;

    Ok(ConversionResult {
        input: path,
        output: converted.to_str().unwrap_or_default().to_string(),
    })
}

#[tauri::command]
async fn batch_convert(
    app: AppHandle,
    job_id: String,
    paths: Vec<String>,
    options: ConvertOptions,
) -> Result<(), String> {
    if paths.is_empty() {
        return Err("No input files provided".to_string());
    }

    let total = paths.len();
    let app_for_task = app.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let mut results = Vec::with_capacity(total);
        for (idx, path) in paths.iter().enumerate() {
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

            let conversion = convert_single(Path::new(path), &options, idx + 1);
            let payload = ProgressPayload {
                job_id: job_id.clone(),
                total,
                current: idx + 1,
                path: path.clone(),
                status: match &conversion {
                    Ok(_) => "success".into(),
                    Err(_) => "error".into(),
                },
            };
            let _ = app_for_task.emit("conversion-progress", payload);

            match conversion {
                Ok(out) => {
                    let out_str = out.to_str().map(|s| s.to_string());
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
        }
        let _ = app_for_task.emit(
            "conversion-complete",
            serde_json::json!({ "job_id": job_id, "results": results }),
        );
    });

    Ok(())
}

#[tauri::command]
async fn video_to_gif(path: String, options: GifOptions) -> Result<String, String> {
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

#[tauri::command]
fn pick_files(multiple: bool, extensions: Option<Vec<String>>) -> Result<Vec<String>, String> {
    let mut dialog = rfd::FileDialog::new();
    if let Some(exts) = extensions.as_ref() {
        let exts_ref: Vec<&str> = exts.iter().map(|s| s.as_str()).collect();
        dialog = dialog.add_filter("Files", &exts_ref);
    }
    if multiple {
        Ok(dialog
            .pick_files()
            .unwrap_or_default()
            .into_iter()
            .filter_map(|p| p.into_os_string().into_string().ok())
            .collect())
    } else {
        Ok(dialog
            .pick_file()
            .into_iter()
            .filter_map(|p| p.into_os_string().into_string().ok())
            .collect())
    }
}

#[tauri::command]
fn pick_folder() -> Result<Option<String>, String> {
    let dialog = rfd::FileDialog::new();
    Ok(dialog
        .pick_folder()
        .and_then(|p| p.into_os_string().into_string().ok()))
}

#[tauri::command]
fn init_vault(path: Option<String>) -> Result<AppSettings, String> {
    let vault_dir = match path {
        Some(p) if !p.is_empty() => PathBuf::from(p),
        _ => default_vault_dir()?,
    };
    ensure_vault_structure(&vault_dir)?;
    let mut settings = load_settings(&vault_dir)?;
    settings.vault_path = vault_dir.to_str().unwrap_or_default().to_string();
    write_settings_file(&settings_file_path(&vault_dir), &settings)?;
    Ok(settings)
}

#[tauri::command]
fn read_settings(path: Option<String>) -> Result<AppSettings, String> {
    let vault_dir = match path {
        Some(p) if !p.is_empty() => PathBuf::from(p),
        _ => default_vault_dir()?,
    };
    ensure_vault_structure(&vault_dir)?;
    load_settings(&vault_dir)
}

#[tauri::command]
fn save_settings(settings: AppSettings) -> Result<AppSettings, String> {
    let vault_dir = PathBuf::from(&settings.vault_path);
    ensure_vault_structure(&vault_dir)?;
    write_settings_file(&settings_file_path(&vault_dir), &settings)?;
    Ok(settings)
}

#[tauri::command]
fn read_vault_file(vault_path: String, relative_path: String) -> Result<String, String> {
    let vault_dir = PathBuf::from(vault_path);
    ensure_vault_structure(&vault_dir)?;
    let target = resolve_in_vault(&vault_dir, &relative_path)?;
    fs::read_to_string(target).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_vault_file(
    vault_path: String,
    relative_path: String,
    contents: String,
) -> Result<String, String> {
    let vault_dir = PathBuf::from(vault_path);
    ensure_vault_structure(&vault_dir)?;
    let target = resolve_in_vault(&vault_dir, &relative_path)?;
    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&target, contents).map_err(|e| e.to_string())?;
    Ok(target.to_str().unwrap_or_default().to_string())
}

#[tauri::command]
fn delete_vault_entry(vault_path: String, relative_path: String) -> Result<(), String> {
    let vault_dir = PathBuf::from(vault_path);
    ensure_vault_structure(&vault_dir)?;
    let target = resolve_in_vault(&vault_dir, &relative_path)?;
    if target.is_dir() {
        fs::remove_dir_all(target).map_err(|e| e.to_string())
    } else {
        fs::remove_file(target).map_err(|e| e.to_string())
    }
}

#[tauri::command]
fn move_vault_entry(
    vault_path: String,
    from: String,
    to: String,
) -> Result<String, String> {
    let vault_dir = PathBuf::from(vault_path);
    ensure_vault_structure(&vault_dir)?;
    let from_path = resolve_in_vault(&vault_dir, &from)?;
    let to_path = resolve_in_vault(&vault_dir, &to)?;
    if let Some(parent) = to_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::rename(&from_path, &to_path).map_err(|e| e.to_string())?;
    Ok(to_path.to_str().unwrap_or_default().to_string())
}

fn convert_single(path: &Path, options: &ConvertOptions, index: usize) -> Result<PathBuf, String> {
    let target_format = parse_format(
        options
            .target_format
            .as_deref()
            .unwrap_or("jpeg"),
    )?;
    let quality = options.quality_percent.unwrap_or(90).clamp(50, 100);
    let scale_percent = options.scale_percent.unwrap_or(100).clamp(10, 100);
    let strip_exif = options.strip_exif.unwrap_or(false);

    let input_format = ImageFormat::from_path(path).ok();
    let image = image::open(path)
        .map_err(|e| format!("Failed to open {}: {e}", path.display()))?;
    let processed = resize_if_needed(&image, scale_percent);

    let target_dir = options
        .output_dir
        .as_ref()
        .map(PathBuf::from)
        .unwrap_or_else(|| {
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
        .and_then(|s| s.to_str())
        .unwrap_or("image");
    let timestamp = timestamp_string();
    let file_name = options
        .rename_pattern
        .as_ref()
        .map(|pattern| apply_pattern(pattern, base_name, ext, index, &timestamp))
        .unwrap_or_else(|| format!("{base_name}_converted.{ext}"));

    let output_path = target_dir.join(file_name);
    let can_copy_without_changes = !strip_exif
        && scale_percent == 100
        && quality == 100
        && input_format.map(|f| f == target_format).unwrap_or(false);

    if can_copy_without_changes {
        fs::copy(path, &output_path).map_err(|e| e.to_string())?;
    } else {
        save_image(&processed, target_format, quality, &output_path)?;
    }

    Ok(output_path)
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
    let file = File::create(output_path).map_err(|e| e.to_string())?;
    let writer = BufWriter::new(file);
    match format {
        ImageFormat::Jpeg => {
            let mut encoder = JpegEncoder::new_with_quality(writer, quality);
            encoder
                .encode_image(img)
                .map_err(map_image_error)?;
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
            // image 0.25 WebP encoder is lossless; quality is ignored.
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

fn timestamp_string() -> String {
    let now = OffsetDateTime::now_local().unwrap_or_else(|_| OffsetDateTime::now_utc());
    let fmt =
        format_description::parse("[year][month][day]_[hour][minute][second]").unwrap();
    now.format(&fmt).unwrap_or_else(|_| "00000000_000000".to_string())
}

fn apply_pattern(
    pattern: &str,
    base: &str,
    ext: &str,
    index: usize,
    timestamp: &str,
) -> String {
    let mut formatted = pattern.replace("{basename}", base);
    formatted = formatted.replace("{ext}", ext);
    formatted = formatted.replace("{YYYYMMDD_HHmmss}", timestamp);
    if formatted.contains("{index_0001}") {
        formatted = formatted.replace("{index_0001}", &format!("{index:04}"));
    }
    if formatted.contains("{index}") {
        formatted = formatted.replace("{index}", &index.to_string());
    }

    if formatted.ends_with(&format!(".{ext}")) {
        formatted
    } else {
        format!("{formatted}.{ext}")
    }
}

fn map_image_error(err: image::ImageError) -> String {
    match err {
        image::ImageError::IoError(io_err) => io_err.to_string(),
        other => other.to_string(),
    }
}
