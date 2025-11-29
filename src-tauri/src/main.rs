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
        None => "http://127.0.0.1:5000" // 开发环境默认本地服务器（使用IPv4地址避免解析问题）
    };

    println!("🌐 Using API_BASE_URL: {}", API_BASE_URL);

    let url = format!("{}/api/homework-cache", API_BASE_URL);
    println!("🔗 Full URL: {}", url);

    let client = reqwest::Client::new();
    let response = client
        .post(&url)
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
        None => "http://127.0.0.1:5000" // 使用IPv4地址避免解析问题
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

// Tauri command to ignore homework
#[tauri::command]
async fn ignore_homework(student_id: String, homework_id: String, course_name: String, title: String) -> Result<String, String> {
    println!("🙈 ignore_homework called for homework: {}", homework_id);

    const API_BASE_URL: &str = match option_env!("API_BASE_URL") {
        Some(url) => url,
        None => "http://127.0.0.1:5000" // 使用IPv4地址避免解析问题
    };

    let client = reqwest::Client::new();
    let response = client
        .post(format!("{}/api/ignore-homework", API_BASE_URL))
        .json(&serde_json::json!({
            "student_id": student_id,
            "homework_id": homework_id,
            "course_name": course_name,
            "title": title
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

    println!("✅ Homework ignored successfully");
    Ok(text)
}

// Tauri command to unignore homework
#[tauri::command]
async fn unignore_homework(student_id: String, homework_id: String) -> Result<String, String> {
    println!("👀 unignore_homework called for homework: {}", homework_id);

    const API_BASE_URL: &str = match option_env!("API_BASE_URL") {
        Some(url) => url,
        None => "http://127.0.0.1:5000" // 使用IPv4地址避免解析问题
    };

    let client = reqwest::Client::new();
    let response = client
        .post(format!("{}/api/unignore-homework", API_BASE_URL))
        .json(&serde_json::json!({
            "student_id": student_id,
            "homework_id": homework_id
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

    println!("✅ Homework unignored successfully");
    Ok(text)
}

// Tauri command to get ignored homeworks list
#[tauri::command]
async fn get_ignored_homeworks(student_id: String) -> Result<String, String> {
    println!("📋 get_ignored_homeworks called for student: {}", student_id);

    const API_BASE_URL: &str = match option_env!("API_BASE_URL") {
        Some(url) => url,
        None => "http://127.0.0.1:5000" // 使用IPv4地址避免解析问题
    };

    let client = reqwest::Client::new();
    let response = client
        .get(format!("{}/api/ignored-homeworks/{}", API_BASE_URL, student_id))
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

    println!("✅ Retrieved ignored homeworks list");
    Ok(text)
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            fetch_homework_cache,
            fetch_homework_full,
            ignore_homework,
            unignore_homework,
            get_ignored_homeworks
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
