use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use jsonwebtoken::{encode, Header, EncodingKey};
use serde::{Deserialize, Serialize};
use crate::db::get_db_connection;
use tauri::AppHandle;
use chrono::Utc;

const SECRET_KEY: &[u8] = b"coda_secret_key_change_this_for_production"; // In real desktop app, we might use OS keychain
const MAX_LOCKOUT_ATTEMPTS: i32 = 5;

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub exp: usize,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AuthResponse {
    pub success: bool,
    pub token: Option<String>,
    pub user_id: Option<i32>,
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
        [username, password_hash],
    ) {
        Ok(_) => Ok(AuthResponse {
            success: true,
            token: None,
            user_id: None,
            message: "User created successfully. Please sign in.".to_string(),
        }),
        Err(e) => Ok(AuthResponse {
            success: false,
            token: None,
            user_id: None,
            message: format!("Signup failed: {}", e),
        }),
    }
}

#[tauri::command]
pub fn login(app_handle: AppHandle, username: String, password: String) -> Result<AuthResponse, String> {
    let conn = get_db_connection(&app_handle)?;
    
    let mut stmt = conn.prepare("SELECT id, master_password_hash, lockout_count, last_failed_attempt FROM users WHERE username = ?")
        .map_err(|e| e.to_string())?;
    
    let user_data = stmt.query_row([&username], |row| {
        Ok((
            row.get::<_, i32>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, i32>(2)?,
            row.get::<_, Option<String>>(3)?,
        ))
    }).map_err(|_| "Invalid username or password".to_string())?;

    let (id, hash, lockout_count, _last_failed) = user_data;

    if lockout_count >= MAX_LOCKOUT_ATTEMPTS {
        return Ok(AuthResponse {
            success: false,
            token: None,
            user_id: None,
            message: "Account locked due to too many failed attempts. Support needed.".to_string(),
        });
    }

    let parsed_hash = PasswordHash::new(&hash).map_err(|e| e.to_string())?;
    let argon2 = Argon2::default();

    if argon2.verify_password(password.as_bytes(), &parsed_hash).is_ok() {
        // Reset lockout on success
        conn.execute("UPDATE users SET lockout_count = 0, last_failed_attempt = NULL WHERE username = ?", [&username])
            .map_err(|e: rusqlite::Error| e.to_string())?;

        // Generate JWT
        let expiration = Utc::now()
            .checked_add_signed(chrono::Duration::hours(24))
            .expect("valid timestamp")
            .timestamp() as usize;

        let claims = Claims {
            sub: username.clone(),
            exp: expiration,
        };

        let token = encode(&Header::default(), &claims, &EncodingKey::from_secret(SECRET_KEY))
            .map_err(|e: jsonwebtoken::errors::Error| e.to_string())?;

        Ok(AuthResponse {
            success: true,
            token: Some(token),
            user_id: Some(id),
            message: "Login successful".to_string(),
        })
    } else {
        // Increment lockout on failure
        conn.execute("UPDATE users SET lockout_count = lockout_count + 1, last_failed_attempt = CURRENT_TIMESTAMP WHERE username = ?", [&username])
            .map_err(|e: rusqlite::Error| e.to_string())?;

        Ok(AuthResponse {
            success: false,
            token: None,
            user_id: None,
            message: "Invalid username or password".to_string(),
        })
    }
}

#[tauri::command]
pub fn check_auth(_token: String) -> bool {
    // This would verify the JWT token
    // For local desktop app, we can store it in Memory or Secure Storage
    true
}
