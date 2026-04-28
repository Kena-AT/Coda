use serde::{Serialize, Deserialize};
use tauri::{AppHandle, Manager};
use crate::db::get_db_connection;

pub mod scoring;
pub mod workflow;
pub mod candidates;
pub mod metrics;
pub mod linking;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Recommendation {
    pub id: i32,
    pub title: String,
    pub content: String,
    pub language: String,
    pub category: String,
    pub match_score: u32,
    pub reason: String,
    pub breakdown: scoring::ScoreBreakdown,
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
    user_id: i32,
    current_language: String,
    current_tags: Option<String>,
    current_snippet_id: Option<i32>
) -> Result<Vec<Recommendation>, String> {
    let conn = get_db_connection(&app_handle)?;
    
    // 1. Fetch Candidates (Limit 100)
    let candidates = candidates::fetch_candidates(
        &conn, user_id, current_language.clone(), current_tags.clone(), current_snippet_id
    )?;

    let mut results = Vec::new();
    let mut snippet_ids_to_increment = Vec::new();

    // 2. Score Candidates
    for (id, title, content, lang, copies, _edits, _last_used, patterns_json, impressions, clicks) in candidates {
        // A. Workflow Score
        let workflow_score = if let Some(cid) = current_snippet_id {
            workflow::get_sequence_score(&conn, cid, id)
        } else {
            0.0
        };

        // B. Context Score (Language/Tags)
        let context_score = if lang == current_language { 100.0 } else { 0.0 };
        
        // C. Pattern Score
        let mut pattern_score = 0.0;
        if let Some(p_json) = patterns_json {
            if let Ok(p_tags) = serde_json::from_str::<Vec<String>>(&p_json) {
                if !p_tags.is_empty() { pattern_score = 50.0; }
            }
        }

        // D. Popularity Score (Velocity)
        let popularity_score = metrics::get_popularity_score(&conn, id, copies);

        // 3. Final Normalized Scoring
        let (final_score, breakdown) = scoring::calculate_normalized_score(
            workflow_score, context_score, pattern_score, popularity_score, impressions, clicks
        );

        if final_score > 5 {
            results.push(Recommendation {
                id, title, content,
                language: lang.clone(),
                category: if workflow_score > 30.0 { "Workflow".to_string() } else { "Smart Match".to_string() },
                match_score: final_score,
                reason: if workflow_score > 30.0 { "Commonly follows current task".to_string() } else { format!("High relevance in {}", lang) },
                breakdown,
            });
            snippet_ids_to_increment.push(id);
        }
    }

    // 4. Batch increment impressions for returned results
    for sid in snippet_ids_to_increment.iter().take(10) {
        let _ = conn.execute("UPDATE snippets SET impressions = impressions + 1 WHERE id = ?", [sid]);
    }

    results.sort_by(|a, b| b.match_score.cmp(&a.match_score));
    Ok(results.into_iter().take(10).collect())
}

#[tauri::command]
pub fn get_stale_snippets(app_handle: AppHandle, user_id: i32) -> Result<Vec<Recommendation>, String> {
    let conn = get_db_connection(&app_handle)?;
    
    let mut stmt = conn.prepare("
        SELECT id, title, content, language, copy_count, edit_count, last_used_at, created_at
        FROM snippets
        WHERE user_id = ? AND is_archived = 0
        LIMIT 100
    ").map_err(|e| e.to_string())?;

    let iter = stmt.query_map([user_id], |row| {
        Ok((
            row.get::<_, i32>(0)?, row.get::<_, String>(1)?, row.get::<_, String>(2)?, row.get::<_, String>(3)?,
            row.get::<_, i32>(4)?, row.get::<_, i32>(5)?, row.get::<_, Option<String>>(6)?, 
            row.get::<_, String>(7)?
        ))
    }).map_err(|e| e.to_string())?;

    let mut results = Vec::new();
    for r in iter {
        let (id, title, content, lang, copies, edits, last_used, created) = r.map_err(|e| e.to_string())?;
        let stale_score = metrics::get_stale_score(last_used, copies, edits, &created);

        if stale_score > 90.0 {
            results.push(Recommendation {
                id, title, content,
                language: lang,
                category: "Cleanup".to_string(),
                match_score: stale_score as u32,
                reason: format!("Unused for {} days", stale_score as u32),
                breakdown: scoring::ScoreBreakdown {
                    workflow: 0.0, context: 0.0, patterns: 0.0, popularity: 0.0, ctr_penalty: 0.0
                },
            });
        }
    }

    results.sort_by(|a, b| b.match_score.cmp(&a.match_score));
    Ok(results.into_iter().take(10).collect())
}

#[tauri::command]
pub fn get_popular_snippets(app_handle: AppHandle, user_id: i32) -> Result<Vec<Recommendation>, String> {
    let conn = get_db_connection(&app_handle)?;
    
    // Stricter Criteria for "Top Snippets":
    // 1. Minimum 5 copies to even be considered
    // 2. Not archived
    // 3. Must have been used in the last 90 days
    // 4. Exclude snippets that are constantly being edited (likely work-in-progress)
    let mut stmt = conn.prepare("
        SELECT id, title, content, language, copy_count, edit_count, last_used_at, created_at, impressions, clicks
        FROM snippets
        WHERE user_id = ? 
          AND is_archived = 0 
          AND copy_count >= 3
          AND (last_used_at > datetime('now', '-90 days') OR last_used_at IS NULL)
          AND edit_count < (copy_count * 2)
        ORDER BY copy_count DESC
        LIMIT 50
    ").map_err(|e| e.to_string())?;

    let iter = stmt.query_map([user_id], |row| {
        Ok((
            row.get::<_, i32>(0)?, row.get::<_, String>(1)?, row.get::<_, String>(2)?, row.get::<_, String>(3)?,
            row.get::<_, i32>(4)?, row.get::<_, i32>(5)?, row.get::<_, Option<String>>(6)?, 
            row.get::<_, String>(7)?, row.get::<_, i32>(8)?, row.get::<_, i32>(9)?
        ))
    }).map_err(|e| e.to_string())?;

    let mut results = Vec::new();
    for r in iter {
        let (id, title, content, lang, copies, _edits, _last_used, _created, impressions, clicks) = r.map_err(|e| e.to_string())?;
        
        // Use popularity scoring (velocity weight)
        let pop_score = metrics::get_popularity_score(&conn, id, copies);

        // Normalize for display
        let (final_score, breakdown) = scoring::calculate_normalized_score(
            0.0, 0.0, 0.0, pop_score, impressions, clicks
        );

        // Only include if they pass the normalized quality bar
        if final_score >= 5 {
            results.push(Recommendation {
                id, title, content,
                language: lang.clone(),
                category: "Elite".to_string(),
                match_score: final_score,
                reason: format!("High velocity in {}", lang),
                breakdown,
            });
        }
    }

    results.sort_by(|a, b| b.match_score.cmp(&a.match_score));
    Ok(results.into_iter().take(5).collect())
}

#[tauri::command]
pub fn record_recommendation_click(app_handle: AppHandle, snippet_id: i32) -> Result<(), String> {
    let conn = get_db_connection(&app_handle)?;
    conn.execute(
        "UPDATE snippets SET clicks = clicks + 1 WHERE id = ?",
        [snippet_id]
    ).map_err(|e| e.to_string())?;
    Ok(())
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
        heuristics_engine: "V1.2_MODULAR_DECAY".to_string(),
        last_workflow_sync: chrono::Local::now().format("%H:%M:%S").to_string(),
    })
}
