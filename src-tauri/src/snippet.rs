use serde::{Deserialize, Serialize};
use crate::db::get_db_connection;
use tauri::{AppHandle, State, Manager};
use crate::AppState;
use std::time::Instant;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Snippet {
    pub id: Option<i32>,
    pub user_id: i32,
    pub project_id: Option<i32>,
    pub title: String,
    pub content: Option<String>,
    pub language: String,
    pub tags: Option<String>,
    pub is_archived: bool,
    pub is_favorite: bool,
    pub deleted_at: Option<String>,
    pub copy_count: i32,
    pub edit_count: i32,
    pub detected_patterns: Option<String>,
    pub impressions: i32,
    pub clicks: i32,
    pub last_used_at: Option<String>,
    pub archive_snoozed_until: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub tag_nodes: Option<Vec<Tag>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tag {
    pub id: Option<i32>,
    pub user_id: i32,
    pub name: String,
    pub category: Option<String>,
    pub color: Option<String>,
    pub created_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActivityData {
    pub hour: String,
    pub count: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalyticsSummary {
    pub global_copies: i32,
    pub last_entry: String,
    pub last_entry_time: Option<String>,
    pub activity: Vec<ActivityData>,
    pub ledger: Vec<Snippet>,
    pub resource_usage: Option<crate::telemetry::ResourceSample>,
    pub db_query_ms: f64,
    pub copy_growth: f64,
    pub db_size_bytes: u64,
    pub efficiency: f64,
    pub buffer_status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SnippetVersion {
    pub id: i32,
    pub snippet_id: i32,
    pub content: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SnippetResponse {
    pub success: bool,
    pub message: String,
    pub data: Option<Vec<Snippet>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TagResponse {
    pub success: bool,
    pub message: String,
    pub data: Option<Vec<Tag>>,
}

#[tauri::command]
pub fn create_snippet(
    app_handle: AppHandle,
    state: State<'_, AppState>,
    user_id: i32,
    title: String,
    content: String,
    language: String,
    tags: Option<String>,
    project_id: Option<i32>
) -> Result<SnippetResponse, String> {
    let conn = get_db_connection(&app_handle)?;

    // 1. Validation: Basic
    if title.trim().is_empty() {
        return Ok(SnippetResponse { success: false, message: "VALIDATION_ERROR: Title cannot be empty".to_string(), data: None });
    }
    if language.trim().is_empty() {
        return Ok(SnippetResponse { success: false, message: "VALIDATION_ERROR: Language selection required".to_string(), data: None });
    }

    // 2. Validation: Size (Max 500KB)
    if content.len() > 512 * 1024 {
        return Ok(SnippetResponse { success: false, message: "VALIDATION_ERROR: Snippet size exceeds 512KB limit".to_string(), data: None });
    }

    // 3. Validation: Duplicate Title
    let exists: bool = conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM snippets WHERE user_id = ? AND title = ? AND is_archived = 0 AND deleted_at IS NULL)",
        rusqlite::params![user_id, title],
        |row| row.get(0)
    ).unwrap_or(false);

    if exists {
        return Ok(SnippetResponse { success: false, message: "TITLE_ALREADY_EXISTS".to_string(), data: None });
    }
    
    let detected_patterns = crate::patterns::get_pattern_tags_json(&content);
    
    let mut conn = get_db_connection(&app_handle)?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    match tx.execute(
        "INSERT INTO snippets (user_id, title, content, language, tags, detected_patterns, project_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
        rusqlite::params![user_id, title, content, language, tags, detected_patterns, project_id],
    ) {
        Ok(_) => {
            let snippet_id = tx.last_insert_rowid() as i32;
            
            // Sync tags to metadata tables
            if let Some(ref t) = tags {
                if let Err(e) = sync_snippet_metadata(&tx, snippet_id, user_id, t) {
                    println!("Failed to sync metadata: {}", e);
                }
            }
            
            tx.commit().map_err(|e| e.to_string())?;
            
            // Invalidate cache on write
            state.snippet_cache.remove(&user_id);
            Ok(SnippetResponse {
                success: true,
                message: "Snippet created successfully".to_string(),
                data: None,
            })
        },
        Err(e) => Ok(SnippetResponse {
            success: false,
            message: format!("INTERNAL_ERROR: {}", e),
            data: None,
        }),
    }
}

#[tauri::command]
pub fn validate_snippet_title(app_handle: AppHandle, user_id: i32, title: String, exclude_id: Option<i32>) -> Result<bool, String> {
    let conn = get_db_connection(&app_handle)?;
    let exists: bool = if let Some(id) = exclude_id {
        conn.query_row(
            "SELECT EXISTS(SELECT 1 FROM snippets WHERE user_id = ? AND title = ? AND id != ? AND is_archived = 0 AND deleted_at IS NULL)",
            rusqlite::params![user_id, title, id],
            |row| row.get(0)
        ).unwrap_or(false)
    } else {
        conn.query_row(
            "SELECT EXISTS(SELECT 1 FROM snippets WHERE user_id = ? AND title = ? AND is_archived = 0 AND deleted_at IS NULL)",
            rusqlite::params![user_id, title],
            |row| row.get(0)
        ).unwrap_or(false)
    };
    Ok(exists)
}

#[tauri::command]
pub fn list_snippets(
    app_handle: AppHandle,
    state: State<'_, AppState>,
    user_id: i32,
    include_archived: bool,
    include_deleted: Option<bool>,
    bypass_cache: Option<bool>,
    limit: Option<i32>,
    offset: Option<i32>,
    load_content: Option<bool>
) -> Result<SnippetResponse, String> {
    let show_trash = include_deleted.unwrap_or(false);
    let should_load_content = load_content.unwrap_or(true);

    // Basic cache check (only for main list, not archived/deleted for simplicity)
    if !include_archived && !show_trash && !bypass_cache.unwrap_or(false) && limit.is_none() && offset.is_none() && should_load_content {
        if let Some(cached) = state.snippet_cache.get(&user_id) {
            return Ok(SnippetResponse {
                success: true,
                message: "Snippets retrieved from cache".to_string(),
                data: Some(cached.clone()),
            });
        }
    }

    let t0 = Instant::now();
    let conn = get_db_connection(&app_handle)?;
    
    let mut query = if should_load_content {
        "SELECT id, user_id, project_id, title, content, language, tags, is_archived, is_favorite, deleted_at, copy_count, edit_count, detected_patterns, impressions, clicks, last_used_at, archive_snoozed_until, created_at, updated_at FROM snippets WHERE user_id = ?".to_string()
    } else {
        "SELECT id, user_id, project_id, title, NULL as content, language, tags, is_archived, is_favorite, deleted_at, copy_count, edit_count, detected_patterns, impressions, clicks, last_used_at, archive_snoozed_until, created_at, updated_at FROM snippets WHERE user_id = ?".to_string()
    };

    if show_trash {
        query.push_str(" AND deleted_at IS NOT NULL");
    } else {
        query.push_str(" AND deleted_at IS NULL");
        if !include_archived {
            query.push_str(" AND is_archived = 0");
        }
    }
    
    query.push_str(" ORDER BY updated_at DESC");

    if let Some(l) = limit {
        query.push_str(&format!(" LIMIT {}", l));
    }
    if let Some(o) = offset {
        query.push_str(&format!(" OFFSET {}", o));
    }

    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;

    let snippet_iter = stmt.query_map([user_id], |row| {
        Ok(Snippet {
            id: Some(row.get(0)?),
            user_id: row.get(1)?,
            project_id: row.get(2)?,
            title: row.get(3)?,
            content: row.get(4)?,
            language: row.get(5)?,
            tags: row.get(6)?,
            is_archived: row.get(7)?,
            is_favorite: row.get(8)?,
            deleted_at: row.get(9)?,
            copy_count: row.get(10)?,
            edit_count: row.get(11)?,
            detected_patterns: row.get(12)?,
            impressions: row.get(13)?,
            clicks: row.get(14)?,
            last_used_at: row.get(15)?,
            archive_snoozed_until: row.get(16)?,
            created_at: Some(row.get(17)?),
            updated_at: Some(row.get(18)?),
            tag_nodes: None, // Will be populated in the loop
        })
    }).map_err(|e| e.to_string())?;

    let mut snippets = Vec::new();
    for snippet_result in snippet_iter {
        snippets.push(snippet_result.map_err(|e| e.to_string())?);
    }

    // Optimization: Fetch all tags for all returned snippets in ONE query (Avoid N+1)
    if !snippets.is_empty() {
        let ids: Vec<String> = snippets.iter().map(|s| s.id.unwrap().to_string()).collect();
        let id_list = ids.join(",");
        let tag_query = format!("
            SELECT st.snippet_id, t.id, t.user_id, t.name, t.category, t.color, t.created_at
            FROM tags t
            JOIN snippet_tags st ON t.id = st.tag_id
            WHERE st.snippet_id IN ({})
        ", id_list);

        let mut tag_stmt = conn.prepare(&tag_query).map_err(|e| e.to_string())?;
        let tag_map_iter = tag_stmt.query_map([], |row| {
            Ok((
                row.get::<_, i32>(0)?,
                Tag {
                    id: Some(row.get(1)?),
                    user_id: row.get(2)?,
                    name: row.get(3)?,
                    category: row.get(4)?,
                    color: row.get(5)?,
                    created_at: Some(row.get(6)?),
                }
            ))
        }).map_err(|e| e.to_string())?;

        let mut tag_map: std::collections::HashMap<i32, Vec<Tag>> = std::collections::HashMap::new();
        for item in tag_map_iter {
            if let Ok((sid, tag)) = item {
                tag_map.entry(sid).or_insert_with(Vec::new).push(tag);
            }
        }

        for snippet in &mut snippets {
            if let Some(sid) = snippet.id {
                snippet.tag_nodes = tag_map.remove(&sid);
            }
        }
    }

    // Populate cache for main list (only if full list and content loaded)
    if !include_archived && !show_trash && limit.is_none() && should_load_content {
        state.snippet_cache.insert(user_id, snippets.clone());
    }

    // Record telemetry for snippet load time
    let duration_ms = t0.elapsed().as_secs_f64() * 1000.0;
    if let Ok(mut telem) = state.telemetry.lock() {
        telem.record_operation("snippet_load", duration_ms);
    }

    Ok(SnippetResponse {
        success: true,
        message: "Snippets retrieved from database".to_string(),
        data: Some(snippets),
    })
}

#[tauri::command]
pub fn get_snippet_content(app_handle: AppHandle, snippet_id: i32) -> Result<String, String> {
    let conn = get_db_connection(&app_handle)?;
    let content: String = conn.query_row(
        "SELECT content FROM snippets WHERE id = ?",
        [snippet_id],
        |row| row.get(0)
    ).map_err(|e| format!("SNIPPET_NOT_FOUND: {}", e))?;
    
    Ok(content)
}

#[tauri::command]
pub fn purge_snippet_cache_all(state: State<'_, AppState>) -> Result<(), String> {
    state.snippet_cache.clear();
    Ok(())
}

#[tauri::command]
pub fn update_snippet(
    app_handle: AppHandle,
    state: State<'_, AppState>,
    user_id: i32,
    id: i32,
    title: String,
    content: String,
    language: String,
    tags: Option<String>,
    project_id: Option<i32>
) -> Result<SnippetResponse, String> {
    let t0 = Instant::now();
    let mut conn = get_db_connection(&app_handle)?;
    
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    // Get current content to backup into versions table before overriding
    let current_content: String = match tx.query_row(
        "SELECT content FROM snippets WHERE id = ?",
        [id],
        |row| row.get(0)
    ) {
        Ok(c) => c,
        Err(_) => return Ok(SnippetResponse { success: false, message: "Snippet not found".to_string(), data: None })
    };

    // Skip creating a version if the content matches EXACTLY (optional, but good for spam)
    if current_content != content {
        if let Err(e) = tx.execute(
            "INSERT INTO snippet_versions (snippet_id, content) VALUES (?, ?)",
            rusqlite::params![id, current_content],
        ) {
            return Ok(SnippetResponse { success: false, message: format!("Failed to save version backup: {}", e), data: None });
        }
    }

    // 1. Validation: Basic
    if title.trim().is_empty() {
        return Ok(SnippetResponse { success: false, message: "VALIDATION_ERROR: Title cannot be empty".to_string(), data: None });
    }
    if language.trim().is_empty() {
        return Ok(SnippetResponse { success: false, message: "VALIDATION_ERROR: Language selection required".to_string(), data: None });
    }

    // 2. Validation: Size (Max 500KB)
    if content.len() > 512 * 1024 {
        return Ok(SnippetResponse { success: false, message: "VALIDATION_ERROR: Snippet size exceeds 512KB limit".to_string(), data: None });
    }

    // 3. Validation: Duplicate Title
    let exists: bool = tx.query_row(
        "SELECT EXISTS(SELECT 1 FROM snippets WHERE user_id = ? AND title = ? AND id != ? AND is_archived = 0 AND deleted_at IS NULL)",
        rusqlite::params![user_id, title, id],
        |row| row.get(0)
    ).unwrap_or(false);

    if exists {
        return Ok(SnippetResponse { success: false, message: "TITLE_ALREADY_EXISTS".to_string(), data: None });
    }

    // Update main snippet
    let detected_patterns = crate::patterns::get_pattern_tags_json(&content);
    
    tx.execute(
        "UPDATE snippets SET title = ?, content = ?, language = ?, tags = ?, updated_at = CURRENT_TIMESTAMP, edit_count = edit_count + 1, detected_patterns = ?, project_id = ? WHERE id = ? AND user_id = ?",
        rusqlite::params![title, content, language, tags, detected_patterns, project_id, id, user_id]
    ).map_err(|e| e.to_string())?;

    // Sync tags to metadata tables
    if let Some(ref t) = tags {
        let _ = tx.execute("DELETE FROM snippet_tags WHERE snippet_id = ?", [id]);
        if let Err(e) = sync_snippet_metadata(&tx, id, user_id, t) {
            println!("Failed to sync metadata: {}", e);
        }
    }

    if let Err(e) = tx.commit() {
        return Ok(SnippetResponse { success: false, message: format!("CRITICAL_ERROR: {}", e), data: None });
    }
    state.snippet_cache.remove(&user_id);
    // Record save timing
    let duration_ms = t0.elapsed().as_secs_f64() * 1000.0;
    if let Ok(mut telem) = state.telemetry.lock() {
        telem.record_operation("snippet_save", duration_ms);
    }
    Ok(SnippetResponse {
        success: true,
        message: "Snippet updated successfully".to_string(),
        data: None,
    })
}

#[tauri::command]
pub fn delete_snippet(app_handle: AppHandle, state: State<'_, AppState>, user_id: i32, id: i32) -> Result<SnippetResponse, String> {
    let conn = get_db_connection(&app_handle)?;
    
    // Soft delete: set deleted_at to CURRENT_TIMESTAMP
    match conn.execute("UPDATE snippets SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?", [id]) {
        Ok(_) => {
            state.snippet_cache.remove(&user_id);
            Ok(SnippetResponse {
                success: true,
                message: "Snippet moved to trash".to_string(),
                data: None,
            })
        },
        Err(e) => Ok(SnippetResponse {
            success: false,
            message: format!("Failed to move snippet to trash: {}", e),
            data: None,
        }),
    }
}

#[tauri::command]
pub fn restore_snippet(app_handle: AppHandle, state: State<'_, AppState>, user_id: i32, id: i32) -> Result<SnippetResponse, String> {
    let conn = get_db_connection(&app_handle)?;
    
    match conn.execute("UPDATE snippets SET deleted_at = NULL WHERE id = ?", [id]) {
        Ok(_) => {
            state.snippet_cache.remove(&user_id);
            Ok(SnippetResponse {
                success: true,
                message: "Snippet restored successfully".to_string(),
                data: None,
            })
        },
        Err(e) => Ok(SnippetResponse {
            success: false,
            message: format!("Failed to restore snippet: {}", e),
            data: None,
        }),
    }
}

#[tauri::command]
pub fn permanently_delete_snippet(app_handle: AppHandle, state: State<'_, AppState>, user_id: i32, id: i32) -> Result<SnippetResponse, String> {
    let conn = get_db_connection(&app_handle)?;
    
    match conn.execute("DELETE FROM snippets WHERE id = ?", [id]) {
        Ok(_) => {
            state.snippet_cache.remove(&user_id);
            Ok(SnippetResponse {
                success: true,
                message: "Snippet permanently deleted".to_string(),
                data: None,
            })
        },
        Err(e) => Ok(SnippetResponse {
            success: false,
            message: format!("Failed to permanently delete snippet: {}", e),
            data: None,
        }),
    }
}

#[tauri::command]
pub fn toggle_favorite(app_handle: AppHandle, state: State<'_, AppState>, user_id: i32, id: i32, favorite: bool) -> Result<SnippetResponse, String> {
    let conn = get_db_connection(&app_handle)?;
    
    match conn.execute("UPDATE snippets SET is_favorite = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", rusqlite::params![favorite, id]) {
        Ok(_) => {
            state.snippet_cache.remove(&user_id);
            Ok(SnippetResponse {
                success: true,
                message: if favorite { "Snippet added to favorites" } else { "Snippet removed from favorites" }.to_string(),
                data: None,
            })
        },
        Err(e) => Ok(SnippetResponse {
            success: false,
            message: format!("Failed to toggle favorite status: {}", e),
            data: None,
        }),
    }
}

#[tauri::command]
pub fn toggle_archive(app_handle: AppHandle, state: State<'_, AppState>, user_id: i32, id: i32, archive: bool) -> Result<SnippetResponse, String> {
    let conn = get_db_connection(&app_handle)?;
    
    match conn.execute("UPDATE snippets SET is_archived = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", rusqlite::params![archive, id]) {
        Ok(_) => {
            state.snippet_cache.remove(&user_id);
            Ok(SnippetResponse {
                success: true,
                message: if archive { "Snippet archived" } else { "Snippet restored" }.to_string(),
                data: None,
            })
        },
        Err(e) => Ok(SnippetResponse {
            success: false,
            message: format!("Failed to toggle archive status: {}", e),
            data: None,
        }),
    }
}

#[tauri::command]
pub fn archive_snippet(app_handle: AppHandle, state: State<'_, AppState>, user_id: i32, id: i32) -> Result<SnippetResponse, String> {
    toggle_archive(app_handle, state, user_id, id, true)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VersionResponse {
    pub success: bool,
    pub message: String,
    pub data: Option<Vec<SnippetVersion>>,
}

#[tauri::command]
pub fn get_snippet_versions(app_handle: AppHandle, snippet_id: i32) -> Result<VersionResponse, String> {
    let conn = get_db_connection(&app_handle)?;
    
    let mut stmt = conn.prepare("SELECT id, snippet_id, content, created_at FROM snippet_versions WHERE snippet_id = ? ORDER BY created_at DESC").map_err(|e| e.to_string())?;

    let version_iter = stmt.query_map([snippet_id], |row| {
        Ok(SnippetVersion {
            id: row.get(0)?,
            snippet_id: row.get(1)?,
            content: row.get(2)?,
            created_at: row.get(3)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut versions = Vec::new();
    for v in version_iter {
        versions.push(v.map_err(|e| e.to_string())?);
    }

    Ok(VersionResponse {
        success: true,
        message: "Versions retrieved".to_string(),
        data: Some(versions),
    })
}

#[tauri::command]
pub fn rollback_snippet(
    app_handle: AppHandle,
    state: State<'_, AppState>,
    user_id: i32,
    snippet_id: i32,
    version_id: i32
) -> Result<SnippetResponse, String> {
    let mut conn = get_db_connection(&app_handle)?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    // Get rollback content
    let rollback_content: String = match tx.query_row(
        "SELECT content FROM snippet_versions WHERE id = ?",
        [version_id],
        |row| row.get(0)
    ) {
        Ok(c) => c,
        Err(_) => return Ok(SnippetResponse { success: false, message: "Target version not found".to_string(), data: None })
    };

    // Get current content
    let current_content: String = match tx.query_row(
        "SELECT content FROM snippets WHERE id = ?",
        [snippet_id],
        |row| row.get(0)
    ) {
        Ok(c) => c,
        Err(_) => return Ok(SnippetResponse { success: false, message: "Snippet not found".to_string(), data: None })
    };

    // Backup current before rollback
    if let Err(e) = tx.execute(
        "INSERT INTO snippet_versions (snippet_id, content) VALUES (?, ?)",
        rusqlite::params![snippet_id, current_content],
    ) {
        return Ok(SnippetResponse { success: false, message: format!("Failed to backup current state: {}", e), data: None });
    }

    // Overwrite snippet
    if let Err(e) = tx.execute(
        "UPDATE snippets SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        rusqlite::params![rollback_content, snippet_id],
    ) {
        return Ok(SnippetResponse { success: false, message: format!("Failed to apply rollback: {}", e), data: None });
    }

    if let Err(e) = tx.commit() {
        return Ok(SnippetResponse { success: false, message: format!("Transaction commit failed: {}", e), data: None });
    }

    state.snippet_cache.remove(&user_id);
    Ok(SnippetResponse {
        success: true,
        message: "Rollback successful".to_string(),
        data: None,
    })
}

#[tauri::command]
pub fn record_snippet_usage(app_handle: AppHandle, state: State<'_, AppState>, snippet_id: i32) -> Result<(), String> {
    let conn = get_db_connection(&app_handle)?;
    
    // 1. Get user_id from snippet_id
    let user_id: i32 = conn.query_row(
        "SELECT user_id FROM snippets WHERE id = ?",
        [snippet_id],
        |row| row.get(0)
    ).map_err(|e| e.to_string())?;

    // 2. Record sequence tracking (if last accessed differs)
    if let Some(last_id) = state.last_accessed_map.get(&user_id) {
        let last_id = *last_id;
        if last_id != snippet_id {
            // Check if sequence exists
            let exists: bool = conn.query_row(
                "SELECT EXISTS(SELECT 1 FROM snippet_usage_sequences WHERE user_id = ? AND from_id = ? AND to_id = ?)",
                rusqlite::params![user_id, last_id, snippet_id],
                |row| row.get(0)
            ).unwrap_or(false);

            if exists {
                conn.execute(
                    "UPDATE snippet_usage_sequences SET count = count + 1, last_used = CURRENT_TIMESTAMP WHERE user_id = ? AND from_id = ? AND to_id = ?",
                    rusqlite::params![user_id, last_id, snippet_id]
                ).map_err(|e| e.to_string())?;
            } else {
                conn.execute(
                    "INSERT INTO snippet_usage_sequences (user_id, from_id, to_id, count) VALUES (?, ?, ?, 1)",
                    rusqlite::params![user_id, last_id, snippet_id]
                ).map_err(|e| e.to_string())?;
            }
        }
    }

    // 3. Update last accessed session cache
    state.last_accessed_map.insert(user_id, snippet_id);

    // 4. Update snippet usage metrics
    conn.execute(
        "UPDATE snippets SET copy_count = copy_count + 1, last_used_at = CURRENT_TIMESTAMP WHERE id = ?",
        [snippet_id]
    ).map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO activity_log (snippet_id, event_type) VALUES (?, 'COPY')",
        [snippet_id]
    ).map_err(|e| e.to_string())?;

    // 5. Invalidate cache so list_snippets picks up the new copy_count
    state.snippet_cache.remove(&user_id);

    Ok(())
}

#[tauri::command]
pub fn get_analytics_summary(app_handle: AppHandle, state: State<'_, AppState>, user_id: i32) -> Result<AnalyticsSummary, String> {
    let conn = get_db_connection(&app_handle)?;

    // 1. Global Copies
    let global_copies: i32 = conn.query_row(
        "SELECT SUM(copy_count) FROM snippets WHERE user_id = ?",
        [user_id],
        |row| row.get(0)
    ).unwrap_or(0);

    // 2. Last Entry
    let (last_entry, last_entry_time): (String, Option<String>) = conn.query_row(
        "SELECT title, created_at FROM snippets WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
        [user_id],
        |row| Ok((row.get(0)?, row.get(1).unwrap_or(None)))
    ).unwrap_or_else(|_| ("No entries".to_string(), None));

    // 3. Activity (Hourly buckets for last 24h)
    let mut stmt = conn.prepare("
        SELECT strftime('%H:00', timestamp) as hour, COUNT(*) as count 
        FROM activity_log 
        WHERE timestamp > datetime('now', '-24 hours')
        GROUP BY hour
        ORDER BY hour ASC
    ").map_err(|e| e.to_string())?;
    
    let activity_iter = stmt.query_map([], |row| {
        Ok(ActivityData {
            hour: row.get(0)?,
            count: row.get(1)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut activity = Vec::new();
    for a in activity_iter {
        activity.push(a.map_err(|e| e.to_string())?);
    }

    // 4. Ledger (Top 5 popular snippets)
    let mut stmt = conn.prepare("
        SELECT id, user_id, project_id, title, content, language, tags, is_archived, is_favorite, deleted_at, copy_count, edit_count, detected_patterns, impressions, clicks, last_used_at, archive_snoozed_until, created_at, updated_at 
        FROM snippets 
        WHERE user_id = ? AND deleted_at IS NULL
        ORDER BY copy_count DESC 
        LIMIT 5
    ").map_err(|e| e.to_string())?;

    let ledger_iter = stmt.query_map([user_id], |row| {
        Ok(Snippet {
            id: Some(row.get(0)?),
            user_id: row.get(1)?,
            project_id: row.get(2)?,
            title: row.get(3)?,
            content: row.get(4)?,
            language: row.get(5)?,
            tags: row.get(6)?,
            is_archived: row.get(7)?,
            is_favorite: row.get(8)?,
            deleted_at: row.get(9)?,
            copy_count: row.get(10)?,
            edit_count: row.get(11)?,
            detected_patterns: row.get(12)?,
            impressions: row.get(13)?,
            clicks: row.get(14)?,
            last_used_at: row.get(15)?,
            archive_snoozed_until: row.get(16)?,
            created_at: Some(row.get(17)?),
            updated_at: Some(row.get(18)?),
            tag_nodes: None,
        })
    }).map_err(|e| e.to_string())?;

    let mut ledger = Vec::new();
    for s in ledger_iter {
        ledger.push(s.map_err(|e| e.to_string())?);
    }

    // 5. Resource Usage & Storage
    let resource_usage = state.telemetry.lock().map(|t| t.get_snapshot().latest_resource).unwrap_or(None);
    
    let db_path = app_handle.path().app_data_dir().map_err(|e: tauri::Error| e.to_string())?.join("coda.db");
    let db_size_bytes = std::fs::metadata(db_path).map(|m| m.len()).unwrap_or(0);

    // 6. Copy Growth (Month-over-Month)
    let this_month: i32 = conn.query_row(
        "SELECT COUNT(*) FROM activity_log WHERE event_type = 'COPY' AND timestamp > datetime('now', 'start of month')",
        [],
        |row| row.get(0)
    ).unwrap_or(0);
    
    let last_month: i32 = conn.query_row(
        "SELECT COUNT(*) FROM activity_log WHERE event_type = 'COPY' AND timestamp BETWEEN datetime('now', 'start of month', '-1 month') AND datetime('now', 'start of month')",
        [],
        |row| row.get(0)
    ).unwrap_or(0);

    let copy_growth = if last_month > 0 {
        ((this_month as f64 - last_month as f64) / last_month as f64) * 100.0
    } else if this_month > 0 {
        100.0
    } else {
        0.0
    };
    let db_query_ms = state.telemetry.lock().map(|t| t.get_snapshot().db_query_ms).unwrap_or(Some(0.0)).unwrap_or(0.0);

    // 7. Efficiency & Buffer Status Calculation
    let total_all: i32 = conn.query_row(
        "SELECT COUNT(*) FROM snippets WHERE user_id = ?",
        [user_id],
        |row| row.get(0)
    ).unwrap_or(0);

    let (efficiency, buffer_status) = if total_all > 0 {
        let active_count: i32 = conn.query_row(
            "SELECT COUNT(*) FROM snippets WHERE user_id = ? AND deleted_at IS NULL",
            [user_id],
            |row| row.get(0)
        ).unwrap_or(0);

        let organized_count: i32 = conn.query_row(
            "SELECT COUNT(*) FROM snippets WHERE user_id = ? AND project_id IS NOT NULL AND deleted_at IS NULL",
            [user_id],
            |row| row.get(0)
        ).unwrap_or(0);

        let tagged_count: i32 = conn.query_row(
            "SELECT COUNT(*) FROM snippets WHERE user_id = ? AND (tags IS NOT NULL OR id IN (SELECT snippet_id FROM snippet_tags)) AND deleted_at IS NULL",
            [user_id],
            |row| row.get(0)
        ).unwrap_or(0);

        // Efficiency components (weighted)
        let cleanliness_score = (active_count as f64 / total_all as f64) * 40.0;
        let organization_score = (organized_count as f64 / active_count.max(1) as f64) * 30.0;
        let tagging_score = (tagged_count as f64 / active_count.max(1) as f64) * 30.0;

        let mut final_efficiency = cleanliness_score + organization_score + tagging_score;
        
        // Performance penalty (DB query time)
        if db_query_ms > 50.0 {
            final_efficiency -= (db_query_ms - 50.0) / 10.0;
        }

        let status = if final_efficiency > 90.0 {
            "STABLE"
        } else if final_efficiency > 75.0 {
            "OPTIMAL"
        } else if final_efficiency > 50.0 {
            "DEGRADED"
        } else {
            "CRITICAL"
        };

        (final_efficiency.clamp(0.0, 100.0), status.to_string())
    } else {
        (100.0, "STABLE".to_string())
    };

    Ok(AnalyticsSummary {
        global_copies,
        last_entry,
        last_entry_time,
        activity,
        ledger,
        resource_usage,
        db_query_ms,
        copy_growth,
        db_size_bytes,
        efficiency,
        buffer_status,
    })
}

#[tauri::command]
pub fn create_tag(app_handle: AppHandle, user_id: i32, name: String, category: Option<String>, color: Option<String>) -> Result<TagResponse, String> {
    let conn = get_db_connection(&app_handle)?;
    match conn.execute(
        "INSERT INTO tags (user_id, name, category, color) VALUES (?, ?, ?, ?)",
        rusqlite::params![user_id, name, category, color],
    ) {
        Ok(_) => Ok(TagResponse { success: true, message: "Tag created".to_string(), data: None }),
        Err(e) => Ok(TagResponse { success: false, message: format!("Failed to create tag: {}", e), data: None }),
    }
}

#[tauri::command]
pub fn list_tags(app_handle: AppHandle, user_id: i32) -> Result<TagResponse, String> {
    let conn = get_db_connection(&app_handle)?;
    let mut stmt = conn.prepare("SELECT id, user_id, name, category, color, created_at FROM tags WHERE user_id = ? ORDER BY name ASC").map_err(|e| e.to_string())?;
    let tag_iter = stmt.query_map([user_id], |row| {
        Ok(Tag {
            id: Some(row.get(0)?),
            user_id: row.get(1)?,
            name: row.get(2)?,
            category: row.get(3)?,
            color: row.get(4)?,
            created_at: Some(row.get(5)?),
        })
    }).map_err(|e| e.to_string())?;

    let mut tags = Vec::new();
    for tag in tag_iter {
        tags.push(tag.map_err(|e| e.to_string())?);
    }
    Ok(TagResponse { success: true, message: "Tags retrieved".to_string(), data: Some(tags) })
}

#[tauri::command]
pub fn update_tag(app_handle: AppHandle, id: i32, name: String, category: Option<String>, color: Option<String>) -> Result<TagResponse, String> {
    let conn = get_db_connection(&app_handle)?;
    match conn.execute(
        "UPDATE tags SET name = ?, category = ?, color = ? WHERE id = ?",
        rusqlite::params![name, category, color, id],
    ) {
        Ok(_) => Ok(TagResponse { success: true, message: "Tag updated".to_string(), data: None }),
        Err(e) => Ok(TagResponse { success: false, message: format!("Failed to update tag: {}", e), data: None }),
    }
}

#[tauri::command]
pub fn delete_tag(app_handle: AppHandle, id: i32) -> Result<TagResponse, String> {
    let conn = get_db_connection(&app_handle)?;
    match conn.execute("DELETE FROM tags WHERE id = ?", [id]) {
        Ok(_) => Ok(TagResponse { success: true, message: "Tag deleted".to_string(), data: None }),
        Err(e) => Ok(TagResponse { success: false, message: format!("Failed to delete tag: {}", e), data: None }),
    }
}

#[tauri::command]
pub fn add_tag_to_snippet(app_handle: AppHandle, snippet_id: i32, tag_id: i32) -> Result<SnippetResponse, String> {
    let conn = get_db_connection(&app_handle)?;
    match conn.execute("INSERT OR IGNORE INTO snippet_tags (snippet_id, tag_id) VALUES (?, ?)", [snippet_id, tag_id]) {
        Ok(_) => Ok(SnippetResponse { success: true, message: "Tag added to snippet".to_string(), data: None }),
        Err(e) => Ok(SnippetResponse { success: false, message: format!("Failed to add tag: {}", e), data: None }),
    }
}

#[tauri::command]
pub fn remove_tag_from_snippet(app_handle: AppHandle, snippet_id: i32, tag_id: i32) -> Result<SnippetResponse, String> {
    let conn = get_db_connection(&app_handle)?;
    match conn.execute("DELETE FROM snippet_tags WHERE snippet_id = ? AND tag_id = ?", [snippet_id, tag_id]) {
        Ok(_) => Ok(SnippetResponse { success: true, message: "Tag removed from snippet".to_string(), data: None }),
        Err(e) => Ok(SnippetResponse { success: false, message: format!("Failed to remove tag: {}", e), data: None }),
    }
}

#[tauri::command]
pub fn purge_snippet_cache(state: tauri::State<'_, crate::AppState>) -> Result<(), String> {
    state.snippet_cache.clear();
    Ok(())
}

fn sync_snippet_metadata(conn: &rusqlite::Connection, snippet_id: i32, user_id: i32, tags_str: &str) -> Result<(), rusqlite::Error> {
    let tags: Vec<&str> = tags_str.split(',')
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .collect();

    for tag_name in tags {
        let tag_name_upper = tag_name.to_uppercase();
        
        // 1. Ensure tag exists in 'tags' table
        conn.execute(
            "INSERT OR IGNORE INTO tags (user_id, name, category, color) VALUES (?, ?, ?, ?)",
            rusqlite::params![user_id, tag_name_upper, "GENERAL", "var(--accent)"],
        )?;

        // 2. Get the tag id
        let tag_id: i32 = conn.query_row(
            "SELECT id FROM tags WHERE user_id = ? AND name = ?",
            rusqlite::params![user_id, tag_name_upper],
            |row| row.get(0),
        )?;

        // 3. Link tag to snippet
        conn.execute(
            "INSERT OR IGNORE INTO snippet_tags (snippet_id, tag_id) VALUES (?, ?)",
            rusqlite::params![snippet_id, tag_id],
        )?;
    }
    Ok(())
}

#[tauri::command]
pub fn sync_all_metadata(app_handle: AppHandle, user_id: i32) -> Result<SnippetResponse, String> {
    let conn = get_db_connection(&app_handle)?;
    
    let mut stmt = conn.prepare("SELECT id, tags FROM snippets WHERE user_id = ? AND tags IS NOT NULL AND tags != ''")
        .map_err(|e| e.to_string())?;
        
    let snippet_iter = stmt.query_map([user_id], |row| {
        Ok((row.get::<_, i32>(0)?, row.get::<_, String>(1)?))
    }).map_err(|e| e.to_string())?;

    for snippet in snippet_iter {
        let (id, tags_str) = snippet.map_err(|e| e.to_string())?;
        sync_snippet_metadata(&conn, id, user_id, &tags_str).map_err(|e| e.to_string())?;
    }

    Ok(SnippetResponse {
        success: true,
        message: "METADATA_SYNCHRONIZATION_COMPLETE".to_string(),
        data: None,
    })
}
