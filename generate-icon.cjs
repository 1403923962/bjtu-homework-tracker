const fs = require('fs');
const { chromium } = require('playwright');

async function generateIcon() {
  const svgContent = fs.readFileSync('./app-icon.svg', 'utf8');

  // Create HTML with SVG
  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      body { margin: 0; padding: 0; background: transparent; }
      svg { display: block; }
    </style>
  </head>
  <body>
    ${svgContent}
  </body>
  </html>
  `;

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1024, height: 1024 },
    deviceScaleFactor: 1
  });

  await page.setContent(html);
  await page.screenshot({
    path: './app-icon.png',
    omitBackground: false
  });

  console.log('✅ Icon generated: app-icon.png');
  await browser.close();
}

generateIcon().catch(console.error);
