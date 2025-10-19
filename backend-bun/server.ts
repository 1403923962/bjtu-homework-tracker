import app from './index'
import { ensurePlaywrightInstalled } from './setup-playwright'

const port = process.env.PORT || 5000

// 在后台异步检查playwright（不阻塞服务器启动）
ensurePlaywrightInstalled().catch(err => {
  console.error('Playwright检查失败:', err)
})

// For Bun
if (typeof Bun !== 'undefined') {
  Bun.serve({
    fetch: app.fetch,
    port,
  })
  console.log(`🚀 Bun server running on http://localhost:${port}`)
}
// For Node.js with serve adapter
else {
  const { serve } = await import('@hono/node-server')
  serve({
    fetch: app.fetch,
    port: Number(port),
  })
  console.log(`🚀 Node server running on http://localhost:${port}`)
}
