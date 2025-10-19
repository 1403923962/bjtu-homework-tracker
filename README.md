# 作业追踪器 - 桌面版 🖥️

> 轻量级作业管理桌面应用，支持云端SaaS部署

![Tauri](https://img.shields.io/badge/Tauri-1.5-FFC131?logo=tauri)
![React](https://img.shields.io/badge/React-18-61dafb?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6?logo=typescript)
![License](https://img.shields.io/badge/License-MIT-green.svg)

## ✨ 特性

### 🪶 极致轻量
- **仅 2.3MB** - 云端模式安装包
- **快速启动** - 秒开无等待
- **低资源占用** - 内存仅50MB

### 🔒 安全可靠
- **HTTPS加密** - 全程加密通信
- **输入验证** - 前端静默拦截
- **权限最小化** - 沙箱隔离运行

### 🎨 现代UI
- **磨砂玻璃** - Glassmorphism 设计
- **流畅动画** - Framer Motion 驱动
- **暗色模式** - 护眼主题切换
- **无边框窗口** - 现代化体验

## 📥 下载安装

### 快速开始（推荐）

1. 下载最新版安装包（仅2.3MB）
2. 运行安装程序
3. 输入学号和密码即可使用

### 系统要求
- Windows 10/11 (64-bit)
- macOS 10.15+
- Linux (多数发行版)

## 🏗️ 架构说明

### 云端SaaS模式（默认）

```
桌面应用（2.3MB） ──HTTPS──> 云API服务器
                            ├── Playwright爬虫
                            ├── OCR识别
                            └── 数据缓存
```

**优势**：
- ✅ 安装包小（2.3MB）
- ✅ 无需配置环境
- ✅ 自动更新维护

## 🚀 自己部署

### 本地开发

```bash
# 1. 克隆仓库
git clone https://github.com/YOUR_USERNAME/homework-tracker.git
cd homework-tracker

# 2. 安装依赖
npm install

# 3. 启动后端（另一个终端）
cd backend-bun
npm install
npm run dev:node

# 4. 启动前端
npm run tauri:dev
```

### 云端部署

详见 [部署文档](./DEPLOYMENT.md)

**快速部署：**
```bash
# 上传后端到服务器
cd backend-bun
scp -r . user@your-server:/var/www/homework-tracker

# 服务器上安装依赖
ssh user@your-server
cd /var/www/homework-tracker
npm install
npx playwright install chromium

# 使用PM2启动
pm2 start server.ts --name homework-tracker
pm2 save && pm2 startup
```

### 构建安装包

```bash
# 指定API地址构建
API_BASE_URL="https://your-domain.com" npm run tauri:build
```

打包后的文件在 `src-tauri/target/release/bundle/`

## 📁 项目结构

```
bjtu-tracker-desktop/
├── src/                    # React 前端代码
│   ├── App.tsx            # 主应用组件
│   ├── main.tsx           # React 入口
│   └── index.css          # 全局样式
├── src-tauri/             # Tauri 后端代码
│   ├── src/
│   │   └── main.rs        # Rust 主文件
│   ├── Cargo.toml         # Rust 依赖配置
│   ├── tauri.conf.json    # Tauri 配置
│   └── icons/             # 应用图标
├── index.html             # HTML 入口
├── vite.config.ts         # Vite 配置
├── tailwind.config.js     # TailwindCSS 配置
└── package.json           # NPM 依赖
```

## 🎯 核心功能

### 无边框窗口
- 自定义标题栏
- 拖拽移动窗口
- 最小化/关闭按钮

### 窗口控制
```typescript
import { appWindow } from '@tauri-apps/api/window'

// 最小化
appWindow.minimize()

// 关闭
appWindow.close()
```

### 透明窗口
在 `tauri.conf.json` 中配置：
```json
{
  "tauri": {
    "windows": [{
      "decorations": false,
      "transparent": true
    }]
  }
}
```

## 🔧 配置说明

### Tauri 配置 (tauri.conf.json)

```json
{
  "build": {
    "devPath": "http://localhost:1420",  // 开发服务器
    "distDir": "../dist"                  // 构建输出目录
  },
  "package": {
    "productName": "BJTU作业追踪器",
    "version": "1.0.0"
  },
  "tauri": {
    "bundle": {
      "identifier": "com.bjtu.homework-tracker"
    },
    "windows": [{
      "width": 1024,
      "height": 768,
      "decorations": false,    // 无边框
      "transparent": true      // 透明窗口
    }]
  }
}
```

## 📊 性能对比

| 指标 | Electron | Tauri | 差异 |
|------|----------|-------|------|
| 安装包大小 | ~120MB | **~4MB** | 30倍 |
| 内存占用 | ~200MB | **~50MB** | 4倍 |
| 启动速度 | ~2s | **~0.5s** | 4倍 |
| CPU 使用 | 高 | **低** | 明显 |

## 🎨 UI 特性

### 登录界面
- 3D 浮动背景球体
- 旋转 Logo 动画
- 流动渐变标题
- 磨砂玻璃卡片

### 作业列表
- 2列网格布局
- 紧急作业高亮
- 实时倒计时
- 提交进度条
- 悬浮动画

### 自定义标题栏
- 拖拽区域
- 最小化按钮
- 关闭按钮
- 作业计数显示

## 🐛 常见问题

### Q: 首次编译很慢？
A: 这是正常的，Rust 需要编译大量依赖。首次编译可能需要 5-10 分钟，后续会很快。

### Q: Windows 上无法编译？
A: 需要安装 Visual Studio Build Tools 或 Visual Studio 2019+，并包含 C++ 工作负载。

### Q: macOS 提示"无法打开，因为来自身份不明的开发者"？
A: 右键点击应用 → 打开 → 确认打开。或在"安全性与隐私"中允许。

### Q: 登录失败？
A: 确保后端服务 (http://localhost:3001) 已启动。

### Q: 图标显示不正常？
A: 运行 `npm run tauri icon app-icon.png` 重新生成图标。

## 🚢 部署

### 自动更新
Tauri 支持内置的自动更新机制，详见[官方文档](https://tauri.app/v1/guides/distribution/updater/)。

### GitHub Actions
可以使用 GitHub Actions 自动构建和发布：

```yaml
name: Build
on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    strategy:
      matrix:
        platform: [windows-latest, ubuntu-latest, macos-latest]
    runs-on: ${{ matrix.platform }}
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - uses: dtolnay/rust-toolchain@stable
      - run: npm install
      - run: npm run tauri build
```

## 📝 TODO

- [ ] 添加系统托盘图标
- [ ] 支持开机自启动
- [ ] 添加桌面通知
- [ ] 离线缓存功能
- [ ] 快捷键支持
- [ ] 多窗口管理

## 🤝 贡献

欢迎提交 Issue 和 PR！

## 📄 许可证

MIT License

## 🙏 致谢

- [Tauri](https://tauri.app/) - 桌面应用框架
- [React](https://react.dev/) - UI 框架
- [Framer Motion](https://www.framer.com/motion/) - 动画库
- [TailwindCSS](https://tailwindcss.com/) - CSS 框架

---

**⚡ Powered by Tauri + React + Rust ⚡**

体积小 · 性能强 · 安全好
