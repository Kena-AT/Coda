use tauri::AppHandle;
use serde::{Deserialize, Serialize};
use crate::db::get_db_connection;
// Removed unused AppState
use rusqlite::OptionalExtension;

#[derive(Debug, Serialize, Deserialize)]
pub struct Project {
    pub id: Option<i32>,
    pub user_id: i32,
    pub name: String,
    pub description: Option<String>,
    pub color: Option<String>,
    pub created_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProjectStats {
    pub active_snippets: i32,
    pub stale_snippets: i32,
    pub languages: Vec<String>,
    pub most_used_snippet: Option<String>,
    pub last_activity: Option<String>,
}

#[derive(Serialize)]
pub struct ProjectResponse {
    pub success: bool,
    pub message: String,
    pub data: Option<Vec<Project>>,
}

#[tauri::command]
pub fn create_project(
    app_handle: AppHandle,
    user_id: i32,
    name: String,
    description: Option<String>,
    color: Option<String>,
) -> Result<ProjectResponse, String> {
    let conn = get_db_connection(&app_handle)?;
    
    match conn.execute(
        "INSERT INTO projects (user_id, name, description, color) VALUES (?, ?, ?, ?)",
        rusqlite::params![user_id, name, description, color],
    ) {
        Ok(_) => {
            let id = conn.last_insert_rowid() as i32;
            let project = Project {
                id: Some(id),
                user_id,
                name,
                description,
                color,
                created_at: Some(chrono::Utc::now().to_rfc3339()),
            };
            Ok(ProjectResponse {
                success: true,
                message: "Project created successfully".to_string(),
                data: Some(vec![project]),
            })
        },
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn list_projects(
    app_handle: AppHandle,
    user_id: i32
) -> Result<ProjectResponse, String> {
    let conn = get_db_connection(&app_handle)?;
    
    let mut stmt = conn.prepare("SELECT id, user_id, name, description, color, created_at FROM projects WHERE user_id = ? ORDER BY name ASC")
        .map_err(|e| e.to_string())?;
        
    let project_iter = stmt.query_map([user_id], |row| {
        Ok(Project {
            id: Some(row.get(0)?),
            user_id: row.get(1)?,
            name: row.get(2)?,
            description: row.get(3)?,
            color: row.get(4)?,
            created_at: row.get(5)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut projects = Vec::new();
    for p in project_iter {
        projects.push(p.map_err(|e| e.to_string())?);
    }

    Ok(ProjectResponse {
        success: true,
        message: "Projects retrieved successfully".to_string(),
        data: Some(projects),
    })
}

#[tauri::command]
pub fn update_project(
    app_handle: AppHandle,
    id: i32,
    user_id: i32,
    name: String,
    description: Option<String>,
    color: Option<String>,
) -> Result<ProjectResponse, String> {
    let conn = get_db_connection(&app_handle)?;
    
    match conn.execute(
        "UPDATE projects SET name = ?, description = ?, color = ? WHERE id = ? AND user_id = ?",
        rusqlite::params![name, description, color, id, user_id],
    ) {
        Ok(_) => {
            let project = Project {
                id: Some(id),
                user_id,
                name,
                description,
                color,
                created_at: None, // We don't necessarily need to return it here
            };
            Ok(ProjectResponse {
                success: true,
                message: "Project updated successfully".to_string(),
                data: Some(vec![project]),
            })
        },
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn delete_project(
    app_handle: AppHandle,
    id: i32,
    user_id: i32
) -> Result<ProjectResponse, String> {
    let conn = get_db_connection(&app_handle)?;
    
    // Safety check: snippets tied to this project will have project_id set to NULL due to ON DELETE SET NULL
    match conn.execute("DELETE FROM projects WHERE id = ? AND user_id = ?", [id, user_id]) {
        Ok(_) => Ok(ProjectResponse {
            success: true,
            message: "Project deleted successfully. Associated snippets are now uncategorized.".to_string(),
            data: None,
        }),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn get_project_stats(
    app_handle: AppHandle,
    project_id: i32,
    user_id: i32
) -> Result<ProjectStats, String> {
    let conn = get_db_connection(&app_handle)?;
    
    // 1. Active vs Stale
    let active_snippets: i32 = conn.query_row(
        "SELECT COUNT(*) FROM snippets WHERE project_id = ? AND user_id = ? AND is_archived = 0",
        [project_id, user_id],
        |row| row.get(0)
    ).unwrap_or(0);

    let stale_snippets: i32 = conn.query_row(
        "SELECT COUNT(*) FROM snippets WHERE project_id = ? AND user_id = ? AND is_archived = 1",
        [project_id, user_id],
        |row| row.get(0)
    ).unwrap_or(0);

    // 2. Languages
    let mut stmt = conn.prepare("SELECT DISTINCT language FROM snippets WHERE project_id = ? AND user_id = ?")
        .map_err(|e| e.to_string())?;
    let lang_iter = stmt.query_map([project_id, user_id], |row| row.get::<_, String>(0))
        .map_err(|e| e.to_string())?;
    let mut languages = Vec::new();
    for l in lang_iter {
        languages.push(l.map_err(|e| e.to_string())?);
    }

    // 3. Most used snippet
    let most_used_snippet: Option<String> = conn.query_row(
        "SELECT title FROM snippets WHERE project_id = ? AND user_id = ? ORDER BY copy_count DESC LIMIT 1",
        [project_id, user_id],
        |row| row.get::<_, String>(0)
    ).optional().map_err(|e: rusqlite::Error| e.to_string())?;

    // 4. Last activity
    let last_activity: Option<String> = conn.query_row(
        "SELECT updated_at FROM snippets WHERE project_id = ? AND user_id = ? ORDER BY updated_at DESC LIMIT 1",
        [project_id, user_id],
        |row| row.get::<_, String>(0)
    ).optional().map_err(|e: rusqlite::Error| e.to_string())?;

    Ok(ProjectStats {
        active_snippets,
        stale_snippets,
        languages,
        most_used_snippet,
        last_activity,
    })
}
