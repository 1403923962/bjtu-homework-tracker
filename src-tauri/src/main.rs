// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Tauri command to fetch homework (cached)
#[tauri::command]
async fn fetch_homework_cache(student_id: String) -> Result<String, String> {
    println!("🔍 fetch_homework_cache called with student_id: {}", student_id);

    // API_BASE_URL is set at compile time via environment variable
    // Default to example domain if not set
    const API_BASE_URL: &str = match option_env!("API_BASE_URL") {
        Some(url) => url,
        None => "http://api.example.com" // 示例域名，需要配置环境变量
    };

    let client = reqwest::Client::new();
    let response = client
        .post(format!("{}/api/homework-cache", API_BASE_URL))
        .json(&serde_json::json!({
            "student_id": student_id
        }))
        .send()
        .await
        .map_err(|e| {
            println!("❌ Request failed: {}", e);
            format!("Request failed: {}", e)
        })?;

    println!("📊 Response status: {}", response.status());

    let text = response
        .text()
        .await
        .map_err(|e| {
            println!("❌ Failed to read response: {}", e);
            format!("Failed to read response: {}", e)
        })?;

    println!("✅ Response ({} bytes): {}", text.len(), text);
    Ok(text)
}

// Tauri command to fetch homework (full refresh)
#[tauri::command]
async fn fetch_homework_full(student_id: String, password: String, finish_status: Option<String>) -> Result<String, String> {
    println!("🔍 fetch_homework_full called with student_id: {}", student_id);

    let finish_status = finish_status.unwrap_or_else(|| "all".to_string());

    const API_BASE_URL: &str = match option_env!("API_BASE_URL") {
        Some(url) => url,
        None => "http://api.example.com"
    };

    let client = reqwest::Client::new();
    let response = client
        .post(format!("{}/api/homework-query", API_BASE_URL))
        .json(&serde_json::json!({
            "student_id": student_id,
            "password": password,
            "finish_status": finish_status
        }))
        .timeout(std::time::Duration::from_secs(120))
        .send()
        .await
        .map_err(|e| {
            println!("❌ Request failed: {}", e);
            format!("Request failed: {}", e)
        })?;

    println!("📊 Response status: {}", response.status());

    let text = response
        .text()
        .await
        .map_err(|e| {
            println!("❌ Failed to read response: {}", e);
            format!("Failed to read response: {}", e)
        })?;

    println!("✅ Response received ({} bytes): {}", text.len(), if text.len() > 200 { &text[..200] } else { &text });
    Ok(text)
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            fetch_homework_cache,
            fetch_homework_full
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
