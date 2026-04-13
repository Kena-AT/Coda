use tauri::{AppHandle, Emitter};
use tauri_plugin_notification::NotificationExt;
use serde::{Serialize, Deserialize};
use crate::db::get_db_connection;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum AppEvent {
    SnippetCreated(String),
    SnippetDeleted(String),
    BackupCreated,
    RestoreComplete,
    SecurityError(String),
    MaintenanceAlert(String),
    SystemError(String),
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NotificationSettings {
    pub push_alerts: bool,
    pub sound_effects: bool,
}

pub struct NotificationService;

impl NotificationService {
    pub fn dispatch(app: &AppHandle, event: AppEvent) {
        let settings = match Self::get_settings(app) {
            Ok(s) => s,
            Err(_) => NotificationSettings { push_alerts: true, sound_effects: true },
        };

        if !settings.push_alerts {
            return;
        }

        let (title, body) = match event {
            AppEvent::SnippetCreated(title) => ("Snippet Encrypted", format!("'{}' has been committed to the vault.", title)),
            AppEvent::SnippetDeleted(title) => ("Vault Purge", format!("'{}' has been removed from permanent storage.", title)),
            AppEvent::BackupCreated => ("Vault Snapshot", "System state backed up successfully.".to_string()),
            AppEvent::RestoreComplete => ("System Restore", "Database reconstruction complete. Restarting...".to_string()),
            AppEvent::SecurityError(msg) => ("Security Alert", msg),
            AppEvent::MaintenanceAlert(msg) => ("Maintenance Required", msg),
            AppEvent::SystemError(msg) => ("Critical Failure", msg),
        };

        let _ = app.notification()
            .builder()
            .title(title)
            .body(body)
            .show();

        if settings.sound_effects {
            // Play sound - in a real app, this might use a tauri command or external crate
            // For now we'll emit an event to the frontend which can play audio
            let _ = app.emit("play-fx", title); 
        }
    }

    pub fn get_settings(app: &AppHandle) -> Result<NotificationSettings, String> {
        let conn = get_db_connection(app)?;
        let mut stmt = conn.prepare("SELECT push_alerts, sound_effects FROM user_settings LIMIT 1").map_err(|e| e.to_string())?;
        let settings = stmt.query_row([], |row| {
            Ok(NotificationSettings {
                push_alerts: row.get(0).unwrap_or(true),
                sound_effects: row.get(1).unwrap_or(true),
            })
        }).unwrap_or(NotificationSettings { push_alerts: true, sound_effects: true });

        Ok(settings)
    }

    pub fn update_settings(app: &AppHandle, settings: NotificationSettings) -> Result<(), String> {
        let conn = get_db_connection(app)?;
        conn.execute(
            "UPDATE user_settings SET push_alerts = ?, sound_effects = ?",
            [settings.push_alerts as i32, settings.sound_effects as i32],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }
}

#[tauri::command]
pub async fn update_notification_settings(app: AppHandle, settings: NotificationSettings) -> Result<(), String> {
    NotificationService::update_settings(&app, settings)
}

#[tauri::command]
pub async fn get_notification_settings(app: AppHandle) -> Result<NotificationSettings, String> {
    NotificationService::get_settings(&app)
}
