import app from './index'

const port = process.env.PORT || 5000

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
