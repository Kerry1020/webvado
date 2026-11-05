'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
module.exports = (async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(process.env.WEBVADO_URL || 'http://localhost:3000');
    await page.waitForFunction(() => window.webvado?.initialized);
    await page.evaluate(async () => {
      const { NetlistViewer } = await import('/js/components/NetlistViewer.js');
      const { Dialog } = await import('/js/components/Dialog.js');
      const viewer = new NetlistViewer({ modules: {
        top: {
          attributes: { top: '1' },
          ports: { a: { direction: 'input', bits: [2] }, y: { direction: 'output', bits: [3] } },
          cells: { inverter: { type: '$not', port_directions: { A: 'input', Y: 'output' }, connections: { A: [2], Y: [3] } } }
        }
      } });
      Dialog.show({ title: 'Netlist fixture', body: viewer.root, customClass: 'netlist-dialog' });
    });
    const svg = page.locator('.netlist-svg');
    assert.equal(await page.locator('.netlist-port').count(), 2);
    assert.equal(await page.locator('.netlist-cell').count(), 1);
    assert.equal(await page.locator('.netlist-wire').count(), 2);
    assert.match(await page.locator('.netlist-wire title').first().textContent(), /bit 2: a.a → inverter.A/);
    const box = await svg.getAttribute('viewBox');
    await page.getByRole('button', { name: 'Zoom In', exact: true }).click();
    assert.notEqual(await svg.getAttribute('viewBox'), box);
    await page.getByRole('button', { name: 'Fit', exact: true }).click();
    assert.equal(await svg.getAttribute('viewBox'), box);
    await page.locator('.netlist-cell').click();
    assert.match(await page.locator('.netlist-details').textContent(), /"A": \[\s+2/);
    assert.equal(await page.locator('.netlist-wire.selected').count(), 2);
    await svg.focus();
    await page.keyboard.press('ArrowRight');
    assert.notEqual(await svg.getAttribute('viewBox'), box);
    assert.deepEqual(errors, []);
    console.log('PASS SVG fixture: ports/cell/bit-exact connections, select, zoom, fit and pan');
  } finally { await browser.close(); }
})();
if (require.main === module) module.exports.catch(e => { console.error(e); process.exitCode = 1; });
