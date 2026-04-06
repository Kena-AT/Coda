use tauri::{AppHandle, State};
use rusqlite::params;
use crate::db::get_db_connection;
use serde::{Deserialize, Serialize};
use crate::AppState;
use crate::telemetry::TaskState;

#[derive(Debug, Serialize, Deserialize)]
pub struct RelatedSnippet {
    pub id: i32,
    pub title: String,
    pub project_name: Option<String>,
    pub strength: i32,
    pub link_type: String,
}

#[tauri::command]
pub fn get_related_snippets(
    app_handle: AppHandle,
    snippet_id: i32,
    user_id: i32
) -> Result<Vec<RelatedSnippet>, String> {
    let conn = get_db_connection(&app_handle)?;
    
    // Use precomputed links from snippet_relations
    let mut stmt = conn.prepare("
        SELECT s.id, s.title, p.name, sr.strength, sr.link_type
        FROM snippet_relations sr
        JOIN snippets s ON sr.related_id = s.id
        LEFT JOIN projects p ON s.project_id = p.id
        WHERE sr.snippet_id = ? AND s.user_id = ? AND s.is_archived = 0
        ORDER BY sr.strength DESC
        LIMIT 10
    ").map_err(|e| e.to_string())?;

    let related_iter = stmt.query_map([snippet_id, user_id], |row| {
        Ok(RelatedSnippet {
            id: row.get(0)?,
            title: row.get(1)?,
            project_name: row.get(2)?,
            strength: row.get(3)?,
            link_type: row.get(4)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut related = Vec::new();
    for r in related_iter {
        related.push(r.map_err(|e| e.to_string())?);
    }

    Ok(related)
}

#[tauri::command]
pub fn recompute_snippet_links(
    app_handle: AppHandle,
    state: State<'_, AppState>,
    snippet_id: i32,
    user_id: i32
) -> Result<(), String> {
    // 0. Instrument Task Start
    {
        if let Ok(mut store) = state.telemetry.lock() {
            store.update_task_state("analytics", TaskState::Running, None);
        }
    }

    let conn = get_db_connection(&app_handle)?;
    
    // 1. Get target snippet details
    let (target_tags, target_lang, target_proj) = conn.query_row(
        "SELECT tags, language, project_id FROM snippets WHERE id = ? AND user_id = ?",
        [snippet_id, user_id],
        |row| Ok((row.get::<_, Option<String>>(0)?, row.get::<_, String>(1)?, row.get::<_, Option<i32>>(2)?))
    ).map_err(|e| e.to_string())?;

    let target_tags_list: Vec<String> = target_tags.unwrap_or_default()
        .split(',')
        .map(|s| s.trim().to_lowercase())
        .filter(|s| !s.is_empty())
        .collect();

    // 2. Fetch candidates (excluding the snippet itself)
    let mut stmt = conn.prepare("SELECT id, tags, language, project_id FROM snippets WHERE id != ? AND user_id = ? AND is_archived = 0")
        .map_err(|e| e.to_string())?;
    
    let candidates = stmt.query_map([snippet_id, user_id], |row| {
        Ok((row.get::<_, i32>(0)?, row.get::<_, Option<String>>(1)?, row.get::<_, String>(2)?, row.get::<_, Option<i32>>(3)?))
    }).map_err(|e| e.to_string())?;

    let mut relations = Vec::new();

    for candidate in candidates {
        let (cid, ctags, clang, cproj) = candidate.map_err(|e| e.to_string())?;
        let mut strength = 0;
        let mut link_type = "algorithmic".to_string();

        // A. Workflow Correlation (50%) - Check usage sequences
        let sequence_count: i32 = conn.query_row(
            "SELECT count FROM snippet_usage_sequences WHERE (from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?)",
            params![snippet_id, cid, cid, snippet_id],
            |row| row.get(0)
        ).unwrap_or(0);
        
        if sequence_count > 0 {
            strength += (sequence_count * 10).min(50);
            link_type = "workflow".to_string();
        }

        // B. Tag Overlap (30%)
        if let Some(ctags_str) = ctags {
            let ctags_list: Vec<String> = ctags_str.split(',')
                .map(|s| s.trim().to_lowercase())
                .filter(|s| !s.is_empty())
                .collect();
            
            let overlap = target_tags_list.iter().filter(|t| ctags_list.contains(t)).count();
            if !target_tags_list.is_empty() {
                strength += ((overlap as f32 / target_tags_list.len() as f32) * 30.0) as i32;
                if strength > 50 { link_type = "tag".to_string(); }
            }
        }

        // C. Language match (10%)
        if clang == target_lang {
            strength += 10;
        }

        // D. Project Proximity (+10 bonus)
        if cproj == target_proj {
            strength += 10;
        }

        // E. Session Co-usage (10%) - Simplified: if both in top 100 recent
        // (Placeholder for complex session logic, using simple recency correlation)
        
        if strength >= 15 {
            relations.push((snippet_id, cid, strength.min(100), link_type));
        }
    }

    // 3. Batch Update Relations
    let mut conn = get_db_connection(&app_handle)?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    
    // Clear old links for this snippet
    tx.execute("DELETE FROM snippet_relations WHERE snippet_id = ?", [snippet_id]).map_err(|e| e.to_string())?;
    
    for (sid, rid, str, lt) in relations {
        tx.execute(
            "INSERT OR REPLACE INTO snippet_relations (snippet_id, related_id, strength, link_type) VALUES (?, ?, ?, ?)",
            params![sid, rid, str, lt]
        ).map_err(|e| e.to_string())?;
    }
    
    tx.commit().map_err(|e| e.to_string())?;

    // Instrument Task End
    {
        if let Ok(mut store) = state.telemetry.lock() {
            store.update_task_state("analytics", TaskState::Idle, None);
        }
    }

    Ok(())
}
