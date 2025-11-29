# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BJTU Homework Tracker Desktop - A lightweight desktop application for tracking homework assignments from Beijing Jiaotong University's educational platform. Uses a cloud SaaS architecture where the desktop app communicates with a backend API server that handles web scraping, OCR, and data caching.

**Stack:**
- Frontend: React 18 + TypeScript + Tauri (Rust)
- Backend: Hono + Playwright + Node.js/Bun
- OCR: ddddocr-node (fallback: Tesseract.js)
- Build: Vite + Tailwind CSS + Framer Motion

## Development Commands

### Frontend (Desktop App)
```bash
# Development (runs both Vite dev server and Tauri)
npm run tauri:dev

# Production build (creates installer)
npm run tauri:build

# Build with custom API endpoint
API_BASE_URL="https://your-domain.com" npm run tauri:build

# Frontend only (without Tauri)
npm run dev      # Start Vite dev server
npm run build    # Build frontend only
```

### Backend API Server
```bash
cd backend-bun

# Development with Node.js (hot reload)
npm run dev:node

# Development with Bun (hot reload)
npm run dev

# Production with Node.js
npm start

# Production with Bun
bun run index.ts

# Install Playwright browser dependencies (required on first setup)
npx playwright install chromium
npx playwright install-deps chromium  # Install system dependencies
```

### Common Development Workflow
```bash
# Terminal 1: Start backend
cd backend-bun && npm run dev:node

# Terminal 2: Start frontend + Tauri
npm run tauri:dev
```

## Architecture

### Three-Layer Architecture

```
┌─────────────────────────────────────────┐
│  Desktop App (Tauri + React)            │
│  - src/App.tsx: Main UI component       │
│  - src-tauri/src/main.rs: Rust backend  │
└──────────────┬──────────────────────────┘
               │ HTTPS/HTTP
               │ API_BASE_URL (compile-time)
┌──────────────▼──────────────────────────┐
│  API Server (Hono + Node.js)            │
│  - backend-bun/index.ts: API routes     │
│  - backend-bun/server.ts: Server entry  │
│  - backend-bun/cache/: Data cache       │
└──────────────┬──────────────────────────┘
               │ Playwright automation
               │
┌──────────────▼──────────────────────────┐
│  BJTU Educational System                │
│  - CAS authentication (with captcha)    │
│  - Course & homework APIs               │
└─────────────────────────────────────────┘
```

### Key Components

#### Desktop App (Tauri)
- **src-tauri/src/main.rs**: Defines Tauri commands that the frontend calls
  - `fetch_homework_cache`: Fast endpoint, returns cached data
  - `fetch_homework_full`: Slow endpoint, performs full login + scrape + cache refresh
  - API_BASE_URL is set at compile time via environment variable

#### Backend API Server
- **backend-bun/index.ts**: Main API logic and routes
  - POST `/api/homework-cache`: Returns cached data (fast, <100ms)
  - POST `/api/homework-query`: Full refresh (slow, 30-120s due to login + scraping)
  - Uses CacheManager to store/retrieve data per student_id

- **backend-bun/login.ts**: CAS authentication automation
  - Uses Playwright to automate browser login
  - OCR for captcha recognition (ddddocr-node with Tesseract.js fallback)
  - Returns browser context with authenticated session
  - **Important**: Has retry logic and timeout handling for slow CAS responses

- **backend-bun/bjtu_client_playwright.ts**: BJTU API client
  - Maintains browser session throughout all API calls
  - Extracts sessionId from page JavaScript (required for homework API)
  - Methods: login(), getCurrentSemester(), getCourses(), getHomeworkForCourse()

- **backend-bun/cache_manager.ts**: Caching layer
  - Stores homework data by student_id (MD5 hashed filenames)
  - Cache location: `backend-bun/cache/homework_<hash>.json`
  - Ignored homework stored in: `backend-bun/cache/ignored/`

- **backend-bun/homework_service.ts**: Clean homework service abstraction
  - Provides typed interfaces: Homework, Course, HomeworkSummary
  - Categorizes by type: homework, report, experiment
  - Calculates urgency and overdue status

### Data Flow

1. **Initial Login (Slow Path - 30-120s)**
   ```
   User enters credentials → Tauri calls fetch_homework_full →
   API Server: login.ts (Playwright + OCR) → bjtu_client_playwright.ts (scrape data) →
   cache_manager.ts (save) → Return to Tauri → Display in React
   ```

2. **Subsequent Access (Fast Path - <100ms)**
   ```
   User opens app → Tauri calls fetch_homework_cache →
   API Server: cache_manager.ts (read cache) → Return to Tauri → Display in React
   ```

3. **Refresh Data**
   ```
   User clicks refresh → Same as Initial Login → Updates cache
   ```

### Important Implementation Details

#### CAS Login Fault Tolerance
- Located in: `backend-bun/login.ts`
- The BJTU CAS authentication system can be slow or unresponsive
- Login flow uses extended timeouts (120s) and retry logic
- Multiple OCR attempts with fallback to Tesseract.js if ddddocr-node fails
- Handles various CAS redirect scenarios and URL patterns

#### SessionId Extraction
- Located in: `backend-bun/bjtu_client_playwright.ts`
- The homework API requires a sessionId that exists in page JavaScript
- The sessionId is NOT in cookies or localStorage - it's in window.sessionId
- Must wait for page JavaScript to fully load (5s + networkidle)
- SessionId changes over time on the page, so we wait for it to stabilize (3 consecutive identical values)

#### Homework Ignore/Filter Feature
- Users can ignore specific homework items (e.g., expired ones they can't submit)
- Ignored homework is stored per student in `backend-bun/cache/ignored/`
- According to todo list, the ignore management API and Tauri commands are implemented
- Pending work: Frontend UI for viewing/managing ignored homework list

#### OCR Service
- Primary: ddddocr-node (Node.js native, no Python dependency)
- Fallback: Tesseract.js (JavaScript OCR library)
- Captcha images saved to `debug_page.png` for debugging
- File: `backend-bun/ocr_service_node.ts`

## Environment Variables

### Backend
- `PORT`: Server port (default: 5000)
- `NODE_ENV`: Environment mode

### Frontend (Compile-time)
- `API_BASE_URL`: Backend API endpoint
  - Development: `http://localhost:5000` (default in Tauri config)
  - Production: Set via environment variable before build
  - Example: `API_BASE_URL="https://api.example.com" npm run tauri:build`
  - Configured in: `src-tauri/src/main.rs` (Rust compile-time constant)

## Deployment

### Development Setup
1. Install dependencies: `npm install` (root) and `cd backend-bun && npm install`
2. Install Playwright browser: `cd backend-bun && npx playwright install chromium --with-deps`
3. Start backend: `cd backend-bun && npm run dev:node`
4. Start frontend: `npm run tauri:dev`

### Production Deployment

#### Backend Server (Cloud)
```bash
# Upload to server
scp -r backend-bun user@server:/var/www/app

# On server
cd /var/www/app
npm install
npx playwright install chromium --with-deps
PORT=5000 pm2 start server.ts --name homework-api
pm2 save && pm2 startup
```

#### Desktop App Distribution
```bash
# Build with production API endpoint
API_BASE_URL="https://your-api-domain.com" npm run tauri:build

# Output location: src-tauri/target/release/bundle/
# Windows: .msi or .exe installer
# macOS: .dmg or .app bundle
# Linux: .deb, .AppImage, etc.
```

### HTTPS Setup (Nginx)
See README.md for full Nginx configuration with SSL/TLS setup using Let's Encrypt.

## Common Issues

### Playwright Installation Failures
```bash
# Manual installation with dependencies
npx playwright install chromium --with-deps

# Using Chinese mirror (if needed)
export PLAYWRIGHT_DOWNLOAD_HOST=https://npmmirror.com/mirrors/playwright/
npm install playwright
```

### CAS Login Timeouts
- The CAS system can be slow (30-120s response times)
- Login timeout is set to 120s in `login.ts`
- Retry logic is built-in for failed captcha recognition
- Check `debug_page.png` to see what the automation captured

### SessionId Extraction Issues
- If homework API returns empty data, check sessionId extraction
- Must wait for page JavaScript to fully initialize
- Located in `bjtu_client_playwright.ts:getSessionIdFromAPI()`
- Verify by checking browser console logs

### Cache Issues
- Cache files stored in `backend-bun/cache/`
- Named by MD5 hash of student_id
- Delete cache files to force refresh
- Check cache age with CacheManager.getAge()

## Testing

Currently no automated tests. Manual testing workflow:
1. Start backend server
2. Start Tauri dev
3. Test login with valid credentials
4. Verify homework data appears
5. Test refresh functionality
6. Verify cache loading on restart

## Project Structure Notes

```
bjtu-tracker-desktop/
├── src/                          # React frontend source
│   ├── App.tsx                   # Main UI component (single file app)
│   └── main.tsx                  # React entry point
├── src-tauri/                    # Tauri (Rust) app
│   ├── src/main.rs               # Tauri commands & API bridge
│   ├── tauri.conf.json           # Tauri configuration
│   ├── Cargo.toml                # Rust dependencies
│   └── icons/                    # App icons
├── backend-bun/                  # Backend API server
│   ├── index.ts                  # Main API routes & logic
│   ├── server.ts                 # Server entry (Bun/Node.js)
│   ├── login.ts                  # CAS authentication automation
│   ├── bjtu_client_playwright.ts # BJTU API client (browser-based)
│   ├── cache_manager.ts          # Data caching layer
│   ├── homework_service.ts       # Homework service abstraction
│   ├── ocr_service_node.ts       # OCR captcha recognition
│   ├── setup-playwright.ts       # Playwright setup helper
│   ├── cache/                    # Cache directory
│   │   ├── homework_*.json       # Cached homework data
│   │   └── ignored/              # Ignored homework storage
│   └── package.json              # Backend dependencies
├── package.json                  # Frontend dependencies & scripts
├── vite.config.ts                # Vite configuration
├── tailwind.config.js            # Tailwind CSS configuration
└── README.md                     # Deployment & usage guide
```

## Code Patterns

### Adding a New API Endpoint

1. **Add route in backend-bun/index.ts**
```typescript
app.post('/api/new-endpoint', async (c) => {
  try {
    const body = await c.req.json()
    // Process request
    return c.json({ success: true, data: result })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})
```

2. **Add Tauri command in src-tauri/src/main.rs**
```rust
#[tauri::command]
async fn new_command(param: String) -> Result<String, String> {
    const API_BASE_URL: &str = match option_env!("API_BASE_URL") {
        Some(url) => url,
        None => "http://api.example.com"
    };

    let client = reqwest::Client::new();
    let response = client
        .post(format!("{}/api/new-endpoint", API_BASE_URL))
        .json(&serde_json::json!({ "param": param }))
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    let text = response.text().await
        .map_err(|e| format!("Failed to read response: {}", e))?;

    Ok(text)
}
```

3. **Register command in main()**
```rust
tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
        fetch_homework_cache,
        fetch_homework_full,
        new_command  // Add here
    ])
```

4. **Call from React in src/App.tsx**
```typescript
import { invoke } from '@tauri-apps/api/tauri'

const result = await invoke('new_command', { param: 'value' }) as string
const data = JSON.parse(result)
```

### Modifying the Playwright Scraping Logic

Key files to modify:
- `backend-bun/bjtu_client_playwright.ts`: Main scraping logic
- `backend-bun/login.ts`: Login automation

Always maintain browser context throughout the session to preserve cookies and sessionId.

## Security Notes

- **No credentials stored**: Passwords are only sent to API server during login
- **Local storage**: Student ID cached in localStorage for convenience
- **API communication**: Uses HTTPS in production (configured via API_BASE_URL)
- **Playwright**: Runs in headless mode, no GUI exposure
- **Cache**: Stored locally, hashed by student_id (MD5)

## License

MIT License - For educational purposes only
