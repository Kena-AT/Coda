use rusqlite::Connection;

pub fn fetch_candidates(
    conn: &Connection, 
    user_id: i32, 
    current_language: String, 
    _current_tags: Option<String>,
    current_snippet_id: Option<i32>
) -> Result<Vec<(i32, String, String, String, i32, i32, Option<String>, Option<String>, i32, i32)>, String> {
    // 1. Get Top 100 Candidates (Limit to prevent performance collapse)
    let mut stmt = conn.prepare("
        SELECT id, title, content, language, copy_count, edit_count, last_used_at, detected_patterns, impressions, clicks
        FROM snippets
        WHERE user_id = ? AND is_archived = 0 AND id != ?
        AND (language = ? OR last_used_at > datetime('now', '-30 days'))
        ORDER BY last_used_at DESC, copy_count DESC
        LIMIT 100
    ").map_err(|e| e.to_string())?;

    let cid = current_snippet_id.unwrap_or(-1);
    let iter = stmt.query_map(rusqlite::params![user_id, cid, current_language], |row| {
        Ok((
            row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?,
            row.get(4)?, row.get(5)?, row.get(6)?, row.get(7)?,
            row.get(8)?, row.get(9)?
        ))
    }).map_err(|e| e.to_string())?;

    let mut res = Vec::new();
    for r in iter {
        res.push(r.map_err(|e| e.to_string())?);
    }
    Ok(res)
}
