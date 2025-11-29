# 项目开发进度 - 作业隐藏功能

**最后更新时间**: 2025-11-09 17:15

## 本次会话完成的工作（2025-11-09）

### ✅ 修复 Tauri 应用无法连接后端的问题

**问题描述**：
- Tauri 应用无法连接到后端 API (localhost:5000)
- 返回 503 Service Unavailable 错误
- 后端服务器正常运行但完全收不到请求

**根本原因**：
**IPv4/IPv6 地址解析冲突** - Windows 系统上 `localhost` 被解析为 IPv6 地址 `::1`，而后端服务器只监听 IPv4 地址 `127.0.0.1`

**解决方案**：
将所有 Tauri Rust 代码中的 API_BASE_URL 默认值从 `http://localhost:5000` 改为 `http://127.0.0.1:5000`

**修改文件**：`src-tauri/src/main.rs`（5处修改）

```rust
// 修改前
const API_BASE_URL: &str = match option_env!("API_BASE_URL") {
    Some(url) => url,
    None => "http://localhost:5000"
};

// 修改后
const API_BASE_URL: &str = match option_env!("API_BASE_URL") {
    Some(url) => url,
    None => "http://127.0.0.1:5000" // 使用IPv4地址避免解析问题
};
```

**验证结果**：
- ✅ Tauri 应用成功连接到后端
- ✅ 后端收到请求并正确响应
- ✅ 返回正常的业务错误（404 无缓存数据）而不是连接错误（503）

**技术要点**：
1. 在 Windows 上，`localhost` 可能优先解析为 IPv6 地址
2. Node.js 服务器默认监听 IPv4 和 IPv6
3. Rust reqwest 客户端在某些情况下会优先使用 IPv6
4. 明确使用 `127.0.0.1` 强制使用 IPv4 避免解析问题

---

## 上次会话完成的工作（2025-11-08）

### ✅ 1. 前端：纯 localStorage 作业隐藏功能（完整实现）
**文件**: `src/App.tsx`

**架构调整**：原计划使用后端 API 存储，最终采用**纯前端 localStorage 方案**，更简单高效。

#### 1.1 新增状态和功能
```typescript
// 状态管理
const [ignoredHomeworks, setIgnoredHomeworks] = useState<any[]>([])  // 已隐藏作业列表
const [loadingIgnored, setLoadingIgnored] = useState(false)

// 核心功能函数
- handleIgnoreHomework(hw)         // 隐藏作业（保存到 localStorage）
- handleUnignoreHomework(id)       // 恢复作业（从 localStorage 删除）
- isHomeworkIgnored(id)            // 检查作业是否已隐藏
- filteredHomeworks                // 自动过滤已隐藏的作业
```

#### 1.2 UI 组件
- ✅ **作业列表隐藏按钮**：每个作业右侧添加"眼睛斜杠"图标
- ✅ **已隐藏作业页面**：新增 `renderIgnoredView()` 视图
- ✅ **底部导航栏**：添加"已隐藏"选项卡，带红色计数 badge
- ✅ **数据持久化**：使用 `localStorage`，键名：`ignored_homeworks_{学号}`

#### 1.3 数据存储格式
```json
// localStorage key: ignored_homeworks_23211173
[
  {
    "homework_id": "hw123",
    "course_name": "高等数学",
    "title": "作业1",
    "ignored_at": 1699437600000
  }
]
```

**优势**：
- ✅ 无需后端 API
- ✅ 无需 Tauri 命令层
- ✅ 数据本地存储，隐私性好
- ✅ 响应速度快

---

### ✅ 2. 后端配置修复
**文件**: `backend-bun/package.json`

**问题**：`dev:node` 脚本错误指向 `index.ts`
**修复**：改为 `tsx watch server.ts`

```json
{
  "scripts": {
    "dev:node": "tsx watch server.ts"  // ← 修复
  }
}
```

**后端服务器状态**: ✅ 正在运行 (localhost:5000)

---

### ✅ 3. Tauri 配置修复
**文件**: `src-tauri/src/main.rs`

**问题**：API_BASE_URL 默认值为 `http://api.example.com`（不存在）
**修复**：改为 `http://localhost:5000`

```rust
const API_BASE_URL: &str = match option_env!("API_BASE_URL") {
    Some(url) => url,
    None => "http://localhost:5000"  // ← 修复（5处）
};
```

**修改位置**：
- Line 11: `fetch_homework_cache`
- Line 50: `fetch_homework_full`
- Line 90: `ignore_homework`（已废弃）
- Line 130: `unignore_homework`（已废弃）
- Line 168: `get_ignored_homeworks`（已废弃）

---

## 遗留问题

### ⚠️ Tauri 编译缓存问题

**现象**：
- Rust 代码已修改
- 编译完成但还在使用旧的 API 地址
- 返回 503 Service Unavailable

**原因**：
- 编译缓存未清理
- 旧的二进制文件被锁定（.exe 进程未关闭）

**解决方案**（下次会话）：
```bash
# 方案1：手动清理
cd bjtu-tracker-desktop
cargo clean --manifest-path src-tauri/Cargo.toml
npm run tauri:dev

# 方案2：重启电脑后
# 终端1
cd bjtu-tracker-desktop/backend-bun && npm run dev:node

# 终端2
cd bjtu-tracker-desktop && npm run tauri:dev
```

---

## 代码废弃说明

### 后端 API（已实现但未使用）
以下后端功能已完整实现，但**前端采用纯 localStorage 方案后不再需要**：

**文件**: `backend-bun/ignored_homework.ts`
- IgnoredHomeworkManager 类（完整实现）
- 数据存储：`cache/ignored/ignored_<hash>.json`

**API 端点**: `backend-bun/index.ts`
- POST `/api/ignore-homework`
- POST `/api/unignore-homework`
- GET `/api/ignored-homeworks/:id`

**Tauri 命令**: `src-tauri/src/main.rs`
- `ignore_homework()`
- `unignore_homework()`
- `get_ignored_homeworks()`

**状态**：代码保留，可随时启用（如需服务器端同步）

---

## 项目结构总览

```
bjtu-tracker-desktop/
├── CLAUDE.md                           ← 项目文档
├── PROGRESS.md                         ← 本文件（进度跟踪）
├── src/
│   └── App.tsx                         ← ✅ 更新：添加隐藏功能（localStorage）
├── src-tauri/src/
│   └── main.rs                         ← ✅ 更新：修复 API_BASE_URL
├── backend-bun/
│   ├── package.json                    ← ✅ 修复：dev:node 脚本
│   ├── server.ts                       ← 后端入口
│   ├── index.ts                        ← API 路由（包含废弃的忽略 API）
│   ├── ignored_homework.ts             ← 废弃：忽略管理模块
│   └── cache/ignored/                  ← 废弃：服务器端存储
```

---

## 运行状态

### 后端服务器
```
✅ 状态: 正在运行
📡 端口: localhost:5000
🔧 命令: npm run dev:node

可用端点:
- GET  /health                       ✅ 正常
- POST /api/homework-cache           ✅ 正常
- POST /api/homework-query           ✅ 正常
- POST /api/ignore-homework          ⚠️  已实现但未使用
- POST /api/unignore-homework        ⚠️  已实现但未使用
- GET  /api/ignored-homeworks/:id    ⚠️  已实现但未使用
```

### 前端 Tauri
```
⚠️ 状态: 编译完成但存在缓存问题
📍 问题: 还在使用旧的 API 地址
🔧 解决: 需要清理缓存后重新编译
```

### 前端 Vite（浏览器）
```
✅ 状态: 正在运行
📡 端口: localhost:1420
⚠️ 限制: window.__TAURI_IPC__ 不存在，无法调用 invoke()
         仅可查看 UI，无法测试完整功能
```

---

## 下次对话任务

### 1. 清理编译缓存并重启
```bash
# 关闭所有 Tauri 窗口和进程
# 清理缓存
cargo clean --manifest-path src-tauri/Cargo.toml

# 重新启动
npm run tauri:dev
```

### 2. 完整功能测试
- [ ] 登录并获取作业列表
- [ ] 点击"眼睛斜杠"隐藏作业
- [ ] 验证作业从列表消失
- [ ] 切换到"已隐藏"选项卡查看
- [ ] 点击"眼睛"恢复作业
- [ ] 刷新应用验证数据持久化

### 3. 验证 API 连接
- [ ] 确认调用 `http://localhost:5000`（不是 `api.example.com`）
- [ ] 测试登录流程
- [ ] 测试缓存查询

---

## 技术要点

### 隐藏功能数据流（纯前端）
```
用户点击"眼睛斜杠"图标
  ↓
handleIgnoreHomework(hw)
  ↓
localStorage.setItem('ignored_homeworks_23211173', JSON.stringify([...]))
  ↓
setIgnoredHomeworks([...])  // 更新 React 状态
  ↓
filteredHomeworks 自动过滤（不显示已隐藏作业）
  ↓
UI 实时更新
```

### localStorage vs 后端 API

| 方案 | 优点 | 缺点 |
|-----|------|------|
| **localStorage（已采用）** | 简单、快速、无需网络、隐私性好 | 仅本地、无跨设备同步 |
| 后端 API（已实现但未用） | 跨设备同步、服务器端管理 | 复杂、需要网络、隐私性差 |

**当前选择**：localStorage（符合桌面应用特性）

---

## 关键发现

### Tauri 开发注意事项
1. **浏览器 vs Tauri 环境**：
   - `http://localhost:1420` 在浏览器中打开 → `invoke()` 不可用
   - Tauri 应用窗口才有完整 API

2. **编译缓存问题**：
   - 修改 Rust 代码后需要完全清理缓存
   - 否则可能使用旧的编译结果

3. **API_BASE_URL 是编译时常量**：
   - 不能运行时修改
   - 修改后必须重新编译

---

**状态总结**：功能代码 100% 完成，待清理缓存后测试验证！🎉
