// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::{Child, Command};
use std::sync::Mutex;
use tauri::{Manager, State};

// Backend server process state
struct BackendServer(Mutex<Option<Child>>);

// Start the Node.js backend server
fn start_backend_server(resource_path: Option<std::path::PathBuf>) -> Result<Child, String> {
    use std::env;
    use std::path::PathBuf;

    // Determine backend directory
    let backend_dir = if let Some(resource_dir) = resource_path {
        // Production: use resource directory
        println!("📦 Production mode - using resource directory");
        resource_dir.join("backend-bun")
    } else {
        // Development: use project root
        println!("🔧 Development mode - using project root");
        let current_dir = env::current_dir()
            .map_err(|e| format!("Failed to get current directory: {}", e))?;

        // Check if we're in src-tauri, if so go up one level
        let project_root = if current_dir.ends_with("src-tauri") {
            current_dir.parent()
                .ok_or("Failed to get parent directory")?
                .to_path_buf()
        } else {
            current_dir
        };
        project_root.join("backend-bun")
    };

    println!("Backend directory: {:?}", backend_dir);

    if !backend_dir.exists() {
        return Err(format!("Backend directory not found: {:?}", backend_dir));
    }

    // Find node executable
    #[cfg(target_os = "windows")]
    let node_command = "node";

    #[cfg(not(target_os = "windows"))]
    let node_command = "node";

    // Use tsx for development, node_modules for production
    #[cfg(target_os = "windows")]
    let tsx_path = backend_dir.join("node_modules\\.bin\\tsx.cmd");

    #[cfg(not(target_os = "windows"))]
    let tsx_path = backend_dir.join("node_modules/.bin/tsx");

    let server_path = backend_dir.join("server.ts");

    let (command, args) = if tsx_path.exists() {
        println!("✅ Using tsx: {:?}", tsx_path);
        (tsx_path, vec![server_path])
    } else {
        println!("⚠️ tsx not found, using node directly");
        (PathBuf::from(node_command), vec![server_path])
    };

    println!("🚀 Starting backend server: {:?} {:?}", command, args);

    // Check if Playwright browsers are installed
    let playwright_check = Command::new(node_command)
        .args(&["node_modules/.bin/playwright", "install", "chromium"])
        .current_dir(&backend_dir)
        .output();

    if let Ok(output) = playwright_check {
        if output.status.success() {
            println!("✅ Playwright browsers ready");
        }
    }

    let child = Command::new(command)
        .args(args)
        .current_dir(&backend_dir)
        .env("PORT", "5000")
        .env("NODE_ENV", "production")
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start backend server: {}", e))?;

    println!("✅ Backend server started with PID: {:?}", child.id());

    Ok(child)
}

// Stop the backend server
fn stop_backend_server(server: &mut Option<Child>) {
    if let Some(mut child) = server.take() {
        println!("Stopping backend server...");
        let _ = child.kill();
        let _ = child.wait();
        println!("Backend server stopped");
    }
}

// Tauri command to check backend health
#[tauri::command]
async fn check_backend_health() -> Result<String, String> {
    let client = reqwest::Client::new();
    let response = client
        .get("http://localhost:5000/health")
        .send()
        .await
        .map_err(|e| format!("Health check failed: {}", e))?;

    let status = response.status();
    let body = response
        .text()
        .await
        .unwrap_or_else(|_| "No response body".to_string());

    if status.is_success() {
        Ok(body)
    } else {
        Err(format!("Health check returned status: {}", status))
    }
}

// Tauri command to fetch homework (cached)
#[tauri::command]
async fn fetch_homework_cache(student_id: String) -> Result<String, String> {
    println!("🔍 fetch_homework_cache called with student_id: {}", student_id);

    let client = reqwest::Client::new();
    let response = client
        .post("http://127.0.0.1:5000/api/homework-cache")
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

    let client = reqwest::Client::new();
    let response = client
        .post("http://127.0.0.1:5000/api/homework-query")
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
        .manage(BackendServer(Mutex::new(None)))
        .setup(|app| {
            // Start backend server on app startup
            let server_state: State<BackendServer> = app.state();

            // Get resource directory (None in development)
            let resource_path = if cfg!(debug_assertions) {
                None
            } else {
                app.path_resolver()
                    .resource_dir()
            };

            match start_backend_server(resource_path) {
                Ok(child) => {
                    *server_state.0.lock().unwrap() = Some(child);
                    println!("✅ Backend server started successfully");
                }
                Err(e) => {
                    eprintln!("❌ Failed to start backend server: {}", e);
                    // Don't fail the app, just warn
                }
            }

            // Wait a bit for server to start
            std::thread::sleep(std::time::Duration::from_secs(2));

            Ok(())
        })
        .on_window_event(|event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event.event() {
                // Stop backend server on app close
                let server_state: State<BackendServer> = event.window().state();
                stop_backend_server(&mut server_state.0.lock().unwrap());
            }
        })
        .invoke_handler(tauri::generate_handler![
            check_backend_health,
            fetch_homework_cache,
            fetch_homework_full
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
