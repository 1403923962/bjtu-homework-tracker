const { chromium } = require('playwright');
const fs = require('fs');

async function captureIcon() {
  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      body {
        margin: 0;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 512px;
        height: 512px;
        background: linear-gradient(135deg, #E0C3FC 0%, #8EC5FC 100%);
      }
      .icon-container {
        position: relative;
      }
      svg {
        width: 320px;
        height: 320px;
        filter: drop-shadow(0 10px 30px rgba(0,0,0,0.2));
      }
    </style>
  </head>
  <body>
    <div class="icon-container">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/>
        <path d="M22 10v6"/>
        <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>
      </svg>
    </div>
  </body>
  </html>
  `;

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 512, height: 512 },
    deviceScaleFactor: 2
  });

  await page.setContent(html);
  await page.screenshot({
    path: '../app-icon.png',
    omitBackground: false
  });

  console.log('✅ Icon captured: app-icon.png');
  await browser.close();
}

captureIcon().catch(console.error);
