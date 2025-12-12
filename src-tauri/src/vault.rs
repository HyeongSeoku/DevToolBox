use std::fs;
use std::path::{Component, Path, PathBuf};

use dirs::data_dir;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct VaultSettings {
    #[serde(default)]
    pub vault_path: String,
    #[serde(default)]
    pub recent_files: Vec<String>,
    #[serde(default)]
    pub last_open_path: Option<String>,
}

pub fn default_vault_dir() -> Result<PathBuf, String> {
    data_dir()
        .map(|p| p.join("DevToolBox"))
        .ok_or_else(|| "OS 데이터 디렉터리를 찾을 수 없습니다.".to_string())
}

fn settings_file_path(vault_dir: &Path) -> PathBuf {
    vault_dir.join("settings.json")
}

fn normalize_settings(mut settings: VaultSettings, vault_dir: &Path) -> VaultSettings {
    if settings.vault_path.trim().is_empty() {
        settings.vault_path = vault_dir.to_string_lossy().to_string();
    }
    settings
}

pub fn ensure_vault_structure(vault_dir: &Path) -> Result<(), String> {
    fs::create_dir_all(vault_dir).map_err(|e| e.to_string())?;
    let required_dirs = [
        "env-history",
        "convert-history",
        "diff",
        "tmp",
        "snippets",
        "api-presets",
        "history",
        "history/gif-convert",
        "history/json-format",
        "history/jwt-decode",
        "history/text-convert",
        "history/regex-tester",
        "history/env",
    ];
    for child in required_dirs {
        fs::create_dir_all(vault_dir.join(child)).map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn ensure_settings_file(vault_dir: &Path) -> Result<(), String> {
    let path = settings_file_path(vault_dir);
    if path.exists() {
        return Ok(());
    }
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&path, "{}").map_err(|e| e.to_string())
}

fn write_settings_file(path: &Path, settings: &VaultSettings) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())
}

fn load_settings(vault_dir: &Path) -> Result<VaultSettings, String> {
    ensure_settings_file(vault_dir)?;
    let settings_path = settings_file_path(vault_dir);
    let text = fs::read_to_string(&settings_path).map_err(|e| e.to_string())?;
    if text.trim().is_empty() {
        return Ok(normalize_settings(VaultSettings::default(), vault_dir));
    }
    let settings: VaultSettings =
        serde_json::from_str(&text).map_err(|e| format!("settings.json 파싱 실패: {e}"))?;
    Ok(normalize_settings(settings, vault_dir))
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

fn resolve_vault_dir(path: Option<String>) -> Result<PathBuf, String> {
    match path {
        Some(p) if !p.trim().is_empty() => Ok(PathBuf::from(p)),
        _ => default_vault_dir(),
    }
}

#[tauri::command]
pub fn init_vault(path: Option<String>) -> Result<VaultSettings, String> {
    let vault_dir = resolve_vault_dir(path)?;
    ensure_vault_structure(&vault_dir)?;
    let settings = load_settings(&vault_dir)?;
    let normalized = normalize_settings(settings, &vault_dir);
    write_settings_file(&settings_file_path(&vault_dir), &normalized)?;
    Ok(normalized)
}

#[tauri::command]
pub fn read_settings_json(path: Option<String>) -> Result<VaultSettings, String> {
    let vault_dir = resolve_vault_dir(path)?;
    ensure_vault_structure(&vault_dir)?;
    load_settings(&vault_dir)
}

#[tauri::command]
pub fn write_settings_json(settings: VaultSettings) -> Result<VaultSettings, String> {
    let vault_dir = resolve_vault_dir(Some(settings.vault_path.clone()))?;
    ensure_vault_structure(&vault_dir)?;
    let normalized = normalize_settings(settings, &vault_dir);
    write_settings_file(&settings_file_path(&vault_dir), &normalized)?;
    Ok(normalized)
}

// Legacy command names for compatibility
#[tauri::command]
pub fn read_settings(path: Option<String>) -> Result<VaultSettings, String> {
    read_settings_json(path)
}

#[tauri::command]
pub fn save_settings(settings: VaultSettings) -> Result<VaultSettings, String> {
    write_settings_json(settings)
}

#[tauri::command]
pub fn read_vault_file(vault_path: String, relative_path: String) -> Result<String, String> {
    let vault_dir = PathBuf::from(vault_path);
    ensure_vault_structure(&vault_dir)?;
    let target = resolve_in_vault(&vault_dir, &relative_path)?;
    fs::read_to_string(target).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn write_vault_file(
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
pub fn delete_vault_entry(vault_path: String, relative_path: String) -> Result<(), String> {
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
pub fn move_vault_entry(
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
