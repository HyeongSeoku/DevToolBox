mod convert;
mod util;
mod vault;

use rfd::FileDialog;

pub use convert::{
    batch_convert, convert_image, video_to_gif, BatchItemResult, ConversionResult, ConvertOptions,
    GifOptions, PartialResultPayload, ProgressPayload,
};
pub use vault::{
    delete_vault_entry, init_vault, move_vault_entry, read_settings, read_settings_json,
    read_vault_file, save_settings, write_settings_json, write_vault_file, VaultSettings,
};

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
            read_settings_json,
            write_settings_json,
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

#[tauri::command]
fn pick_files(multiple: bool, extensions: Option<Vec<String>>) -> Result<Vec<String>, String> {
    let mut dialog = FileDialog::new();
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
    let dialog = FileDialog::new();
    Ok(dialog
        .pick_folder()
        .and_then(|p| p.into_os_string().into_string().ok()))
}
