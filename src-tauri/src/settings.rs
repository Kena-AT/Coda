use serde::{Serialize, Deserialize};
use tauri::{AppHandle, command};
use crate::db::get_db_connection;

#[derive(Debug, Serialize, Deserialize)]
pub struct UserPreferences {
    pub auto_archive_days: i32,
    pub exclude_favorites: bool,
    pub min_copy_threshold: i32,
    pub push_alerts: bool,
    pub sound_effects: bool,
    pub lockout_threshold: i32,
    pub lockout_duration_mins: i32,
}

#[command]
pub async fn get_user_preferences(app_handle: AppHandle) -> Result<UserPreferences, String> {
    let conn = get_db_connection(&app_handle)?;
    let mut stmt = conn.prepare("SELECT auto_archive_days, exclude_favorites, min_copy_threshold, push_alerts, sound_effects, lockout_threshold, lockout_duration_mins FROM user_settings LIMIT 1")
        .map_err(|e| e.to_string())?;
    
    let prefs = stmt.query_row([], |row| {
        Ok(UserPreferences {
            auto_archive_days: row.get(0)?,
            exclude_favorites: row.get(1)?,
            min_copy_threshold: row.get(2)?,
            push_alerts: row.get(3)?,
            sound_effects: row.get(4)?,
            lockout_threshold: row.get(5)?,
            lockout_duration_mins: row.get(6)?,
        })
    }).unwrap_or(UserPreferences {
        auto_archive_days: 30,
        exclude_favorites: true,
        min_copy_threshold: 10,
        push_alerts: true,
        sound_effects: true,
        lockout_threshold: 3,
        lockout_duration_mins: 20,
    });

    Ok(prefs)
}

#[command]
pub async fn update_user_preferences(app_handle: AppHandle, prefs: UserPreferences) -> Result<(), String> {
    let conn = get_db_connection(&app_handle)?;
    conn.execute(
        "INSERT INTO user_settings (user_id, auto_archive_days, exclude_favorites, min_copy_threshold, push_alerts, sound_effects, lockout_threshold, lockout_duration_mins) 
         VALUES (1, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET 
            auto_archive_days = excluded.auto_archive_days,
            exclude_favorites = excluded.exclude_favorites,
            min_copy_threshold = excluded.min_copy_threshold,
            push_alerts = excluded.push_alerts,
            sound_effects = excluded.sound_effects,
            lockout_threshold = excluded.lockout_threshold,
            lockout_duration_mins = excluded.lockout_duration_mins",
        rusqlite::params![
            prefs.auto_archive_days,
            prefs.exclude_favorites,
            prefs.min_copy_threshold,
            prefs.push_alerts,
            prefs.sound_effects,
            prefs.lockout_threshold,
            prefs.lockout_duration_mins
        ],
    ).map_err(|e| e.to_string())?;

    Ok(())
}
