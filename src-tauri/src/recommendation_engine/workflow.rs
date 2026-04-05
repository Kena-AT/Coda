use rusqlite::Connection;
use std::time::SystemTime;

pub fn calculate_recency_factor(last_used: &str) -> f64 {
    let now = SystemTime::now().duration_since(SystemTime::UNIX_EPOCH).unwrap().as_secs();
    // Simplified time parsing
    let last = chrono::DateTime::parse_from_rfc3339(last_used).map(|d| d.timestamp()).unwrap_or(0);
    let diff_days = (now - last as u64) / 86400;

    if diff_days < 1 { 1.0 }
    else if diff_days < 7 { 0.7 }
    else if diff_days < 30 { 0.4 }
    else { 0.1 }
}

pub fn get_sequence_score(conn: &Connection, from_id: i32, to_id: i32) -> f64 {
    let mut stmt = conn.prepare(
        "SELECT count, last_used FROM snippet_usage_sequences 
         WHERE from_id = ? AND to_id = ?"
    ).unwrap();

    let res = stmt.query_row([from_id, to_id], |row| {
        let count: i32 = row.get(0)?;
        let last_used: String = row.get(1)?;
        Ok((count, last_used))
    });

    match res {
        Ok((count, last_used)) if count >= 3 => {
            let factor = calculate_recency_factor(&last_used);
            (count as f64 * factor).min(100.0)
        },
        _ => 0.0
    }
}
