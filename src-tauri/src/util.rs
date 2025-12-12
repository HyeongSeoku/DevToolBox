use image::ImageError;
use time::{format_description, OffsetDateTime};

pub fn timestamp_string() -> String {
    let now = OffsetDateTime::now_local().unwrap_or_else(|_| OffsetDateTime::now_utc());
    let fmt = format_description::parse("[year][month][day]_[hour][minute][second]").unwrap();
    now.format(&fmt).unwrap_or_else(|_| "00000000_000000".to_string())
}

pub fn apply_pattern(pattern: &str, base: &str, ext: &str, index: usize, timestamp: &str) -> String {
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

pub fn map_image_error(err: ImageError) -> String {
    match err {
        ImageError::IoError(io_err) => io_err.to_string(),
        other => other.to_string(),
    }
}
