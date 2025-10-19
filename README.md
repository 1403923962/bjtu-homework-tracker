# 作业追踪器 - 桌面版 🖥️

> 轻量级作业管理桌面应用，支持云端SaaS部署

> ⚠️ **仅供学习交流使用，请勿用于商业用途**

![Tauri](https://img.shields.io/badge/Tauri-1.5-FFC131?logo=tauri)
![React](https://img.shields.io/badge/React-18-61dafb?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6?logo=typescript)
![License](https://img.shields.io/badge/License-MIT-green.svg)

## ✨ 特性

- 🪶 **轻量级** - 仅 2.3MB 安装包
- ⚡ **快速启动** - 秒开无等待
- 🔒 **安全可靠** - HTTPS加密通信
- 🎨 **现代UI** - 磨砂玻璃效果 + 流畅动画
- 📊 **实时统计** - 作业提交人数展示
- 🌙 **暗色模式** - 护眼主题切换

## 📥 下载安装

### 快速开始

1. 前往 [Releases](https://github.com/1403923962/bjtu-homework-tracker/releases) 下载最新版
2. 运行安装程序
3. 输入账号和密码即可使用

### 系统要求

- Windows 10/11 (64-bit)
- macOS 10.15+
- Linux (多数发行版)

## 🏗️ 架构说明

本项目采用云端SaaS架构：

```
桌面应用（2.3MB） ──HTTPS──> 云API服务器
                            ├── 自动化爬虫
                            ├── 数据缓存
                            └── OCR识别
```

**优势**：
- ✅ 安装包小
- ✅ 无需配置环境
- ✅ 自动更新维护

## 🚀 自己部署

### 本地开发

```bash
# 1. 克隆仓库
git clone https://github.com/1403923962/bjtu-homework-tracker.git
cd bjtu-homework-tracker

# 2. 安装依赖
npm install

# 3. 启动后端（新终端）
cd backend-bun
npm install
npm run dev:node

# 4. 启动前端
npm run tauri:dev
```

### 云端部署

```bash
# 1. 上传后端到服务器
cd backend-bun
scp -r . user@your-server:/var/www/app

# 2. 服务器安装依赖
ssh user@your-server
cd /var/www/app
npm install
npx playwright install chromium

# 3. 使用PM2启动
pm2 start server.ts --name app
pm2 save && pm2 startup
```

### 构建自定义安装包

```bash
# 指定API地址构建
API_BASE_URL="https://your-domain.com" npm run tauri:build
```

打包后的文件在 `src-tauri/target/release/bundle/`

## 📁 项目结构

```
├── src/                # React 前端
├── src-tauri/          # Tauri/Rust 后端
├── backend-bun/        # 云端API服务
└── package.json
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 🙏 致谢

- [Tauri](https://tauri.app/) - 桌面应用框架
- [React](https://react.dev/) - UI 框架
- [Framer Motion](https://www.framer.com/motion/) - 动画库
- [TailwindCSS](https://tailwindcss.com/) - CSS 框架

---

**⚡ 轻量 · 安全 · 易用 ⚡**
