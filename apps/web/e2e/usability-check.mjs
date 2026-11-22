// Usability checks that do not write data: inline errors, kept input, Ref ID + bed on clinical pages,
// dialog focus handling and the offline lock. Run like mobile-audit.mjs (needs PLAYWRIGHT_DIR).
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(path.join(process.env.PLAYWRIGHT_DIR ?? process.cwd(), 'x.js'));
const { chromium } = require('playwright');
const BASE = process.env.BASE_URL ?? 'http://localhost:5173';

const results = [];
const record = (name, ok, note = '') => {
  results.push({ name, ok, note });
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (note ? ' :: ' + note : ''));
};

const browser = await chromium.launch({ channel: 'msedge' });

async function session(user, pass, width) {
  const ctx = await browser.newContext({ viewport: { width, height: 850 }, hasTouch: width < 600, isMobile: width < 600 });
  const page = await ctx.newPage();
  await page.goto(BASE + '/login');
  await page.fill('#username', user);
  await page.fill('#password', pass);
  await page.click('button[type=submit]');
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 15000 });
  await page.waitForTimeout(800);
  return { ctx, page };
}

for (const width of [390, 1440]) {
  const { ctx, page } = await session('nurse.fernando', 'Fernando@Nurse2026', width);
  const tag = '@' + width;

  // Ref ID and bed on the observation pages (SAF-5)
  for (const route of ['/observations/maternal', '/observations/fetal']) {
    await page.goto(BASE + route);
    await page.waitForLoadState('networkidle');
    const header = page.getByRole('group', { name: 'Patient admission and bed' });
    const text = (await header.textContent().catch(() => '')) ?? '';
    record(route + ' shows Ref ID and bed' + tag, /LR-\d{4}-\d{4}/.test(text) && /Bed\s+\S+/.test(text), text.trim().slice(0, 60));
  }

  // Fetal form: empty submit gives an inline error and nothing is saved
  await page.goto(BASE + '/observations/fetal');
  await page.waitForLoadState('networkidle');
  await page.getByRole('tab', { name: /Fetal Monitoring/ }).click();
  await page.getByRole('button', { name: /Record FHR/ }).first().click();
  await page.getByRole('button', { name: /Record Fetal Observation/ }).click();
  const fhrErr = page.locator('#fetal-heart-rate-error');
  record('fetal form: inline error under FHR' + tag, (await fhrErr.count()) === 1 && /fetal heart rate or/i.test((await fhrErr.textContent()) ?? ''));
  record('fetal form: amniotic fluid field is optional (Not recorded option)' + tag, (await page.locator('#fetal-liquor-status option[value=""]').count()) === 1);

  // Maternal form: diastolic missing keeps systolic and points at the diastolic field
  await page.goto(BASE + '/observations/maternal');
  await page.waitForLoadState('networkidle');
  await page.getByRole('tab', { name: /Maternal Vitals/ }).click();
  await page.getByRole('button', { name: /Record Maternal Vitals/ }).first().click();
  await page.fill('#maternal-systolic-bp', '120');
  await page.getByRole('button', { name: /Record Maternal Vitals/ }).last().click();
  const diaErr = page.locator('#maternal-diastolic-bp-error');
  record('maternal form: inline error under diastolic' + tag, (await diaErr.count()) === 1);
  record('maternal form: entered systolic kept' + tag, (await page.inputValue('#maternal-systolic-bp')) === '120');
  const mode = await page.getAttribute('#maternal-systolic-bp', 'inputmode');
  record('maternal form: numeric keypad' + tag, mode === 'numeric', String(mode));

  // Dialog focus: opens inside the dialog, Tab stays inside, Escape returns focus to the opener
  await page.goto(BASE + '/admissions');
  await page.waitForLoadState('networkidle');
  const opener = page.getByRole('button', { name: /Rapid Triage/ }).first();
  await opener.focus();
  await opener.click();
  await page.waitForSelector('[role=dialog]');
  const inside = await page.evaluate(() => !!document.activeElement?.closest('[role=dialog]'));
  for (let i = 0; i < 40; i++) await page.keyboard.press('Tab');
  const stillInside = await page.evaluate(() => !!document.activeElement?.closest('[role=dialog]'));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  const back = await page.evaluate(() => document.activeElement?.textContent?.includes('Rapid Triage') ?? false);
  record('dialog: focus moves in, stays in, returns' + tag, inside && stillInside && back, `in=${inside} stay=${stillInside} back=${back}`);

  // Offline: banner shown and clinical inputs disabled
  await page.goto(BASE + '/observations/maternal');
  await page.waitForLoadState('networkidle');
  await page.getByRole('tab', { name: /Maternal Vitals/ }).click();
  await page.getByRole('button', { name: /Record Maternal Vitals/ }).first().click();
  await ctx.setOffline(true);
  await page.waitForTimeout(1500);
  const banner = await page.getByRole('alert').filter({ hasText: /Offline/ }).count();
  const disabled = await page.locator('#maternal-systolic-bp').isDisabled();
  record('offline: banner and disabled entry' + tag, banner > 0 && disabled, `banner=${banner} disabled=${disabled}`);
  await ctx.setOffline(false);

  await ctx.close();
}

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log('usability checks: ' + results.length + ', failed: ' + failed.length);
process.exit(failed.length ? 1 : 0);
