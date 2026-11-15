// Captures de l'app (données de démonstration) pour la pub
const { chromium, devices } = require('playwright');
const OUT = __dirname, URL = process.argv[2];
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ ...devices['iPhone 13'], deviceScaleFactor: 3 });
  const done = {}; for (const id of ['e1', 'e2', 'e3', 'e4', 'p1']) done[id] = { best: 8, max: 8 };
  const me = { id: 'me', name: 'Yasmine', xp: 1340, level: 9, streak: 12, avatar: { s: 'renard', c: 2, e: 1, m: 1, x: 'casque', b: 3 } };
  await ctx.addInitScript(([pl, d]) => localStorage.setItem('pingo:v1', JSON.stringify({ token: '00000000-0000-0000-0000-000000000001', player: pl, results: { 'pc-dc1': d, 'fr-dc1': { g1: { best: 8, max: 8 } } }, pending: [], sound: false, seen: { 'tour-home': 1, 'tour-path': 1, 'tour-lesson': 1, 'tour-3d': 1, 'tour-rank': 1, 'install-dismissed': 1, 'push-dismissed': 1 }, lastExam: 'pc-dc1', unreadMsgs: 2 })), [me, done]);
  const now = new Date().toISOString();
  const lb = [
    { id: 'me', name: 'Yasmine', avatar: me.avatar, level: 9, score: 1340, online: true, seen: now },
    { id: 'a', name: 'Adam', avatar: { s: 'pingo', c: 0, e: 1, x: 'soleil', b: 0 }, level: 8, score: 1210, online: true, seen: now },
    { id: 'b', name: 'Lina', avatar: { s: 'lapin', c: 7, e: 2, m: 2, x: 'noeud', b: 4 }, level: 7, score: 1080, online: false, seen: new Date(Date.now() - 9e5).toISOString() },
    { id: 'c', name: 'Mehdi', avatar: { s: 'ours', c: 9, e: 1, x: 'casquette', b: 2 }, level: 6, score: 940, online: true, seen: now },
    { id: 'd', name: 'Sarra', avatar: { s: 'chat', c: 4, e: 3, m: 1, x: 'lunettes', b: 5 }, level: 5, score: 760, online: false, seen: new Date(Date.now() - 4e6).toISOString() },
    { id: 'e', name: 'Youssef', avatar: { s: 'grenouille', c: 1, e: 0, m: 0, b: 1 }, level: 4, score: 610, online: false, seen: new Date(Date.now() - 9e6).toISOString() }
  ];
  await ctx.route('**/rest/v1/rpc/*', (r) => {
    const fn = r.request().url().split('/').pop(); let body;
    if (fn === 'pingo_leaderboard') body = lb;
    else if (fn === 'pingo_me') body = { player: me, results: [], rank: 1 };
    else if (fn === 'pingo_ping') body = { unread_msgs: 2 };
    else if (fn === 'pingo_notifs') body = { items: [], unread: 1, push: true };
    else body = {};
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  const p = await ctx.newPage();
  const shot = async (name, wait = 1200) => { await p.waitForTimeout(wait); await p.screenshot({ path: `${OUT}/app-${name}.png` }); };
  await p.goto(URL + '/#/'); await shot('home');
  await p.goto(URL + '/#/e/pc-dc1'); await p.waitForTimeout(800); await p.evaluate(() => window.scrollTo(0, 0)); await shot('path');
  await p.goto(URL + '/#/l/pc-dc1/e1'); await p.waitForTimeout(600);
  await p.click('[data-a="rub"]'); await shot('lesson', 1300);
  await p.goto(URL + '/#/'); await p.goto(URL + '/#/l/fr-dc1/g2'); await p.waitForTimeout(600); await p.click('[data-t="ps"]'); await p.click('[data-v="16"]'); await p.evaluate(() => document.querySelector('.l-body').scrollTo(0, 0)); await shot('conj', 900);
  await p.goto(URL + '/#/3d/atome'); await shot('3d', 4000);
  await p.goto(URL + '/#/rank'); await shot('rank', 1600);
  await b.close();
})();
