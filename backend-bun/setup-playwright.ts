/**
 * Playwright浏览器自动安装脚本
 * 检查playwright浏览器是否存在，不存在则自动安装
 */
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

const execPromise = promisify(exec)

async function checkPlaywrightInstalled(): Promise<boolean> {
  try {
    // 检查默认浏览器路径
    const browserPaths = [
      path.join(os.homedir(), '.cache', 'ms-playwright'),
      path.join(os.homedir(), 'AppData', 'Local', 'ms-playwright'),
      path.join(process.cwd(), 'browsers')
    ]

    for (const browserPath of browserPaths) {
      try {
        const stat = await fs.stat(browserPath)
        if (stat.isDirectory()) {
          console.log(`✅ 找到Playwright浏览器: ${browserPath}`)
          return true
        }
      } catch {
        // 继续检查下一个路径
      }
    }

    return false
  } catch {
    return false
  }
}

async function installPlaywright() {
  console.log('📥 正在安装Playwright浏览器...')
  console.log('⏳ 这可能需要几分钟时间，请耐心等待...')

  try {
    const { stdout, stderr } = await execPromise('npx playwright install chromium')
    console.log(stdout)
    if (stderr && !stderr.includes('Downloading')) {
      console.error(stderr)
    }
    console.log('✅ Playwright浏览器安装完成！')
    return true
  } catch (error: any) {
    console.error('❌ Playwright浏览器安装失败:', error.message)
    console.log('💡 请手动运行: npx playwright install chromium')
    return false
  }
}

export async function ensurePlaywrightInstalled() {
  const installed = await checkPlaywrightInstalled()

  if (!installed) {
    console.log('⚠️ 未检测到Playwright浏览器')
    await installPlaywright()
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  await ensurePlaywrightInstalled()
}
