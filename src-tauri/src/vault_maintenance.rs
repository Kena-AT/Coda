use rusqlite::{Connection, params};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Manager};
use serde::{Deserialize, Serialize};
use std::fs;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MonitorState {
    pub name: String,
    pub status: String, // IDLE, RUNNING, WARNING, ERROR
    pub last_run: Option<String>,
    pub duration_ms: u64,
    pub db_size_mb: f64,
    pub cache_size_mb: f64,
    pub issues_found: i32,
    pub actions_taken: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MonitorConfig {
    pub id: i32,
    pub name: String,
    pub check_interval: i32, // seconds
    pub enabled: bool,
    pub db_limit_mb: i32,
    pub cache_limit_mb: i32,
    pub stale_snippet_threshold: i32,
    pub auto_vacuum: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MaintenanceResult {
    pub status: String,
    pub db_size_mb: f64,
    pub cache_size_mb: f64,
    pub issues: Vec<String>,
    pub actions: Vec<String>,
    pub duration_ms: u64,
}

pub struct VaultMaintenanceService {
    app_handle: AppHandle,
    is_running: Arc<Mutex<bool>>,
}

impl VaultMaintenanceService {
    pub fn new(app_handle: AppHandle) -> Self {
        Self {
            app_handle,
            is_running: Arc::new(Mutex::new(false)),
        }
    }

    pub fn start_scheduler(&self) {
        let app_handle = self.app_handle.clone();
        let _is_running = self.is_running.clone();

        thread::spawn(move || {
            loop {
                if let Ok(conn) = get_monitor_connection(&app_handle) {
                    if let Ok(config) = Self::get_active_config(&conn) {
                        if config.enabled {
                            // Check if enough time has passed
                            if let Ok(should_run) = Self::should_run_maintenance(&conn, &config.name, config.check_interval) {
                                if should_run {
                                    // Run maintenance
                                    let _ = Self::run_maintenance_internal(&app_handle, &config);
                                }
                            }
                        }
                    }
                }
                // Check every minute
                thread::sleep(Duration::from_secs(60));
            }
        });
    }

    fn should_run_maintenance(conn: &Connection, monitor_name: &str, interval_secs: i32) -> Result<bool, String> {
        let last_run: Option<String> = conn.query_row(
            "SELECT MAX(last_run) FROM monitor_logs WHERE monitor_name = ? AND status != 'ERROR'",
            params![monitor_name],
            |row| row.get(0),
        ).unwrap_or(None);

        if let Some(last_run_str) = last_run {
            if let Ok(last_run_time) = chrono::DateTime::parse_from_rfc3339(&last_run_str) {
                let now = chrono::Utc::now();
                let elapsed = now.signed_duration_since(last_run_time);
                return Ok(elapsed.num_seconds() >= interval_secs as i64);
            }
        }
        // Never run before, should run now
        Ok(true)
    }

    fn get_active_config(conn: &Connection) -> Result<MonitorConfig, String> {
        conn.query_row(
            "SELECT id, name, check_interval, enabled, db_limit_mb, cache_limit_mb, stale_snippet_threshold, auto_vacuum 
             FROM monitor_config WHERE enabled = 1 LIMIT 1",
            [],
            |row| {
                Ok(MonitorConfig {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    check_interval: row.get(2)?,
                    enabled: row.get(3)?,
                    db_limit_mb: row.get(4)?,
                    cache_limit_mb: row.get(5)?,
                    stale_snippet_threshold: row.get(6)?,
                    auto_vacuum: row.get(7)?,
                })
            },
        ).map_err(|e| e.to_string())
    }

    fn run_maintenance_internal(app_handle: &AppHandle, config: &MonitorConfig) -> Result<MaintenanceResult, String> {
        let start = Instant::now();
        let mut issues = Vec::new();
        let mut actions = Vec::new();

        // Update status to RUNNING
        Self::log_maintenance_start(app_handle, &config.name)?;

        // Get DB size
        let db_size_mb = Self::check_db_size(app_handle)?;

        // Check DB size threshold
        if db_size_mb > config.db_limit_mb as f64 {
            issues.push(format!("DB size ({:.1}MB) exceeds limit ({}MB)", db_size_mb, config.db_limit_mb));
            if config.auto_vacuum {
                if let Ok(_) = Self::vacuum_db(app_handle) {
                    actions.push("db_vacuumed".to_string());
                }
            }
        }

        // Check cache size
        let cache_size_mb = Self::check_cache_size(app_handle)?;
        if cache_size_mb > config.cache_limit_mb as f64 {
            issues.push(format!("Cache size ({:.1}MB) exceeds limit ({}MB)", cache_size_mb, config.cache_limit_mb));
            if let Ok(_) = Self::clear_expired_cache(app_handle) {
                actions.push("cache_cleared".to_string());
            }
        }

        // Check for stale snippets
        let stale_count = Self::count_stale_snippets(app_handle)?;
        if stale_count > config.stale_snippet_threshold {
            issues.push(format!("{} stale snippets detected (threshold: {})", stale_count, config.stale_snippet_threshold));
        }

        // Check orphan records
        let orphan_count = Self::check_orphan_records(app_handle)?;
        if orphan_count > 0 {
            issues.push(format!("{} orphan records found", orphan_count));
            if let Ok(deleted) = Self::clean_orphan_records(app_handle) {
                if deleted > 0 {
                    actions.push(format!("orphans_cleaned:{}", deleted));
                }
            }
        }

        let duration_ms = start.elapsed().as_millis() as u64;
        let status = if issues.is_empty() { "IDLE" } else { "WARNING" };

        let result = MaintenanceResult {
            status: status.to_string(),
            db_size_mb,
            cache_size_mb,
            issues: issues.clone(),
            actions: actions.clone(),
            duration_ms,
        };

        // Log the result
        Self::log_maintenance_result(app_handle, &config.name, &result)?;

        Ok(result)
    }

    fn log_maintenance_start(app_handle: &AppHandle, monitor_name: &str) -> Result<(), String> {
        let conn = get_monitor_connection(app_handle)?;
        conn.execute(
            "INSERT INTO monitor_logs (monitor_name, status, duration_ms, db_size_mb, cache_size_mb, issues_found, actions_taken) 
             VALUES (?, 'RUNNING', 0, 0, 0, 0, '')",
            params![monitor_name],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    fn log_maintenance_result(app_handle: &AppHandle, monitor_name: &str, result: &MaintenanceResult) -> Result<(), String> {
        let conn = get_monitor_connection(app_handle)?;
        let actions_str = result.actions.join(",");
        let details_str = result.issues.join("; ");
        
        conn.execute(
            "INSERT INTO monitor_logs (monitor_name, status, duration_ms, db_size_mb, cache_size_mb, issues_found, actions_taken, details) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            params![
                monitor_name,
                result.status,
                result.duration_ms as i64,
                result.db_size_mb,
                result.cache_size_mb,
                result.issues.len() as i32,
                actions_str,
                details_str
            ],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    fn check_db_size(app_handle: &AppHandle) -> Result<f64, String> {
        let app_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
        let db_path = app_dir.join("coda.db");
        let metadata = fs::metadata(db_path).map_err(|e| e.to_string())?;
        let size_bytes = metadata.len() as f64;
        Ok(size_bytes / 1024.0 / 1024.0) // Convert to MB
    }

    fn check_cache_size(app_handle: &AppHandle) -> Result<f64, String> {
        let conn = get_monitor_connection(app_handle)?;
        let count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM app_cache WHERE (expires_at IS NULL OR expires_at > datetime('now'))",
            [],
            |row| row.get(0),
        ).map_err(|e| e.to_string())?;
        // Estimate 1KB per cache entry average
        Ok(count as f64 / 1024.0)
    }

    fn vacuum_db(app_handle: &AppHandle) -> Result<(), String> {
        let conn = get_monitor_connection(app_handle)?;
        conn.execute("VACUUM", []).map_err(|e| e.to_string())?;
        Ok(())
    }

    fn clear_expired_cache(app_handle: &AppHandle) -> Result<i32, String> {
        let conn = get_monitor_connection(app_handle)?;
        let deleted = conn.execute(
            "DELETE FROM app_cache WHERE expires_at IS NOT NULL AND expires_at < datetime('now')",
            [],
        ).map_err(|e| e.to_string())?;
        Ok(deleted as i32)
    }

    fn count_stale_snippets(app_handle: &AppHandle) -> Result<i32, String> {
        let conn = get_monitor_connection(app_handle)?;
        let count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM snippets 
             WHERE is_archived = 0 
             AND (last_used_at IS NULL OR last_used_at < datetime('now', '-30 days'))
             AND copy_count < 5",
            [],
            |row| row.get(0),
        ).map_err(|e| e.to_string())?;
        Ok(count as i32)
    }

    fn check_orphan_records(app_handle: &AppHandle) -> Result<i32, String> {
        let conn = get_monitor_connection(app_handle)?;
        let mut total = 0;
        
        // Check snippet_versions without snippets
        let orphan_versions: i64 = conn.query_row(
            "SELECT COUNT(*) FROM snippet_versions sv 
             LEFT JOIN snippets s ON sv.snippet_id = s.id 
             WHERE s.id IS NULL",
            [],
            |row| row.get(0),
        ).unwrap_or(0);
        total += orphan_versions;
        
        // Check activity_log with invalid snippet_ids
        let orphan_activity: i64 = conn.query_row(
            "SELECT COUNT(*) FROM activity_log al 
             LEFT JOIN snippets s ON al.snippet_id = s.id 
             WHERE al.snippet_id IS NOT NULL AND s.id IS NULL",
            [],
            |row| row.get(0),
        ).unwrap_or(0);
        total += orphan_activity;
        
        Ok(total as i32)
    }

    fn clean_orphan_records(app_handle: &AppHandle) -> Result<i32, String> {
        let conn = get_monitor_connection(app_handle)?;
        let mut total_deleted = 0;
        
        // Delete orphan versions
        let deleted_versions = conn.execute(
            "DELETE FROM snippet_versions WHERE snippet_id NOT IN (SELECT id FROM snippets)",
            [],
        ).map_err(|e| e.to_string())?;
        total_deleted += deleted_versions as i32;
        
        // Delete orphan activity logs
        let deleted_activity = conn.execute(
            "DELETE FROM activity_log WHERE snippet_id IS NOT NULL AND snippet_id NOT IN (SELECT id FROM snippets)",
            [],
        ).map_err(|e| e.to_string())?;
        total_deleted += deleted_activity as i32;
        
        Ok(total_deleted)
    }

    // Public command handlers
    pub fn get_monitor_state(app_handle: &AppHandle) -> Result<MonitorState, String> {
        let conn = get_monitor_connection(app_handle)?;
        
        // Get latest log entry
        let state: (String, Option<String>, i64, f64, f64, i32, Option<String>) = conn.query_row(
            "SELECT status, last_run, duration_ms, db_size_mb, cache_size_mb, issues_found, actions_taken 
             FROM monitor_logs 
             WHERE monitor_name = 'Vault Maintenance'
             ORDER BY last_run DESC LIMIT 1",
            [],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, Option<String>>(1)?,
                    row.get::<_, i64>(2)?,
                    row.get::<_, f64>(3)?,
                    row.get::<_, f64>(4)?,
                    row.get::<_, i32>(5)?,
                    row.get::<_, Option<String>>(6)?,
                ))
            },
        ).map_err(|e| e.to_string())?;

        let actions = state.6.map(|s| s.split(',').map(|a| a.to_string()).collect()).unwrap_or_default();

        // Get current sizes
        let db_size_mb = Self::check_db_size(app_handle)?;
        let cache_size_mb = Self::check_cache_size(app_handle)?;

        Ok(MonitorState {
            name: "Vault Maintenance".to_string(),
            status: state.0,
            last_run: state.1,
            duration_ms: state.2 as u64,
            db_size_mb,
            cache_size_mb,
            issues_found: state.5,
            actions_taken: actions,
        })
    }

    pub fn get_monitor_history(app_handle: &AppHandle, limit: i32) -> Result<Vec<MonitorState>, String> {
        let conn = get_monitor_connection(app_handle)?;
        let mut stmt = conn.prepare(
            "SELECT status, last_run, duration_ms, db_size_mb, cache_size_mb, issues_found, actions_taken 
             FROM monitor_logs 
             WHERE monitor_name = 'Vault Maintenance'
             ORDER BY last_run DESC LIMIT ?"
        ).map_err(|e| e.to_string())?;

        let logs = stmt.query_map(params![limit], |row| {
            let actions_str: Option<String> = row.get(6)?;
            let actions = actions_str.map(|s| s.split(',').map(|a| a.to_string()).collect()).unwrap_or_default();
            
            Ok(MonitorState {
                name: "Vault Maintenance".to_string(),
                status: row.get(0)?,
                last_run: row.get(1)?,
                duration_ms: row.get::<_, i64>(2)? as u64,
                db_size_mb: row.get(3)?,
                cache_size_mb: row.get(4)?,
                issues_found: row.get(5)?,
                actions_taken: actions,
            })
        }).map_err(|e| e.to_string())?;

        let mut result = Vec::new();
        for log in logs {
            result.push(log.map_err(|e| e.to_string())?);
        }
        Ok(result)
    }

    pub fn run_maintenance_now(app_handle: &AppHandle) -> Result<MaintenanceResult, String> {
        let conn = get_monitor_connection(app_handle)?;
        let config = Self::get_active_config(&conn)?;
        Self::run_maintenance_internal(app_handle, &config)
    }

    pub fn get_config(app_handle: &AppHandle) -> Result<MonitorConfig, String> {
        let conn = get_monitor_connection(app_handle)?;
        Self::get_active_config(&conn)
    }

    pub fn update_config(app_handle: &AppHandle, config: MonitorConfig) -> Result<(), String> {
        let conn = get_monitor_connection(app_handle)?;
        conn.execute(
            "UPDATE monitor_config SET 
             check_interval = ?, enabled = ?, db_limit_mb = ?, cache_limit_mb = ?, 
             stale_snippet_threshold = ?, auto_vacuum = ? WHERE id = ?",
            params![
                config.check_interval,
                config.enabled,
                config.db_limit_mb,
                config.cache_limit_mb,
                config.stale_snippet_threshold,
                config.auto_vacuum,
                config.id
            ],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn add_monitor(app_handle: &AppHandle, name: &str, interval: i32) -> Result<(), String> {
        let conn = get_monitor_connection(app_handle)?;
        conn.execute(
            "INSERT INTO monitor_config (name, check_interval, enabled) VALUES (?, ?, 1)",
            params![name, interval],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }
}

fn get_monitor_connection(app_handle: &AppHandle) -> Result<Connection, String> {
    let app_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = app_dir.join("coda.db");
    Connection::open(db_path).map_err(|e| e.to_string())
}

// Tauri command wrappers
#[tauri::command]
pub fn get_vault_status(app_handle: AppHandle) -> Result<MonitorState, String> {
    VaultMaintenanceService::get_monitor_state(&app_handle)
}

#[tauri::command]
pub fn get_vault_history(app_handle: AppHandle, limit: i32) -> Result<Vec<MonitorState>, String> {
    VaultMaintenanceService::get_monitor_history(&app_handle, limit)
}

#[tauri::command]
pub fn run_vault_maintenance(app_handle: AppHandle) -> Result<MaintenanceResult, String> {
    VaultMaintenanceService::run_maintenance_now(&app_handle)
}

#[tauri::command]
pub fn get_vault_config(app_handle: AppHandle) -> Result<MonitorConfig, String> {
    VaultMaintenanceService::get_config(&app_handle)
}

#[tauri::command]
pub fn update_vault_config(app_handle: AppHandle, config: MonitorConfig) -> Result<(), String> {
    VaultMaintenanceService::update_config(&app_handle, config)
}

#[tauri::command]
pub fn add_vault_monitor(app_handle: AppHandle, name: String, interval: i32) -> Result<(), String> {
    VaultMaintenanceService::add_monitor(&app_handle, &name, interval)
}
