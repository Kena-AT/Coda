mod auth;
mod db;
mod snippet;
mod telemetry;
mod templates;
mod recommendation_engine;
mod patterns;
mod project;
mod archiver;
mod vault_maintenance;
mod backup;
mod notifications;
mod settings;

use dashmap::DashMap;
use tauri::Manager;

pub struct AppState {
    pub snippet_cache: DashMap<i32, Vec<snippet::Snippet>>,
    pub last_accessed_map: DashMap<i32, i32>, // user_id -> snippet_id
    pub telemetry: telemetry::SharedTelemetry,
    pub session_store: auth::SessionStore,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let telemetry = telemetry::new_shared();

    let state = AppState {
        snippet_cache: DashMap::new(),
        last_accessed_map: DashMap::new(),
        telemetry: telemetry.clone(),
        session_store: auth::SessionStore::new(),
    };

    // Clone handle for background sampling thread
    let telemetry_bg = telemetry.clone();

    tauri::Builder::default()
        .manage(state)
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .setup(move |app| {
            // Initialize database
            db::init_db(app.handle())?;

            // Start vault maintenance scheduler
            let app_handle_maintenance = app.handle().clone();
            std::thread::spawn(move || {
                // Wait a bit for DB to be ready
                std::thread::sleep(std::time::Duration::from_secs(5));
                let service = vault_maintenance::VaultMaintenanceService::new(app_handle_maintenance);
                service.start_scheduler();
            });

            // Spawn background telemetry sampling thread
            let app_handle = app.handle().clone();
            let telem = telemetry_bg.clone();
            std::thread::spawn(move || {
                // First sleep so sysinfo gets a two-sample CPU reading
                std::thread::sleep(std::time::Duration::from_secs(3));
                loop {
                    let sampling_interval = telem
                        .lock()
                        .map(|s| s.sampling_interval_secs)
                        .unwrap_or(5);

                    let db_path = app_handle
                        .path()
                        .app_data_dir()
                        .ok()
                        .map(|p: std::path::PathBuf| p.join("coda.db").to_string_lossy().to_string());

                    // Count total cached snippets across all users
                    let state = app_handle.state::<AppState>();
                    let cache_entries: usize = state.snippet_cache.iter()
                        .map(|e| e.value().len())
                        .sum();

                    if let Ok(mut store) = telem.lock() {
                        store.sample_resources(db_path.as_deref(), cache_entries);
                    }

                    std::thread::sleep(std::time::Duration::from_secs(sampling_interval));
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            auth::signup,
            auth::login,
            auth::refresh_access_token,
            auth::logout,
            auth::validate_token,
            auth::change_master_password,
            snippet::create_snippet,
            snippet::list_snippets,
            snippet::update_snippet,
            snippet::delete_snippet,
            snippet::toggle_archive,
            snippet::archive_snippet,
            snippet::get_snippet_versions,
            snippet::rollback_snippet,
            telemetry::get_telemetry_snapshot,
            telemetry::record_client_metric,
            telemetry::update_task_state_cmd,
            telemetry::set_diagnostics_enabled,
            templates::get_templates,
            templates::get_smart_recommendations,
            snippet::record_snippet_usage,
            snippet::get_analytics_summary,
            recommendation_engine::get_contextual_recommendations,
            recommendation_engine::get_recommendations_metadata,
            recommendation_engine::get_stale_snippets,
            recommendation_engine::get_popular_snippets,
            recommendation_engine::record_recommendation_click,
            recommendation_engine::linking::get_related_snippets,
            recommendation_engine::linking::recompute_snippet_links,
            project::create_project,
            project::list_projects,
            project::update_project,
            project::delete_project,
            project::get_project_stats,
            archiver::get_archive_candidates,
            archiver::archive_snippets,
            archiver::snooze_archive,
            archiver::update_maintenance_settings,
            telemetry::get_system_status,
            vault_maintenance::get_vault_status,
            vault_maintenance::get_vault_history,
            vault_maintenance::run_vault_maintenance,
            vault_maintenance::get_vault_config,
            vault_maintenance::update_vault_config,
            vault_maintenance::add_vault_monitor,
            snippet::validate_snippet_title,
            backup::create_backup,
            backup::restore_backup,
            notifications::update_notification_settings,
            notifications::get_notification_settings,
            settings::get_user_preferences,
            settings::update_user_preferences
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
