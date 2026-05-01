use tauri::{AppHandle, Manager};
use std::fs;
use std::path::PathBuf;
use rusqlite::Connection;
use crate::db::get_db_connection;

#[tauri::command]
pub async fn create_backup(app_handle: AppHandle, target_path: String) -> Result<String, String> {
    // 1. Get source connection
    let conn = get_db_connection(&app_handle)?;
    
    // 2. Perform consistent backup using VACUUM INTO
    // This is safer than fs::copy because it handles locked/active databases correctly
    conn.execute("VACUUM INTO ?", [target_path.as_str()])
        .map_err(|e| format!("Database backup failed: {}. Make sure the target file doesn't already exist or you have permission to write there.", e))?;

    Ok("Vault snapshot committed successfully".to_string())
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

    // Verify it's a valid sqlite db and has our core schema
    {
        let conn = Connection::open(&source).map_err(|e| format!("Invalid backup file: {}", e))?;
        
        // Verify multiple critical tables exist
        let tables = vec!["snippets", "projects", "tags", "user_settings"];
        for table in tables {
            let _: i32 = conn.query_row(
                &format!("SELECT count(*) FROM sqlite_master WHERE type='table' AND name='{}'", table),
                [],
                |row| row.get(0)
            ).map_err(|_| format!("Backup file is missing critical table: {}", table))?;
        }
    }

    // Force copy (overwrite)
    fs::copy(&source, &db_path).map_err(|e| format!("Failed to overwrite database: {}", e))?;

    Ok("Vault reconstruction complete. Restart required.".to_string())
}
