use rusqlite::Connection;
use std::time::SystemTime;

pub fn get_popularity_score(conn: &Connection, snippet_id: i32, total_copies: i32) -> f64 {
    // 1. Get copies in last 7 days
    let copies_last_7_days: i32 = conn.query_row(
        "SELECT COUNT(*) FROM activity_log WHERE snippet_id = ? AND event_type = 'COPY' AND timestamp > datetime('now', '-7 days')",
        [snippet_id],
        |row| row.get(0)
    ).unwrap_or(0);

    // velocity = copies_last_7_days * 3 + total_copies * 0.2
    (copies_last_7_days as f64 * 3.0) + (total_copies as f64 * 0.2)
}

pub fn get_stale_score(last_used_at: Option<String>, copy_count: i32, edit_count: i32, created_at: &str) -> f64 {
    let now = SystemTime::now().duration_since(SystemTime::UNIX_EPOCH).unwrap().as_secs();
    
    let last = last_used_at
        .and_then(|t| chrono::DateTime::parse_from_rfc3339(&t).ok())
        .map(|d| d.timestamp() as u64)
        .unwrap_or_else(|| {
            chrono::DateTime::parse_from_rfc3339(created_at)
                .map(|d| d.timestamp() as u64)
                .unwrap_or(now) // Fallback to now (not epoch) if created_at is also invalid
        });

    let days_unused = ((now - last) / 86400).min(3650); // Cap at ~10 years max
    
    // stale_score = days_unused + (never_copied * 30) + (no_edits * 10)
    let never_copied_penalty = if copy_count == 0 { 30.0 } else { 0.0 };
    let no_edits_penalty = if edit_count == 0 { 10.0 } else { 0.0 };

    let raw_score = days_unused as f64 + never_copied_penalty + no_edits_penalty;
    raw_score.min(100.0) // Cap at 100 for percentage display
}
