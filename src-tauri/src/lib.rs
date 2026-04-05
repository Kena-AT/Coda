mod auth;
mod db;
mod snippet;
mod telemetry;
mod templates;
mod recommendation_engine;
mod patterns;

use dashmap::DashMap;
use tauri::Manager;

pub struct AppState {
    pub snippet_cache: DashMap<i32, Vec<snippet::Snippet>>,
    pub last_accessed_map: DashMap<i32, i32>, // user_id -> snippet_id
    pub telemetry: telemetry::SharedTelemetry,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let telemetry = telemetry::new_shared();

    let state = AppState {
        snippet_cache: DashMap::new(),
        last_accessed_map: DashMap::new(),
        telemetry: telemetry.clone(),
    };

    // Clone handle for background sampling thread
    let telemetry_bg = telemetry.clone();

    tauri::Builder::default()
        .manage(state)
        .plugin(tauri_plugin_opener::init())
        .setup(move |app| {
            // Initialize database
            db::init_db(app.handle())?;

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
            auth::check_auth,
            snippet::create_snippet,
            snippet::list_snippets,
            snippet::update_snippet,
            snippet::delete_snippet,
            snippet::toggle_archive,
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
            recommendation_engine::record_recommendation_click
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
