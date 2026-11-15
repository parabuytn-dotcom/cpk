const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const FPS = 30, DUR = 15, dir = __dirname + '/frames'; fs.mkdirSync(dir, { recursive: true });
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.goto('file://' + __dirname + '/ad.html'); await p.evaluate(() => window.ready);
  for (let i = 0; i < FPS * DUR; i++) {
    await p.evaluate((t) => window.render(t), i / FPS);
    await p.screenshot({ path: `${dir}/f${String(i).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 92 });
  }
  console.log('frames', FPS * DUR); await b.close();
})();
