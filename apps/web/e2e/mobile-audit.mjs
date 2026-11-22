// Responsive audit: logs in as each demo user, visits every menu page, every admission tab and
// the dialogs reachable by buttons, and asserts there is no horizontal overflow or console error.
// Playwright is not a project dependency. Run with PLAYWRIGHT_DIR pointing at a folder that has it:
//   PLAYWRIGHT_DIR=<dir> node apps/web/e2e/mobile-audit.mjs [--widths=390,1440] [--users=nurse,doctor,admin]
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(path.join(process.env.PLAYWRIGHT_DIR ?? process.cwd(), 'x.js'));
const { chromium } = require('playwright');

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, 'mobile-screens');
const BASE = process.env.BASE_URL ?? 'http://localhost:5173';
const arg = (k, d) =>
  (process.argv.find((a) => a.startsWith('--' + k + '=')) ?? '--' + k + '=' + d).split('=')[1];
const WIDTHS = arg('widths', '360,390,412,1440').split(',').map(Number);
const ONLY = arg('users', 'nurse,doctor,admin').split(',');
const SHOTS = arg('shots', 'all');

const USERS = {
  nurse: { u: 'nurse.fernando', p: 'Fernando@Nurse2026' },
  doctor: { u: 'dr.perera', p: 'Perera@Doctor2026' },
  admin: { u: 'admin_csth', p: 'LabourRoom@Admin2026' },
};
const PAGES = {
  nurse: ['/', '/admissions', '/beds', '/shifts', '/observations/maternal', '/observations/fetal', '/alerts', '/analytics', '/change-password'],
  doctor: ['/', '/admissions', '/beds', '/shifts', '/observations/maternal', '/observations/fetal', '/alerts', '/analytics', '/analytics/reports'],
  admin: ['/', '/admissions', '/beds', '/shifts', '/alerts', '/analytics', '/analytics/admissions', '/analytics/deliveries', '/analytics/beds', '/analytics/alos', '/analytics/staffing', '/analytics/alerts', '/analytics/reports', '/staff', '/audit'],
};

const FAKE_ALERT = {
  escalationId: '00000000-0000-4000-8000-000000000001',
  admissionId: '00000000-0000-4000-8000-000000000002',
  escalationReferenceId: 'ESC-TEST-0001',
  admissionReferenceId: 'LR-2611-0001',
  bedNumber: 'BED-01',
  riskFlags: ['Hypertension', 'Prior cesarean'],
  category: 'MATERNAL_DETERIORATION',
  priority: 'EMERGENCY',
  clinicalReason: 'Test alert: BP 170/110 with headache and visual disturbance, needs review now.',
  dispatchedAt: new Date().toISOString(),
};
const results = [];
const slug = (s) => s.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'home';

async function overflow(page) {
  return page.evaluate(() => {
    const vw = window.innerWidth;
    let sw = document.documentElement.scrollWidth;
    const main = document.querySelector('main');
    if (main && main.scrollWidth > main.clientWidth + 1) sw = Math.max(sw, vw + (main.scrollWidth - main.clientWidth));
    const bad = [...document.querySelectorAll('body *')].filter((el) => {
      const r = el.getBoundingClientRect();
      if (r.right <= vw + 1 || r.width === 0) return false;
      if (el.closest('[aria-hidden=true]') || getComputedStyle(el).position === 'fixed') return false;
      for (let p = el.parentElement; p; p = p.parentElement) {
        if (p.tagName === 'MAIN') continue;
        const o = getComputedStyle(p).overflowX;
        if ((o === 'auto' || o === 'scroll' || o === 'hidden') && p !== document.body && p !== document.documentElement) return false;
      }
      return true;
    });
    if (bad.length) sw = Math.max(sw, Math.round(Math.max(...bad.map((e) => e.getBoundingClientRect().right))));
    const culprit = bad.slice(0, 3).map((e) => e.tagName.toLowerCase() + '.' + String(e.className).slice(0, 70)).join(' | ');
    return { vw, sw, culprit };
  });
}

async function unlabelled(page) {
  return page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('input, select, textarea')) {
      if (el.type === 'hidden' || el.closest('[aria-hidden=true]')) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      const named =
        el.getAttribute('aria-label') ||
        el.getAttribute('aria-labelledby') ||
        el.getAttribute('title') ||
        (el.id && document.querySelector('label[for="' + CSS.escape(el.id) + '"]')) ||
        el.closest('label');
      if (!named) out.push(el.tagName.toLowerCase() + '#' + (el.id || el.name || el.type) + ' ph=' + (el.placeholder || ''));
    }
    return out.slice(0, 4);
  });
}

async function check(page, label, errors, w, user) {
  await page.waitForTimeout(500);
  const o = await overflow(page);
  const missing = await unlabelled(page);
  const ok = o.sw <= o.vw && errors.length === 0 && missing.length === 0;
  results.push({
    user,
    w,
    label,
    ok,
    note: [o.sw > o.vw ? 'scrollWidth ' + o.sw + '>' + o.vw + ' ' + o.culprit : '', missing.length ? 'no label: ' + missing.join(', ') : '', ...errors].filter(Boolean).join('; '),
  });
  if (SHOTS === 'all' || !ok) {
    const dir = path.join(OUT, user + '-' + w);
    fs.mkdirSync(dir, { recursive: true });
    await page.screenshot({ path: path.join(dir, slug(label) + '.png'), fullPage: false }).catch(() => {});
  }
  errors.length = 0;
}

async function login(page, u) {
  await page.goto(BASE + '/login');
  await page.fill('#username', u.u);
  await page.fill('#password', u.p);
  await page.click('button[type=submit]');
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15000 });
  await page.waitForTimeout(800);
}

const SKIP_BTN = /confirm|submit|save|delete|record|sign out|logout|discharge now|mark|clean|toggle|activate|revoke|release|complete|start |remove|enable|disable|resolve|acknowledge|reverse|refresh|export|print|download/i;

async function sweepDialogs(page, base, label, errors, w, user) {
  const startUrl = page.url();
  const btns = page.locator('main button:visible:not([disabled]):not([role=tab])');
  const n = Math.min(await btns.count(), 16);
  for (let b = 0; b < n; b++) {
    const btn = page.locator('main button:visible:not([disabled]):not([role=tab])').nth(b);
    const text = ((await btn.textContent({ timeout: 1000 }).catch(() => '')) ?? '').trim();
    if (!text || SKIP_BTN.test(text)) continue;
    await btn.click({ timeout: 1500 }).catch(() => {});
    if (page.url() !== startUrl) {
      await page.goBack().catch(() => {});
      await page.waitForTimeout(300);
      continue;
    }
    if (await page.locator('div.fixed.inset-0.z-50').count()) {
      await check(page, base + label + ' dialog ' + text.slice(0, 24), errors, w, user);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(150);
    }
  }
}

async function walkTabs(page, base, errors, w, user, withDialogs) {
  const tabs = await page.locator('[role=tab]').count();
  if (withDialogs) await sweepDialogs(page, base, '', errors, w, user);
  for (let i = 0; i < tabs; i++) {
    const t = page.locator('[role=tab]').nth(i);
    const name = ((await t.textContent()) ?? 'tab' + i).trim().slice(0, 20);
    await t.click({ timeout: 3000 }).catch(() => {});
    await check(page, base + ' tab ' + name, errors, w, user);
    if (withDialogs) await sweepDialogs(page, base, ' tab ' + name, errors, w, user);
  }
}

const browser = await chromium.launch({ channel: 'msedge' });
for (const user of ONLY) {
  for (const w of WIDTHS) {
    const ctx = await browser.newContext({
      viewport: { width: w, height: w < 600 ? 800 : 900 },
      hasTouch: w < 600,
      isMobile: w < 600,
    });
    const page = await ctx.newPage();
    const errors = [];
    let injected = null;
    if (user === 'doctor') {
      // The alert is faked on the socket so no real escalation is written to the demo data.
      await page.routeWebSocket(/socket\.io/, (ws) => {
        const server = ws.connectToServer();
        ws.onMessage((m) => server.send(m));
        server.onMessage((m) => ws.send(m));
        injected = ws;
      });
    }
    page.on('console', (m) => {
      if (m.type() === 'error' && !/favicon|Failed to load resource.*(401|403)/.test(m.text())) errors.push('console: ' + m.text().slice(0, 140));
    });
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message.slice(0, 140)));
    try {
      await login(page, USERS[user]);
    } catch (e) {
      results.push({ user, w, label: 'login', ok: false, note: String(e.message).slice(0, 120) });
      await ctx.close();
      continue;
    }
    errors.length = 0;
    if (user === 'doctor' && injected) {
      injected.send('42' + JSON.stringify(['alert:new', FAKE_ALERT]));
      await page.waitForSelector('[role=alertdialog]', { timeout: 5000 }).catch(() => {});
      const overlay = await page.locator('[role=alertdialog]').count();
      const ack = page.getByRole('button', { name: /acknowledge/i });
      const box = overlay ? await ack.boundingBox() : null;
      const fits = box && box.height >= 44 && box.x >= 0 && box.x + box.width <= w;
      results.push({ user, w, label: 'doctor alert overlay', ok: !!(overlay && fits), note: overlay ? (fits ? '' : 'acknowledge button not fully visible') : 'overlay did not appear' });
      await check(page, 'doctor alert overlay', errors, w, user);
      await page.reload();
      await page.waitForTimeout(1000);
    }
    for (const route of PAGES[user]) {
      await page.goto(BASE + route);
      await page.waitForLoadState('networkidle').catch(() => {});
      await check(page, route, errors, w, user);
      await walkTabs(page, route, errors, w, user, true);
    }
    await page.goto(BASE + '/admissions');
    await page.waitForLoadState('networkidle').catch(() => {});
    const hrefs = await page.$$eval('a[href^="/admissions/"]', (as) => [...new Set(as.map((a) => a.getAttribute('href')))].slice(0, 2));
    for (const href of hrefs) {
      await page.goto(BASE + href);
      await page.waitForLoadState('networkidle').catch(() => {});
      await check(page, href, errors, w, user);
      await walkTabs(page, href, errors, w, user, true);
    }
    await ctx.close();
  }
}
await browser.close();

const failed = results.filter((r) => !r.ok);
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 1));
console.log('checks: ' + results.length + ', failed: ' + failed.length);
for (const f of failed.slice(0, Number(arg('show', 60)))) console.log('FAIL ' + f.user + '@' + f.w + ' ' + f.label + ' :: ' + f.note);
process.exit(failed.length ? 1 : 0);
