use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use jsonwebtoken::{encode, decode, Header, EncodingKey, DecodingKey, Validation};
use serde::{Deserialize, Serialize};
use crate::db::get_db_connection;
use crate::notifications::{NotificationService, AppEvent};
use tauri::{AppHandle, Manager};
use chrono::{Utc, DateTime, Duration};
use dashmap::DashMap;

const SECRET_KEY: &[u8] = b"coda_secret_key_change_this_for_production";
const REFRESH_SECRET_KEY: &[u8] = b"coda_refresh_secret_key_change_this_for_production";
const DEFAULT_MAX_LOCKOUT_ATTEMPTS: i32 = 3;
const DEFAULT_LOCKOUT_DURATION_MINS: i64 = 20;
const ACCESS_TOKEN_EXPIRY_HOURS: i64 = 24;
const REFRESH_TOKEN_EXPIRY_DAYS: i64 = 30;

// In-memory session storage for non-remember-me sessions
pub struct SessionStore {
    sessions: DashMap<String, SessionData>, // token -> session data
}

pub struct SessionData {
    pub user_id: i32,
    pub username: String,
    pub _created_at: i64,
}

impl SessionStore {
    pub fn new() -> Self {
        Self {
            sessions: DashMap::new(),
        }
    }

    pub fn store_session(&self, token: String, user_id: i32, username: String) {
        self.sessions.insert(token, SessionData {
            user_id,
            username,
            _created_at: Utc::now().timestamp(),
        });
    }

    pub fn get_session(&self, token: &str) -> Option<(i32, String)> {
        self.sessions.get(token).map(|s| (s.user_id, s.username.clone()))
    }

    pub fn remove_session(&self, token: &str) {
        self.sessions.remove(token);
    }

    pub fn clear_user_sessions(&self, user_id: i32) {
        let tokens_to_remove: Vec<String> = self.sessions
            .iter()
            .filter(|entry| entry.value().user_id == user_id)
            .map(|entry| entry.key().clone())
            .collect();
        
        for token in tokens_to_remove {
            self.sessions.remove(&token);
        }
    }

    pub fn is_empty(&self) -> bool {
        self.sessions.is_empty()
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub exp: usize,
    pub token_type: String, // "access" or "refresh"
    pub user_id: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TokenPair {
    pub access_token: String,
    pub refresh_token: String,
    pub access_expires_at: i64,
    pub refresh_expires_at: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AuthResponse {
    pub success: bool,
    pub token: Option<String>,
    pub refresh_token: Option<String>,
    pub user_id: Option<i32>,
    pub username: Option<String>,
    pub access_expires_at: Option<i64>,
    pub refresh_expires_at: Option<i64>,
    pub message: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RefreshResponse {
    pub success: bool,
    pub access_token: Option<String>,
    pub access_expires_at: Option<i64>,
    pub message: String,
}

#[tauri::command]
pub fn signup(app_handle: AppHandle, username: String, password: String) -> Result<AuthResponse, String> {
    let conn = get_db_connection(&app_handle)?;
    
    // Hash password
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let password_hash = argon2.hash_password(password.as_bytes(), &salt)
        .map_err(|e| e.to_string())?
        .to_string();

    match conn.execute(
        "INSERT INTO users (username, master_password_hash) VALUES (?, ?)",
        [&username, &password_hash],
    ) {
        Ok(_) => Ok(AuthResponse {
            success: true,
            token: None,
            refresh_token: None,
            user_id: None,
            username: None,
            access_expires_at: None,
            refresh_expires_at: None,
            message: "User created successfully. Please sign in.".to_string(),
        }),
        Err(e) => Ok(AuthResponse {
            success: false,
            token: None,
            refresh_token: None,
            user_id: None,
            username: None,
            access_expires_at: None,
            refresh_expires_at: None,
            message: format!("Signup failed: {}", e),
        }),
    }
}

fn get_lockout_settings(conn: &rusqlite::Connection) -> (i32, i64) {
    conn.query_row(
        "SELECT lockout_threshold, lockout_duration_mins FROM user_settings LIMIT 1",
        [],
        |row| Ok((row.get(0).unwrap_or(DEFAULT_MAX_LOCKOUT_ATTEMPTS), row.get(1).unwrap_or(DEFAULT_LOCKOUT_DURATION_MINS)))
    ).unwrap_or((DEFAULT_MAX_LOCKOUT_ATTEMPTS, DEFAULT_LOCKOUT_DURATION_MINS))
}

#[tauri::command]
pub fn login(
    app_handle: AppHandle,
    username: String,
    password: String,
    _remember_me: bool,
) -> Result<AuthResponse, String> {
    let conn = get_db_connection(&app_handle)?;
    let (max_attempts, duration_mins) = get_lockout_settings(&conn);
    
    let mut stmt = conn.prepare("SELECT id, master_password_hash, lockout_count, last_failed_attempt FROM users WHERE username = ?")
        .map_err(|e| e.to_string())?;
    
    let user_data = stmt.query_row([&username], |row| {
        Ok((
            row.get::<_, i32>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, i32>(2)?,
            row.get::<_, Option<String>>(3)?,
        ))
    }).map_err(|_| {
        NotificationService::dispatch(&app_handle, AppEvent::SecurityError(format!("Unauthorized access attempted for user '{}'", username)));
        "Invalid username or password".to_string()
    })?;

    let (id, hash, lockout_count, last_failed) = user_data;

    // Check Lockout
    if lockout_count >= max_attempts {
        if let Some(last_failed_str) = last_failed {
            let last_failed_time = DateTime::parse_from_rfc3339(&last_failed_str)
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or(Utc::now());
            
            let lock_expiry = last_failed_time + Duration::minutes(duration_mins);
            
            if Utc::now() < lock_expiry {
                let diff = lock_expiry - Utc::now();
                return Ok(AuthResponse {
                    success: false,
                    token: None,
                    refresh_token: None,
                    user_id: None,
                    username: None,
                    access_expires_at: None,
                    refresh_expires_at: None,
                    message: format!("ACCOUNT_LOCKED. Re-entry allowed in {}m {}s", diff.num_minutes(), diff.num_seconds() % 60),
                });
            } else {
                // Lock expired, reset count but don't reset last_failed yet
                conn.execute("UPDATE users SET lockout_count = 0 WHERE id = ?", [id]).map_err(|e| e.to_string())?;
            }
        }
    }

    let parsed_hash = PasswordHash::new(&hash).map_err(|e| e.to_string())?;
    let argon2 = Argon2::default();

    if argon2.verify_password(password.as_bytes(), &parsed_hash).is_ok() {
        // Reset lockout on success
        conn.execute("UPDATE users SET lockout_count = 0, last_failed_attempt = NULL WHERE id = ?", [id])
            .map_err(|e: rusqlite::Error| e.to_string())?;

        // Generate token pair
        let token_pair = generate_token_pair(id, &username)?;

        // Store session in memory for status tracking
        if let Some(state) = app_handle.try_state::<crate::AppState>() {
            state.session_store.store_session(token_pair.access_token.clone(), id, username.clone());
        }

        Ok(AuthResponse {
            success: true,
            token: Some(token_pair.access_token),
            refresh_token: Some(token_pair.refresh_token),
            user_id: Some(id),
            username: Some(username),
            access_expires_at: Some(token_pair.access_expires_at),
            refresh_expires_at: Some(token_pair.refresh_expires_at),
            message: "Login successful".to_string(),
        })
    } else {
        // Increment lockout on failure
        // Use RFC3339 for consistent parsing
        let now = Utc::now().to_rfc3339();
        conn.execute("UPDATE users SET lockout_count = lockout_count + 1, last_failed_attempt = ? WHERE id = ?", [now, id.to_string()])
            .map_err(|e: rusqlite::Error| e.to_string())?;

        NotificationService::dispatch(&app_handle, AppEvent::SecurityError(format!("Failed login attempt (Count: {}) for user '{}'", lockout_count + 1, username)));

        Ok(AuthResponse {
            success: false,
            token: None,
            refresh_token: None,
            user_id: None,
            username: None,
            access_expires_at: None,
            refresh_expires_at: None,
            message: "Invalid username or password".to_string(),
        })
    }
}

fn generate_token_pair(user_id: i32, username: &str) -> Result<TokenPair, String> {
    let now = Utc::now();
    let access_expiration = now.checked_add_signed(Duration::hours(ACCESS_TOKEN_EXPIRY_HOURS)).unwrap().timestamp() as usize;
    let refresh_expiration = now.checked_add_signed(Duration::days(REFRESH_TOKEN_EXPIRY_DAYS)).unwrap().timestamp() as usize;

    let access_claims = Claims { sub: username.to_string(), exp: access_expiration, token_type: "access".to_string(), user_id };
    let refresh_claims = Claims { sub: username.to_string(), exp: refresh_expiration, token_type: "refresh".to_string(), user_id };

    let access_token = encode(&Header::default(), &access_claims, &EncodingKey::from_secret(SECRET_KEY)).map_err(|e| e.to_string())?;
    let refresh_token = encode(&Header::default(), &refresh_claims, &EncodingKey::from_secret(REFRESH_SECRET_KEY)).map_err(|e| e.to_string())?;

    Ok(TokenPair { access_token, refresh_token, access_expires_at: access_expiration as i64, refresh_expires_at: refresh_expiration as i64 })
}

#[tauri::command]
pub fn refresh_access_token(app_handle: AppHandle, refresh_token: String) -> Result<RefreshResponse, String> {
    let validation = Validation::default();
    let token_data = decode::<Claims>(&refresh_token, &DecodingKey::from_secret(REFRESH_SECRET_KEY), &validation).map_err(|e| e.to_string())?;
    let claims = token_data.claims;
    
    if claims.token_type != "refresh" {
        return Ok(RefreshResponse { success: false, access_token: None, access_expires_at: None, message: "Invalid token type".to_string() });
    }

    if (claims.exp as i64) < Utc::now().timestamp() {
        return Ok(RefreshResponse { success: false, access_token: None, access_expires_at: None, message: "Refresh token expired".to_string() });
    }

    let access_expiration = Utc::now().checked_add_signed(Duration::hours(ACCESS_TOKEN_EXPIRY_HOURS)).unwrap().timestamp() as usize;
    let access_claims = Claims { sub: claims.sub.clone(), exp: access_expiration, token_type: "access".to_string(), user_id: claims.user_id };
    let access_token = encode(&Header::default(), &access_claims, &EncodingKey::from_secret(SECRET_KEY)).map_err(|e| e.to_string())?;

    // Re-populate session store for status tracking
    if let Some(state) = app_handle.try_state::<crate::AppState>() {
        state.session_store.store_session(access_token.clone(), claims.user_id, claims.sub.clone());
    }

    Ok(RefreshResponse { success: true, access_token: Some(access_token), access_expires_at: Some(access_expiration as i64), message: "Token refreshed successfully".to_string() })
}

#[tauri::command]
pub fn logout(app_handle: AppHandle, access_token: String, refresh_token: Option<String>, user_id: i32) -> Result<bool, String> {
    if let Some(state) = app_handle.try_state::<crate::AppState>() {
        state.session_store.remove_session(&access_token);
        if let Some(refresh) = &refresh_token { state.session_store.remove_session(refresh); }
    }
    let conn = get_db_connection(&app_handle)?;
    conn.execute("UPDATE users SET last_logout_at = CURRENT_TIMESTAMP WHERE id = ?", [user_id]).map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub fn validate_token(app_handle: AppHandle, token: String, token_type: String) -> Result<bool, String> {
    let secret = if token_type == "refresh" { REFRESH_SECRET_KEY } else { SECRET_KEY };
    let validation = Validation::default();
    match decode::<Claims>(&token, &DecodingKey::from_secret(secret), &validation) {
        Ok(token_data) => {
            let is_valid = token_data.claims.exp > Utc::now().timestamp() as usize;
            
            // If valid, ensure it's in the session store
            if is_valid {
                if let Some(state) = app_handle.try_state::<crate::AppState>() {
                    state.session_store.store_session(token.clone(), token_data.claims.user_id, token_data.claims.sub.clone());
                }
            }
            
            Ok(is_valid)
        },
        Err(_) => Ok(false),
    }
}

#[tauri::command]
pub fn change_master_password(app_handle: AppHandle, user_id: i32, current_password: String, new_password: String) -> Result<AuthResponse, String> {
    let conn = get_db_connection(&app_handle)?;
    let hash: String = conn.query_row("SELECT master_password_hash FROM users WHERE id = ?", [user_id], |row| row.get(0)).map_err(|_| "User not found".to_string())?;
    let parsed_hash = PasswordHash::new(&hash).map_err(|e| e.to_string())?;
    let argon2 = Argon2::default();

    if argon2.verify_password(current_password.as_bytes(), &parsed_hash).is_ok() {
        let salt = SaltString::generate(&mut OsRng);
        let new_hash = argon2.hash_password(new_password.as_bytes(), &salt).map_err(|e| e.to_string())?.to_string();
        conn.execute("UPDATE users SET master_password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", rusqlite::params![new_hash, user_id]).map_err(|e| e.to_string())?;
        NotificationService::dispatch(&app_handle, AppEvent::SecurityError("Master password successfully changed via protocol override.".to_string()));
        Ok(AuthResponse { success: true, token: None, refresh_token: None, user_id: None, username: None, access_expires_at: None, refresh_expires_at: None, message: "Master password updated".to_string() })
    } else {
        Ok(AuthResponse { success: false, token: None, refresh_token: None, user_id: None, username: None, access_expires_at: None, refresh_expires_at: None, message: "Verify command failed".to_string() })
    }
}
