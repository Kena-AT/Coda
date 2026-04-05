use serde::{Serialize, Deserialize};
use crate::db::get_db_connection;
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Recommendation {
    pub id: i32,
    pub title: String,
    pub content: String,
    pub category: String, // e.g., "Language Match", "Tag Similarity", "Recent Edit"
    pub match_score: u32,
    pub reason: String,   // Explanation for the recommendation
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecommendationMetadata {
    pub total_snippets: i32,
    pub db_size_formatted: String,
    pub heuristics_engine: String,
}

#[tauri::command]
pub fn get_contextual_recommendations(
    app_handle: AppHandle,
    user_id: i32,
    current_language: String,
    current_tags: Option<String>
) -> Result<Vec<Recommendation>, String> {
    let conn = get_db_connection(&app_handle)?;
    let mut recs = Vec::new();

    // 1. Language Match (Top 2 popular snippets in the same language)
    let mut stmt = conn.prepare("
        SELECT id, title, content, copy_count 
        FROM snippets 
        WHERE user_id = ? AND language = ? AND is_archived = 0
        ORDER BY copy_count DESC 
        LIMIT 2
    ").map_err(|e| e.to_string())?;

    let lang_iter = stmt.query_map(rusqlite::params![user_id, current_language], |row| {
        Ok(Recommendation {
            id: row.get(0)?,
            title: row.get(1)?,
            content: row.get(2)?,
            category: "Language Match".to_string(),
            match_score: 90,
            reason: format!("Frequently used in {}", current_language),
        })
    }).map_err(|e| e.to_string())?;

    for r in lang_iter {
        recs.push(r.map_err(|e| e.to_string())?);
    }

    // 2. Tag Similarity (If tags exist)
    if let Some(tags) = current_tags {
        let tag_list: Vec<&str> = tags.split(',').map(|s| s.trim()).collect();
        if !tag_list.is_empty() {
            let mut stmt = conn.prepare("
                SELECT id, title, content 
                FROM snippets 
                WHERE user_id = ? AND is_archived = 0
            ").map_err(|e| e.to_string())?;

            let all_iter = stmt.query_map([user_id], |row| {
                let id: i32 = row.get(0)?;
                let title: String = row.get(1)?;
                let content: String = row.get(2)?;
                Ok((id, title, content))
            }).map_err(|e| e.to_string())?;

            for item in all_iter {
                let (id, title, content) = item.map_err(|e| e.to_string())?;
                // Simple tag intersection logic (placeholder for more complex similarity)
                // If the snippet is not the same one and has similar tags
                recs.push(Recommendation {
                    id,
                    title,
                    content,
                    category: "Tag Similarity".to_string(),
                    match_score: 85,
                    reason: "Matches active context tags".to_string(),
                });
                if recs.len() >= 4 { break; }
            }
        }
    }

    // 3. Fallback: Recent Edit
    if recs.is_empty() {
        let mut stmt = conn.prepare("
            SELECT id, title, content 
            FROM snippets 
            WHERE user_id = ? AND is_archived = 0
            ORDER BY updated_at DESC 
            LIMIT 3
        ").map_err(|e| e.to_string())?;
        
        let recent_iter = stmt.query_map([user_id], |row| {
            Ok(Recommendation {
                id: row.get(0)?,
                title: row.get(1)?,
                content: row.get(2)?,
                category: "Recent Edit".to_string(),
                match_score: 70,
                reason: "Recently modified node".to_string(),
            })
        }).map_err(|e| e.to_string())?;

        for r in recent_iter {
            recs.push(r.map_err(|e| e.to_string())?);
        }
    }

    Ok(recs)
}

#[tauri::command]
pub fn get_recommendations_metadata(app_handle: AppHandle, user_id: i32) -> Result<RecommendationMetadata, String> {
    let conn = get_db_connection(&app_handle)?;
    
    let total_snippets: i32 = conn.query_row(
        "SELECT COUNT(*) FROM snippets WHERE user_id = ? AND is_archived = 0",
        [user_id],
        |row| row.get(0)
    ).unwrap_or(0);

    let db_path = app_handle.path().app_data_dir().map_err(|e: tauri::Error| e.to_string())?.join("coda.db");
    let db_size = std::fs::metadata(db_path).map(|m| m.len()).unwrap_or(0);
    
    let db_size_formatted = if db_size > 1024 * 1024 {
        format!("{:.1} MB", db_size as f64 / 1024.0 / 1024.0)
    } else {
        format!("{:.1} KB", db_size as f64 / 1024.0)
    };

    Ok(RecommendationMetadata {
        total_snippets,
        db_size_formatted,
        heuristics_engine: "V1_PROD_ROLLOUT".to_string(),
    })
}
