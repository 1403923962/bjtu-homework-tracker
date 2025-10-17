# BJTU 作业追踪器 Modern 🚀

> **⚠️ ARCHIVED / 已归档** - 此分支仅供参考学习，不再维护。请切换到 `desktop` 分支查看活跃开发版本。

> 北京交通大学智慧课程平台作业追踪工具 - Modern Stack实现（技术探索）

![Modern](https://img.shields.io/badge/modern-stack-blue)
![React](https://img.shields.io/badge/React-18-61dafb)
![FastAPI](https://img.shields.io/badge/FastAPI-latest-009688)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3-38bdf8)

## ✨ 特性

- 🎨 **Glassmorphism 设计** - 毛玻璃效果，现代化UI
- 🌓 **暗色模式** - 支持明暗主题切换
- ⚡ **实时倒计时** - 作业截止时间动态显示
- 📱 **响应式设计** - 完美适配PC/平板/手机
- ✨ **流畅动画** - Framer Motion 驱动的交互动画
- 🔐 **安全登录** - 智慧课程平台账号登录
- 🎯 **智能筛选** - 按状态、课程、时间等多维度筛选

## 🛠️ 技术栈

### 后端
- **FastAPI** - 现代化、高性能的Python Web框架
- **Pydantic** - 数据验证
- **BeautifulSoup4** - HTML解析
- **Pytesseract** - OCR验证码识别

### 前端
- **React 18** - 用户界面库
- **Vite** - 极速构建工具
- **TailwindCSS** - 实用优先的CSS框架
- **Framer Motion** - 动画库
- **Lucide React** - 图标库
- **Axios** - HTTP客户端

## 📦 快速开始

### 方式一：Docker Compose（推荐）

```bash
# 克隆仓库
cd bjtu-homework-tracker-modern

# 启动所有服务
docker-compose up -d

# 访问 http://localhost
```

### 方式二：手动启动

#### 后端

```bash
cd backend

# 安装依赖
pip install -r requirements.txt

# 安装 Tesseract OCR (可选，用于验证码识别)
# Windows: https://github.com/UB-Mannheim/tesseract/wiki
# macOS: brew install tesseract
# Linux: apt-get install tesseract-ocr

# 启动后端
python main.py
# 或使用 uvicorn
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

#### 前端

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

## 🎯 核心API提取

原项目的核心逻辑已被提取并现代化：

### 登录流程
1. 访问课程平台 `http://123.121.147.7:88/ve`
2. 获取验证码图片并OCR识别
3. 使用学号+MD5密码登录
4. 获取 JSESSIONID Cookie

### 数据获取
1. **获取当前学期** - `queryCurrentXq`
2. **获取SessionID** - `getArticleList`
3. **获取课程列表** - `getCourseList`
4. **获取作业列表** - `getHomeWorkList`
   - 作业 (type=0)
   - 课程报告 (type=1)
   - 实验 (type=2)

### 筛选功能
- 完成状态（已完成/未完成/全部）
- 课程关键词白名单/黑名单
- 按截止时间范围筛选
- 过期作业自动过滤

## 📸 界面预览

### 登录界面
- Glassmorphism 毛玻璃效果
- 旋转图标动画
- 渐变色标题
- 暗色模式切换

### 作业列表
- 卡片式布局
- 紧急作业高亮提示
- 倒计时显示
- 提交状态可视化
- 流畅的加载动画

## 🔧 API 文档

### `POST /api/homework`

获取作业列表

**请求体：**
```json
{
  "student_id": "学号",
  "password": "密码（留空使用默认密码）",
  "use_hash": false
}
```

**查询参数：**
- `finish_status`: "all" | "finished" | "unfinished"
- `course_keywords`: ["关键词1", "关键词2"]
- `ignore_expired_days`: 数字（默认15）
- `ignore_unexpired_days`: 数字（默认90）

**响应：**
```json
{
  "success": true,
  "data": [
    {
      "id": "作业ID",
      "title": "作业标题",
      "course_name": "课程名称",
      "content": "作业内容",
      "due_time": "2025-10-20 23:59",
      "submit_status": "未提交",
      "submit_count": 10,
      "total_count": 50,
      "create_date": "2025-10-01"
    }
  ],
  "total": 5,
  "semester": "2025202501"
}
```

## 📝 项目结构

```
bjtu-homework-tracker-modern/
├── backend/
│   ├── main.py              # FastAPI 应用主文件
│   ├── requirements.txt     # Python 依赖
│   └── Dockerfile          # 后端 Docker 配置
├── frontend/
│   ├── src/
│   │   ├── App.jsx         # 主应用组件
│   │   ├── index.css       # 全局样式
│   │   └── main.jsx        # 入口文件
│   ├── package.json        # NPM 依赖
│   ├── tailwind.config.js  # Tailwind 配置
│   └── Dockerfile         # 前端 Docker 配置
├── docker-compose.yml     # Docker Compose 配置
└── README.md             # 项目文档
```

## 🎨 设计特色

### Glassmorphism（毛玻璃拟态）
- 半透明背景
- 模糊效果
- 边框高光
- 柔和阴影

### 渐变色方案
- 主题：蓝色 → 靛蓝 → 紫色
- 背景渐变
- 文字渐变
- 按钮渐变

### 动画效果
- 淡入淡出
- 上滑进入
- 悬浮动画
- 卡片交互

## 🚀 部署

### 使用 Docker Compose

```bash
docker-compose up -d
```

### 使用 Docker 单独部署

```bash
# 后端
docker build -t bjtu-backend ./backend
docker run -p 8000:8000 bjtu-backend

# 前端
docker build -t bjtu-frontend ./frontend
docker run -p 80:80 bjtu-frontend
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 🙏 致谢

基于原项目 [BJTU-Homework-Tracker](https://github.com/ymzhang-cs/BJTU-Homework-Tracker) 重构

## ⚠️ 免责声明

本项目仅供学习交流使用，请遵守学校相关规定。
