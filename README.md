# BJTU 作业追踪器 NextGen 🚀

> 北京交通大学智慧课程平台作业追踪工具 - 超现代化版本

![Next.js](https://img.shields.io/badge/Next.js-14-black)
![Bun](https://img.shields.io/badge/Bun-1.0-f9f1e1)
![Hono](https://img.shields.io/badge/Hono-4.0-E36002)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)

## ✨ 特性亮点

### 🎨 视觉设计
- **3D 动画背景** - 浮动渐变球体营造梦幻氛围
- **磨砂玻璃拟态** - Glassmorphism 设计风格
- **流动渐变效果** - 自动播放的彩虹渐变动画
- **Shine 悬浮特效** - 卡片悬停时的光泽扫过效果
- **暗色模式** - 一键切换明暗主题

### ⚡ 性能优势
- **Bun 运行时** - 比 Node.js 快 3-4 倍
- **Next.js 14** - 最新的 App Router 架构
- **零延迟交互** - Framer Motion 驱动的 60fps 动画
- **服务端渲染** - 首屏加载速度优化

### 🎯 核心功能
- 智能登录（支持默认密码）
- 实时倒计时显示
- 紧急作业高亮
- 提交进度可视化
- 响应式设计

## 🛠️ 技术栈

### 后端 (backend-bun/)
```
Bun 1.0          - 超快的 JavaScript 运行时
Hono 4.0         - 轻量级 Web 框架（比 Express 快 4x）
TypeScript 5.3   - 类型安全
Zod 3.22         - 数据验证
```

### 前端 (frontend-next/)
```
Next.js 14       - React 全栈框架
TypeScript 5.0   - 类型安全
TailwindCSS 3.3  - 实用优先 CSS
Framer Motion 11 - 动画库
Lucide React     - 图标库
```

## 📦 快速开始

### 安装 Bun（推荐）

```bash
# Windows (PowerShell)
powershell -c "irm bun.sh/install.ps1 | iex"

# macOS/Linux
curl -fsSL https://bun.sh/install | bash
```

### 启动后端

```bash
cd backend-bun

# 使用 Bun（推荐）
bun install
bun run server.ts

# 或使用 Node.js
npm install
npm run dev:node
```

后端将运行在 `http://localhost:3001`

### 启动前端

```bash
cd frontend-next

# 安装依赖
npm install  # 或 bun install

# 启动开发服务器
npm run dev  # 或 bun run dev
```

前端将运行在 `http://localhost:3000`

## 🎨 UI 预览

### 登录界面
- 🌈 **动态背景** - 3个渐变球体自动浮动
- 🎓 **旋转Logo** - 持续旋转的学士帽图标
- ✨ **闪烁星星** - 动态脉冲效果
- 🔮 **磨砂玻璃卡片** - 半透明毛玻璃效果
- 🌊 **流动渐变标题** - 自动播放的渐变动画

### 作业卡片
- 📚 **课程标签** - 渐变色课程名
- ⏰ **倒计时提示** - 紧急作业红色闪烁
- ✅ **状态标记** - 已提交/未提交图标
- 📊 **进度条** - 可视化提交比例
- 💫 **悬浮效果** - hover 时上浮+缩放
- ✨ **光泽扫过** - 鼠标悬停时的反光效果

## 🔧 核心 API

### POST `/api/homework`

获取作业列表

**请求：**
```typescript
{
  student_id: string
  password?: string        // 留空使用默认密码
  use_hash?: boolean       // 密码是否已MD5加密
  finish_status?: 'all' | 'finished' | 'unfinished'
  ignore_expired_days?: number
  ignore_unexpired_days?: number
}
```

**响应：**
```typescript
{
  success: boolean
  data: Homework[]
  total: number
  semester: string
}
```

## 📁 项目结构

```
bjtu-tracker-nextgen/
├── backend-bun/            # Bun + Hono 后端
│   ├── index.ts           # 主应用逻辑
│   ├── server.ts          # 服务器启动文件
│   ├── package.json       # 依赖配置
│   └── tsconfig.json      # TypeScript 配置
│
├── frontend-next/          # Next.js 14 前端
│   ├── app/
│   │   ├── page.tsx       # 主页面（登录+作业列表）
│   │   ├── layout.tsx     # 根布局
│   │   └── globals.css    # 全局样式
│   ├── components/
│   │   └── HomeworkCard.tsx  # 作业卡片组件
│   ├── lib/
│   │   └── utils.ts       # 工具函数
│   ├── tailwind.config.ts # Tailwind 配置
│   ├── next.config.js     # Next.js 配置
│   └── package.json       # 依赖配置
│
└── README.md              # 项目文档
```

## 🎯 设计理念

### 1. 极致性能
- **Bun 后端** - 比 Node.js 快 3-4 倍
- **静态生成** - Next.js 预渲染优化
- **代码分割** - 按需加载组件
- **图片优化** - Next.js Image 组件

### 2. 视觉冲击
- **3D 空间感** - 浮动背景球体
- **玻璃拟态** - 半透明毛玻璃效果
- **流动渐变** - 自动播放的彩虹动画
- **微交互** - 每个元素都有反馈

### 3. 用户体验
- **零学习成本** - 直观的界面设计
- **即时反馈** - 所有操作立即响应
- **错误处理** - 友好的错误提示
- **响应式** - 完美适配所有设备

## 🌟 动画效果详解

### 背景动画
```css
/* 浮动球体 */
animate-float: 6s ease-in-out infinite

/* 渐变流动 */
animate-shimmer: 8s ease-in-out infinite
```

### 卡片动画
- **进入动画** - 淡入 + 上滑 + 错开延迟
- **悬浮动画** - 上浮 5px + 缩放 1.02
- **光泽效果** - 从左到右的高光扫过
- **紧急闪烁** - 红色 pulse 动画

## 📊 性能对比

| 指标 | Node.js + Express | Bun + Hono |
|------|-------------------|------------|
| 请求/秒 | ~50k | ~200k |
| 启动时间 | ~2s | ~0.5s |
| 内存占用 | ~100MB | ~50MB |
| 打包速度 | ~10s | ~2s |

## 🚀 部署

### Vercel (推荐)
```bash
# 前端
cd frontend-next
vercel

# 后端需要支持 Bun 的平台（如 Fly.io, Railway）
```

### Docker
```dockerfile
# 后端
FROM oven/bun:1
WORKDIR /app
COPY . .
RUN bun install
CMD ["bun", "run", "server.ts"]
```

## 🤝 贡献

欢迎提交 PR 和 Issue！

### 开发建议
1. 使用 Bun 获得最佳体验
2. 遵循 TypeScript 严格模式
3. 保持组件的单一职责
4. 为新功能添加动画效果

## 📝 待办事项

- [ ] 添加作业详情弹窗
- [ ] 支持作业筛选和搜索
- [ ] 添加数据缓存机制
- [ ] 支持桌面通知
- [ ] 添加数据统计面板
- [ ] PWA 支持

## ⚠️ 注意事项

1. **Bun 环境**
   - 最好使用 Bun 1.0+
   - 不支持某些 Node.js 专有模块
   - 可降级使用 Node.js

2. **浏览器兼容性**
   - 需要现代浏览器（Chrome 90+, Firefox 88+, Safari 14+）
   - 不支持 IE

3. **验证码识别**
   - 当前跳过验证码识别
   - 可能导致登录失败
   - 后续版本将添加 OCR 支持

## 📄 许可证

MIT License

## 🙏 致谢

- 原项目：[BJTU-Homework-Tracker](https://github.com/ymzhang-cs/BJTU-Homework-Tracker)
- 核心 API 逻辑提取自原项目
- UI 设计灵感来自 Aceternity UI

## 📞 联系方式

- 提交 Issue: [GitHub Issues](https://github.com/your-repo/issues)
- 项目讨论: [GitHub Discussions](https://github.com/your-repo/discussions)

---

**⚡ Powered by Bun + Hono + Next.js 14 ⚡**

Made with 💜 for BJTU students
