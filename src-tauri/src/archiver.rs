use tauri::{AppHandle, State};
use serde::{Deserialize, Serialize};
use crate::db::get_db_connection;
use crate::AppState;
use crate::telemetry::TaskState;
// Snippet not used in this file
use rusqlite::OptionalExtension;

#[derive(Debug, Serialize, Deserialize)]
pub struct ArchiveCandidate {
    pub snippet_id: i32,
    pub title: String,
    pub project_name: Option<String>,
    pub days_unused: i32,
    pub copy_count: i32,
    pub archive_score: i32,
    pub reason: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ArchiverSettings {
    pub auto_archive_days: i32,
    pub exclude_favorites: bool,
    pub min_copy_threshold: i32,
}

#[tauri::command]
pub fn get_archive_candidates(
    app_handle: AppHandle,
    state: State<'_, AppState>,
    user_id: i32
) -> Result<Vec<ArchiveCandidate>, String> {
    // 0. Instrument Task Start
    {
        if let Ok(mut store) = state.telemetry.lock() {
            store.update_task_state("maintenance", TaskState::Running, None);
        }
    }

    let conn = get_db_connection(&app_handle)?;
    
    // 1. Get User Settings
    let settings: ArchiverSettings = conn.query_row(
        "SELECT auto_archive_days, exclude_favorites, min_copy_threshold FROM user_settings WHERE user_id = ?",
        [user_id],
        |row| Ok(ArchiverSettings {
            auto_archive_days: row.get(0)?,
            exclude_favorites: row.get(1)?,
            min_copy_threshold: row.get(2)?,
        })
    ).optional().map_err(|e| e.to_string())?.unwrap_or(ArchiverSettings {
        auto_archive_days: 30,
        exclude_favorites: true,
        min_copy_threshold: 10,
    });

    if settings.auto_archive_days <= 0 {
        return Ok(Vec::new()); // Feature disabled
    }

    // 2. Fetch non-archived snippets
    let mut stmt = conn.prepare("
        SELECT id, title, project_id, last_used_at, copy_count, created_at, tags, archive_snoozed_until
        FROM snippets 
        WHERE user_id = ? AND is_archived = 0
    ").map_err(|e| e.to_string())?;

    let candidates_iter = stmt.query_map([user_id], |row| {
        Ok((
            row.get::<_, i32>(0)?, 
            row.get::<_, String>(1)?, 
            row.get::<_, Option<i32>>(2)?,
            row.get::<_, Option<String>>(3)?,
            row.get::<_, i32>(4)?,
            row.get::<_, Option<String>>(5)?,
            row.get::<_, Option<String>>(6)?,
            row.get::<_, Option<String>>(7)?
        ))
    }).map_err(|e| e.to_string())?;

    let now = chrono::Utc::now();
    let mut candidates = Vec::new();

    for c in candidates_iter {
        let (id, title, proj_id, last_used, copies, created, tags, snoozed) = c.map_err(|e| e.to_string())?;

        // A. Safety: Snooze Check
        if let Some(s_date) = snoozed {
            if let Ok(s_time) = chrono::DateTime::parse_from_rfc3339(&s_date) {
                if s_time.with_timezone(&chrono::Utc) > now { continue; }
            }
        }

        // B. Safety: Favorite Check
        let tags_str = tags.unwrap_or_default().to_lowercase();
        if settings.exclude_favorites && tags_str.contains("favorite") { continue; }

        // C. Calculation: Use last_used_at as the inactivity clock, not updated_at.
        //    A snippet that was edited but never copied/used is still a candidate.
        let activity_time_str = last_used.clone().unwrap_or_else(|| created.clone().unwrap_or_default());
        let last_activity = chrono::DateTime::parse_from_rfc3339(&activity_time_str)
            .map(|dt| dt.with_timezone(&chrono::Utc))
            .unwrap_or(now);
        let days_unused = (now - last_activity).num_days() as i32;


        if days_unused > settings.auto_archive_days {
            // archive_score = days_unused + (never_copied * 20) + (low_popularity * 10)
            let mut score = days_unused;
            if copies == 0 { score += 20; }
            if copies < settings.min_copy_threshold { score += 10; }

            // Reason building
            let reason = if copies == 0 {
                format!("Unused for {} days + Never copied", days_unused)
            } else {
                format!("Unused for {} days + Low activity ({} copies)", days_unused, copies)
            };

            // Get project name
            let project_name: Option<String> = if let Some(pid) = proj_id {
                conn.query_row("SELECT name FROM projects WHERE id = ?", [pid], |r| r.get(0)).optional().unwrap_or(None)
            } else { None };

            candidates.push(ArchiveCandidate {
                snippet_id: id,
                title,
                project_name,
                days_unused,
                copy_count: copies,
                archive_score: score,
                reason,
            });
        }
    }

    // Sort by score DESC
    candidates.sort_by(|a, b| b.archive_score.cmp(&a.archive_score));

    // Instrument Task End
    {
        if let Ok(mut store) = state.telemetry.lock() {
            store.update_task_state("maintenance", TaskState::Idle, None);
        }
    }

    Ok(candidates)
}

#[tauri::command]
pub fn archive_snippets(
    app_handle: AppHandle,
    snippet_ids: Vec<i32>,
    user_id: i32
) -> Result<(), String> {
    let mut conn = get_db_connection(&app_handle)?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    
    for id in snippet_ids {
        tx.execute(
            "UPDATE snippets SET is_archived = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?",
            [id, user_id]
        ).map_err(|e| e.to_string())?;
    }
    
    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn snooze_archive(
    app_handle: AppHandle,
    snippet_ids: Vec<i32>,
    user_id: i32,
    days: i32
) -> Result<(), String> {
    let conn = get_db_connection(&app_handle)?;
    let snooze_until = (chrono::Utc::now() + chrono::Duration::days(days as i64)).to_rfc3339();
    
    for id in snippet_ids {
        conn.execute(
            "UPDATE snippets SET archive_snoozed_until = ? WHERE id = ? AND user_id = ?",
            rusqlite::params![snooze_until, id, user_id]
        ).map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

#[tauri::command]
pub fn update_maintenance_settings(
    app_handle: AppHandle,
    user_id: i32,
    auto_archive_days: i32,
    exclude_favorites: bool,
    min_copy_threshold: i32,
) -> Result<(), String> {
    let conn = get_db_connection(&app_handle)?;
    
    conn.execute(
        "INSERT OR REPLACE INTO user_settings (user_id, auto_archive_days, exclude_favorites, min_copy_threshold) VALUES (?, ?, ?, ?)",
        rusqlite::params![user_id, auto_archive_days, exclude_favorites, min_copy_threshold]
    ).map_err(|e| e.to_string())?;
    
    Ok(())
}
