use rusqlite::Connection;
use tauri::{AppHandle, Manager};
use std::fs;

pub fn init_db(app_handle: &AppHandle) -> Result<(), String> {
    let app_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    
    if !app_dir.exists() {
        fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;
    }
    
    let db_path = app_dir.join("coda.db");
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            master_password_hash TEXT NOT NULL,
            lockout_count INTEGER DEFAULT 0,
            last_failed_attempt DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    ).map_err(|e| e.to_string())?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )",
        [],
    ).map_err(|e| e.to_string())?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS snippets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            project_id INTEGER,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            language TEXT NOT NULL,
            tags TEXT,
            is_archived BOOLEAN DEFAULT 0,
            copy_count INTEGER DEFAULT 0,
            edit_count INTEGER DEFAULT 0,
            last_used_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
            UNIQUE(user_id, title)
        )",
        [],
    ).map_err(|e| e.to_string())?;

    // Migration logic: Add columns to existing users table if missing
    {
        let mut table_info = conn.prepare("PRAGMA table_info(users)").map_err(|e| e.to_string())?;
        let rows = table_info.query_map([], |row| {
            let name: String = row.get(1)?;
            Ok(name)
        }).map_err(|e| e.to_string())?;
        
        let mut columns = Vec::new();
        for col in rows {
            columns.push(col.map_err(|e| e.to_string())?);
        }

        if !columns.contains(&"last_logout_at".to_string()) {
            conn.execute("ALTER TABLE users ADD COLUMN last_logout_at DATETIME", []).map_err(|e| e.to_string())?;
        }
    }

    // Migration logic: Add columns to existing projects table if missing
    {
        let mut table_info = conn.prepare("PRAGMA table_info(projects)").map_err(|e| e.to_string())?;
        let rows = table_info.query_map([], |row| {
            let name: String = row.get(1)?;
            Ok(name)
        }).map_err(|e| e.to_string())?;
        
        let mut columns = Vec::new();
        for col in rows {
            columns.push(col.map_err(|e| e.to_string())?);
        }
        if !columns.contains(&"color".to_string()) {
            conn.execute("ALTER TABLE projects ADD COLUMN color TEXT", []).map_err(|e| e.to_string())?;
        }
    }

    // Migration logic: Add columns to existing snippets table if missing
    {
        let mut table_info = conn.prepare("PRAGMA table_info(snippets)").map_err(|e| e.to_string())?;
        let rows = table_info.query_map([], |row| {
            let name: String = row.get(1)?;
            Ok(name)
        }).map_err(|e| e.to_string())?;
        
        let mut columns = Vec::new();
        for col in rows {
            columns.push(col.map_err(|e| e.to_string())?);
        }

        if !columns.contains(&"copy_count".to_string()) {
            conn.execute("ALTER TABLE snippets ADD COLUMN copy_count INTEGER DEFAULT 0", []).map_err(|e| e.to_string())?;
        }
        if !columns.contains(&"last_used_at".to_string()) {
            conn.execute("ALTER TABLE snippets ADD COLUMN last_used_at DATETIME", []).map_err(|e| e.to_string())?;
        }
        if !columns.contains(&"project_id".to_string()) {
            conn.execute("ALTER TABLE snippets ADD COLUMN project_id INTEGER", []).map_err(|e| e.to_string())?;
        }
        if !columns.contains(&"edit_count".to_string()) {
            conn.execute("ALTER TABLE snippets ADD COLUMN edit_count INTEGER DEFAULT 0", []).map_err(|e| e.to_string())?;
        }
        if !columns.contains(&"detected_patterns".to_string()) {
            conn.execute("ALTER TABLE snippets ADD COLUMN detected_patterns TEXT", []).map_err(|e| e.to_string())?;
        }
        if !columns.contains(&"impressions".to_string()) {
            conn.execute("ALTER TABLE snippets ADD COLUMN impressions INTEGER DEFAULT 0", []).map_err(|e| e.to_string())?;
        }
        if !columns.contains(&"clicks".to_string()) {
            conn.execute("ALTER TABLE snippets ADD COLUMN clicks INTEGER DEFAULT 0", []).map_err(|e| e.to_string())?;
        }
        if !columns.contains(&"archive_snoozed_until".to_string()) {
            conn.execute("ALTER TABLE snippets ADD COLUMN archive_snoozed_until DATETIME", []).map_err(|e| e.to_string())?;
        }
    }

    conn.execute(
        "CREATE TABLE IF NOT EXISTS snippet_versions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            snippet_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (snippet_id) REFERENCES snippets(id) ON DELETE CASCADE
        )",
        [],
    ).map_err(|e| e.to_string())?;

    conn.execute_batch(
        "
        CREATE VIRTUAL TABLE IF NOT EXISTS snippets_fts USING fts5(
            title, content, tags, content='snippets', content_rowid='id'
        );

        CREATE TRIGGER IF NOT EXISTS snippets_ai AFTER INSERT ON snippets BEGIN
            INSERT INTO snippets_fts(rowid, title, content, tags) 
            VALUES (new.id, new.title, new.content, new.tags);
        END;

        CREATE TRIGGER IF NOT EXISTS snippets_ad AFTER DELETE ON snippets BEGIN
            INSERT INTO snippets_fts(snippets_fts, rowid, title, content, tags) 
            VALUES ('delete', old.id, old.title, old.content, old.tags);
        END;

        CREATE TRIGGER IF NOT EXISTS snippets_au AFTER UPDATE ON snippets BEGIN
            INSERT INTO snippets_fts(snippets_fts, rowid, title, content, tags) 
            VALUES ('delete', old.id, old.title, old.content, old.tags);
            INSERT INTO snippets_fts(rowid, title, content, tags) 
            VALUES (new.id, new.title, new.content, new.tags);
        END;
        "
    ).map_err(|e| e.to_string())?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS activity_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            snippet_id INTEGER,
            event_type TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (snippet_id) REFERENCES snippets(id) ON DELETE SET NULL
        )",
        [],
    ).map_err(|e| e.to_string())?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS snippet_usage_sequences (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            from_id INTEGER NOT NULL,
            to_id INTEGER NOT NULL,
            count INTEGER DEFAULT 1,
            last_used DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (from_id) REFERENCES snippets(id) ON DELETE CASCADE,
            FOREIGN KEY (to_id) REFERENCES snippets(id) ON DELETE CASCADE
        )",
        [],
    ).map_err(|e| e.to_string())?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS snippet_relations (
            snippet_id INTEGER NOT NULL,
            related_id INTEGER NOT NULL,
            strength INTEGER DEFAULT 0,
            link_type TEXT NOT NULL,
            last_calculated DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (snippet_id, related_id),
            FOREIGN KEY (snippet_id) REFERENCES snippets(id) ON DELETE CASCADE,
            FOREIGN KEY (related_id) REFERENCES snippets(id) ON DELETE CASCADE
        )",
        [],
    ).map_err(|e| e.to_string())?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS user_settings (
            user_id INTEGER PRIMARY KEY,
            auto_archive_days INTEGER DEFAULT 30,
            exclude_favorites BOOLEAN DEFAULT 1,
            min_copy_threshold INTEGER DEFAULT 10,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )",
        [],
    ).map_err(|e| e.to_string())?;

    // Monitor config and logs for Vault Maintenance
    conn.execute(
        "CREATE TABLE IF NOT EXISTS monitor_config (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            check_interval INTEGER DEFAULT 300,
            enabled BOOLEAN DEFAULT 1,
            db_limit_mb INTEGER DEFAULT 100,
            cache_limit_mb INTEGER DEFAULT 20,
            stale_snippet_threshold INTEGER DEFAULT 100,
            auto_vacuum BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    ).map_err(|e| e.to_string())?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS monitor_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            monitor_name TEXT NOT NULL,
            status TEXT NOT NULL,
            last_run DATETIME DEFAULT CURRENT_TIMESTAMP,
            duration_ms INTEGER,
            db_size_mb REAL,
            cache_size_mb REAL,
            issues_found INTEGER DEFAULT 0,
            actions_taken TEXT,
            details TEXT
        )",
        [],
    ).map_err(|e| e.to_string())?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS app_cache (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            key TEXT UNIQUE NOT NULL,
            value TEXT,
            expires_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    ).map_err(|e| e.to_string())?;

    // Insert default monitor config if not exists
    conn.execute(
        "INSERT OR IGNORE INTO monitor_config (name, check_interval, enabled) 
         VALUES ('Vault Maintenance', 300, 1)",
        [],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

pub fn get_db_connection(app_handle: &AppHandle) -> Result<Connection, String> {
    let app_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = app_dir.join("coda.db");
    Connection::open(db_path).map_err(|e| e.to_string())
}
