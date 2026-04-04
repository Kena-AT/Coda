use serde::{Deserialize, Serialize};
use crate::db::get_db_connection;
use tauri::{AppHandle, State};
use crate::AppState;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Snippet {
    pub id: Option<i32>,
    pub user_id: i32,
    pub title: String,
    pub content: String,
    pub language: String,
    pub tags: Option<String>,
    pub is_archived: bool,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SnippetResponse {
    pub success: bool,
    pub message: String,
    pub data: Option<Vec<Snippet>>,
}

#[tauri::command]
pub fn create_snippet(
    app_handle: AppHandle,
    state: State<'_, AppState>,
    user_id: i32,
    title: String,
    content: String,
    language: String,
    tags: Option<String>
) -> Result<SnippetResponse, String> {
    let conn = get_db_connection(&app_handle)?;
    
    match conn.execute(
        "INSERT INTO snippets (user_id, title, content, language, tags) VALUES (?, ?, ?, ?, ?)",
        rusqlite::params![user_id, title, content, language, tags],
    ) {
        Ok(_) => {
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
            message: format!("Failed to create snippet: {}", e),
            data: None,
        }),
    }
}

#[tauri::command]
pub fn list_snippets(
    app_handle: AppHandle,
    state: State<'_, AppState>,
    user_id: i32,
    include_archived: bool
) -> Result<SnippetResponse, String> {
    // Basic cache check (only for main list, not archived for simplicity)
    if !include_archived {
        if let Some(cached) = state.snippet_cache.get(&user_id) {
            return Ok(SnippetResponse {
                success: true,
                message: "Snippets retrieved from cache".to_string(),
                data: Some(cached.clone()),
            });
        }
    }

    let conn = get_db_connection(&app_handle)?;
    
    let mut stmt = if include_archived {
        conn.prepare("SELECT id, user_id, title, content, language, tags, is_archived, created_at, updated_at FROM snippets WHERE user_id = ? ORDER BY updated_at DESC")
    } else {
        conn.prepare("SELECT id, user_id, title, content, language, tags, is_archived, created_at, updated_at FROM snippets WHERE user_id = ? AND is_archived = 0 ORDER BY updated_at DESC")
    }.map_err(|e| e.to_string())?;

    let snippet_iter = stmt.query_map([user_id], |row| {
        Ok(Snippet {
            id: Some(row.get(0)?),
            user_id: row.get(1)?,
            title: row.get(2)?,
            content: row.get(3)?,
            language: row.get(4)?,
            tags: row.get(5)?,
            is_archived: row.get(6)?,
            created_at: Some(row.get(7)?),
            updated_at: Some(row.get(8)?),
        })
    }).map_err(|e| e.to_string())?;

    let mut snippets = Vec::new();
    for snippet in snippet_iter {
        snippets.push(snippet.map_err(|e| e.to_string())?);
    }

    // Populate cache for main list
    if !include_archived {
        state.snippet_cache.insert(user_id, snippets.clone());
    }

    Ok(SnippetResponse {
        success: true,
        message: "Snippets retrieved from database".to_string(),
        data: Some(snippets),
    })
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
    tags: Option<String>
) -> Result<SnippetResponse, String> {
    let conn = get_db_connection(&app_handle)?;
    
    match conn.execute(
        "UPDATE snippets SET title = ?, content = ?, language = ?, tags = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        rusqlite::params![title, content, language, tags, id],
    ) {
        Ok(_) => {
            state.snippet_cache.remove(&user_id);
            Ok(SnippetResponse {
                success: true,
                message: "Snippet updated successfully".to_string(),
                data: None,
            })
        },
        Err(e) => Ok(SnippetResponse {
            success: false,
            message: format!("Failed to update snippet: {}", e),
            data: None,
        }),
    }
}

#[tauri::command]
pub fn delete_snippet(app_handle: AppHandle, state: State<'_, AppState>, user_id: i32, id: i32) -> Result<SnippetResponse, String> {
    let conn = get_db_connection(&app_handle)?;
    
    match conn.execute("DELETE FROM snippets WHERE id = ?", [id]) {
        Ok(_) => {
            state.snippet_cache.remove(&user_id);
            Ok(SnippetResponse {
                success: true,
                message: "Snippet deleted successfully".to_string(),
                data: None,
            })
        },
        Err(e) => Ok(SnippetResponse {
            success: false,
            message: format!("Failed to delete snippet: {}", e),
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
