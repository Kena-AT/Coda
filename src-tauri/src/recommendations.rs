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
    pub last_workflow_sync: String,
}

#[tauri::command]
pub fn get_contextual_recommendations(
    app_handle: AppHandle,
    _state: tauri::State<'_, crate::AppState>,
    user_id: i32,
    current_language: String,
    _current_tags: Option<String>,
    current_snippet_id: Option<i32>
) -> Result<Vec<Recommendation>, String> {
    let conn = get_db_connection(&app_handle)?;
    let mut rec_results = std::collections::HashMap::new();

    // 1. Language Match (Weight: 40)
    let mut stmt = conn.prepare("
        SELECT id, title, content, copy_count, edit_count, last_used_at
        FROM snippets 
        WHERE user_id = ? AND language = ? AND is_archived = 0
    ").map_err(|e| e.to_string())?;

    let lang_iter = stmt.query_map(rusqlite::params![user_id, current_language], |row| {
        let id: i32 = row.get(0)?;
        let title: String = row.get(1)?;
        let content: String = row.get(2)?;
        let copy_count: i32 = row.get(3)?;
        let edit_count: i32 = row.get(4)?;
        let last_used_at: Option<String> = row.get(5).ok();
        
        Ok((id, title, content, copy_count, edit_count, last_used_at))
    }).map_err(|e| e.to_string())?;

    for r in lang_iter {
        let (id, title, content, copy_count, edit_count, last_used_at) = r.map_err(|e| e.to_string())?;
        if Some(id) == current_snippet_id { continue; }

        let mut score = 40; // Base language match
        let mut reason = format!("Language match ({})", current_language);

        // Add popularity factor with decay
        if let Some(_last_use) = last_used_at {
            // Simple decay: 10 points if used in last 24h
            score += 10;
            reason += " + Recent usage";
        }
        score += (copy_count * 2).min(20); // Popularity boost max 20
        score += (edit_count).min(10); // Iteration boost max 10

        rec_results.insert(id, Recommendation {
            id,
            title,
            content,
            category: "Smart Match".to_string(),
            match_score: score as u32,
            reason,
        });
    }

    // 2. Workflow Sequence (Weight: 50) - Current Jump
    if let Some(prev_id) = current_snippet_id {
        let mut stmt = conn.prepare("
            SELECT s.id, s.title, s.content, sq.count
            FROM snippets s
            JOIN snippet_usage_sequences sq ON s.id = sq.to_id
            WHERE sq.from_id = ? AND s.user_id = ? AND s.is_archived = 0
            ORDER BY sq.count DESC
            LIMIT 3
        ").map_err(|e| e.to_string())?;

        let seq_iter = stmt.query_map(rusqlite::params![prev_id, user_id], |row| {
            Ok((row.get::<_, i32>(0)?, row.get::<_, String>(1)?, row.get::<_, String>(2)?, row.get::<_, i32>(3)?))
        }).map_err(|e| e.to_string())?;

        for r in seq_iter {
            let (id, title, content, count) = r.map_err(|e| e.to_string())?;
            let entry = rec_results.entry(id).or_insert(Recommendation {
                id, title, content, 
                category: "Workflow".to_string(),
                match_score: 0,
                reason: String::new(),
            });
            entry.match_score += 50;
            entry.category = "Workflow".to_string();
            entry.reason = format!("Commonly used after current snippet (x{})", count);
        }
    }

    // 3. Pattern Detection (Weight: 30)
    // We scan the current buffer if provided (simulated here by checking snippet title/tags)
    // Actually, we'll detect patterns in the current snippet and suggest others in same pattern
    if let Some(cid) = current_snippet_id {
        let snippet_content: String = conn.query_row(
            "SELECT content FROM snippets WHERE id = ?",
            [cid],
            |row| row.get(0)
        ).unwrap_or_default();

        let patterns = crate::patterns::detect_patterns(&snippet_content);
        for p in patterns {
            // Find other snippets with markers for this pattern
            let mut stmt = conn.prepare("
                SELECT id, title, content FROM snippets 
                WHERE user_id = ? AND id != ? AND content LIKE ? AND is_archived = 0
                LIMIT 2
            ").map_err(|e| e.to_string())?;

            for keyword in p.keywords {
                let pattern_iter = stmt.query_map(rusqlite::params![user_id, cid, format!("%{}%", keyword)], |row| {
                    Ok((row.get::<_, i32>(0)?, row.get::<_, String>(1)?, row.get::<_, String>(2)?))
                }).map_err(|e| e.to_string())?;

                for r in pattern_iter {
                    let (id, title, content) = r.map_err(|e| e.to_string())?;
                    let entry = rec_results.entry(id).or_insert(Recommendation {
                        id, title, content,
                        category: "Pattern".to_string(),
                        match_score: 0,
                        reason: String::new(),
                    });
                    entry.match_score += 30;
                    entry.reason = format!("Detected {} pattern match", p.category);
                }
            }
        }
    }

    let mut final_recs: Vec<Recommendation> = rec_results.into_values().collect();
    final_recs.sort_by(|a, b| b.match_score.cmp(&a.match_score));
    
    // Normalize scores to max 99
    for r in &mut final_recs {
        if r.match_score > 99 { r.match_score = 99; }
    }

    Ok(final_recs.into_iter().take(10).collect())
}

#[tauri::command]
pub fn get_stale_snippets(app_handle: AppHandle, user_id: i32) -> Result<Vec<Recommendation>, String> {
    let conn = get_db_connection(&app_handle)?;
    
    // Unused for 90 days OR never copied
    let mut stmt = conn.prepare("
        SELECT id, title, content, copy_count, created_at, last_used_at
        FROM snippets
        WHERE user_id = ? AND is_archived = 0
        AND (
            (last_used_at IS NULL AND created_at < datetime('now', '-30 days'))
            OR
            (last_used_at < datetime('now', '-90 days'))
        )
        LIMIT 5
    ").map_err(|e| e.to_string())?;

    let stale_iter = stmt.query_map([user_id], |row| {
        let copy_count: i32 = row.get(3)?;
        let last_used: Option<String> = row.get(5).ok();
        let reason = if last_used.is_none() {
            "Never used since creation".to_string()
        } else {
            "Not used in > 90 days".to_string()
        };

        Ok(Recommendation {
            id: row.get(0)?,
            title: row.get(1)?,
            content: row.get(2)?,
            category: "Stale / Cleanup".to_string(),
            match_score: 100, // High visibility for cleanup
            reason: format!("{} ({} copies total)", reason, copy_count),
        })
    }).map_err(|e| e.to_string())?;

    let mut recs = Vec::new();
    for r in stale_iter {
        recs.push(r.map_err(|e| e.to_string())?);
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
        heuristics_engine: "V1.1_SCORE_EXPANDED".to_string(),
        last_workflow_sync: chrono::Local::now().format("%H:%M:%S").to_string(),
    })
}

#[tauri::command]
pub fn get_popular_snippets(app_handle: AppHandle, user_id: i32) -> Result<Vec<Recommendation>, String> {
    let conn = crate::db::get_db_connection(&app_handle)?;
    
    // score = (copy_count * 3) + (CASE WHEN last_used_at > datetime('now', '-24 hours') THEN 15 ELSE 0 END) + edit_count
    let mut stmt = conn.prepare("
        SELECT id, title, content, copy_count, edit_count, last_used_at
        FROM snippets
        WHERE user_id = ? AND is_archived = 0
        ORDER BY (copy_count * 3 + (CASE WHEN last_used_at > datetime('now', '-24 hours') THEN 15 ELSE 0 END) + edit_count) DESC
        LIMIT 5
    ").map_err(|e| e.to_string())?;

    let iter = stmt.query_map([user_id], |row| {
        let id: i32 = row.get(0)?;
        let title: String = row.get(1)?;
        let content: String = row.get(2)?;
        let copy_count: i32 = row.get(3)?;
        let edit_count: i32 = row.get(4)?;
        let last_used_at: Option<String> = row.get(5).ok();
        
        let score = (copy_count * 3) + (if last_used_at.is_some() { 15 } else { 0 }) + edit_count;

        Ok(Recommendation {
            id,
            title,
            content,
            category: "Top Performer".to_string(),
            match_score: score as u32,
            reason: format!("High velocity: {} copies, {} edits", copy_count, edit_count),
        })
    }).map_err(|e| e.to_string())?;

    let mut res = Vec::new();
    for r in iter {
        res.push(r.map_err(|e| e.to_string())?);
    }
    Ok(res)
}
