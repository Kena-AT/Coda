mod auth;
mod db;
mod snippet;

use dashmap::DashMap;
use std::sync::Arc;

pub struct AppState {
    pub snippet_cache: DashMap<i32, Vec<snippet::Snippet>>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let state = AppState {
        snippet_cache: DashMap::new(),
    };

    tauri::Builder::default()
        .manage(state)
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Initialize database
            db::init_db(app.handle())?;
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
            snippet::rollback_snippet
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
