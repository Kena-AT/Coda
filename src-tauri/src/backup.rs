use tauri::{AppHandle, Manager};
use std::fs;
use std::path::PathBuf;

#[tauri::command]
pub async fn create_backup(app_handle: AppHandle, target_path: String) -> Result<String, String> {
    let db_path = app_handle.path().app_data_dir()
        .map_err(|e: tauri::Error| e.to_string())?
        .join("coda.db");

    if !db_path.exists() {
        return Err("Database file not found".to_string());
    }

    let target = PathBuf::from(target_path);
    fs::copy(&db_path, &target).map_err(|e| format!("Failed to copy database: {}", e))?;

    Ok("Backup created successfully".to_string())
}

#[tauri::command]
pub async fn restore_backup(app_handle: AppHandle, source_path: String) -> Result<String, String> {
    let db_path = app_handle.path().app_data_dir()
        .map_err(|e: tauri::Error| e.to_string())?
        .join("coda.db");

    let source = PathBuf::from(source_path);
    if !source.exists() {
        return Err("Source backup file not found".to_string());
    }

    // Verify it's a valid sqlite db (simple check)
    {
        let conn = rusqlite::Connection::open(&source).map_err(|e| format!("Invalid backup file: {}", e))?;
        let _: i32 = conn.query_row("SELECT count(*) FROM snippets", [], |row| row.get(0)).map_err(|_| "Backup file schema mismatch".to_string())?;
    }

    fs::copy(&source, &db_path).map_err(|e| format!("Failed to restore database: {}", e))?;

    Ok("Restore complete. Please restart the application.".to_string())
}
