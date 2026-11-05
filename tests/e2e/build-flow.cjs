'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

// 必须调用真实工具链。没有工具或后端未接线会失败，不把假响应当成功。
module.exports = async function buildFlow(page, api) {
  const name = `e2e_build_${Date.now().toString(36)}`;
  let project;
  const action = name => page.locator(`#flowNavigator [data-action="${name}"]`);
  const dialog = () => page.locator('.dialog-overlay:not(.dialog-closing) .dialog');
  const run = async (button, endpoint) => {
    const responsePromise = page.waitForResponse(r => r.request().method() === 'POST' && r.url().endsWith(`/api/build/${project.id}/${endpoint}`), { timeout: 330000 });
    await button.click();
    const response = await responsePromise;
    const result = await response.json();
    assert.equal(response.ok(), true, JSON.stringify(result));
    assert.equal(result.success, true);
    await page.waitForFunction(() => !window.webvado.flow.busy, null, { timeout: 330000 });
    return result;
  };
  try {
    const created = await api.post('/api/projects', { data: { name, part: 'ice40hx8k', language: 'verilog' } });
    assert.equal(created.ok(), true, await created.text());
    project = await created.json();
    const source = await fs.readFile(path.join(__dirname, '../..', 'examples/counter/counter.v'), 'utf8');
    const testbench = await fs.readFile(path.join(__dirname, '../..', 'examples/counter/counter_tb.v'), 'utf8');
    for (const [file, content] of [['srcs/rtl/counter.v', source], ['srcs/sim/counter_tb.v', testbench]]) {
      const response = await api.post(`/api/files/${project.id}/${file}`, { data: { content } });
      assert.equal(response.ok(), true, await response.text());
    }
    assert.equal((await api.put(`/api/projects/${project.id}`, { data: { top_module: 'counter' } })).ok(), true);
    await page.evaluate(id => window.webvado.openProject(id), project.id);
    await page.locator('.tree-item[data-file="counter.v"]').click();
    await page.waitForFunction(() => window.webvado.codeEditor.filename === 'srcs/rtl/counter.v');

    await page.locator('[data-menu="tools"] > span').click();
    await run(page.locator('#menuBar [data-action="check-syntax"]'), 'compile');
    assert.match(await page.locator('#consoleBody').innerText(), /Syntax check passed/);
    console.log('PASS real browser syntax compilation');

    const simulation = await run(action('run-simulation'), 'simulate');
    assert.match(simulation.output, /COUNTER_PASS/);
    assert.ok(simulation.waveformData.signals.length >= 3);
    assert.ok(simulation.waveformData.endtime > 0);
    assert.ok(simulation.waveformData.signals.some(s => s.name.includes('count') && s.values.some(v => parseInt(v.value, 2) === 10)), 'counter reaches ten in VCD');
    await page.locator('.waveform-host:not([hidden]) canvas').first().waitFor();
    // showWaveform 在 requestAnimationFrame 中填充数据；等待真实条件而不是抢读。
    await page.waitForFunction(() => window.webvado.flow.waveform?.data?.signals?.length >= 3);
    assert.match(await page.locator('.waveform-info').innerText(), /signals/);
    const before = await page.evaluate(() => window.webvado.flow.waveform.scale);
    await page.locator('.waveform-toolbar [data-action="zoom-in"]').click();
    assert.ok(await page.evaluate(() => window.webvado.flow.waveform.scale) > before);
    await page.locator('.waveform-toolbar [data-action="zoom-out"]').click();
    await page.locator('.waveform-toolbar [data-action="zoom-fit"]').click();
    await page.locator('[data-action="close-waveform"]').click();
    assert.equal(await page.locator('.waveform-host').isVisible(), false);
    console.log('PASS real simulation COUNTER_PASS, VCD values, waveform rendering and zoom controls');

    const synthesis = await run(action('run-synthesis'), 'synthesize');
    assert.equal(synthesis.report.top, 'counter');
    assert.ok(synthesis.report.cells > 0);
    assert.ok(Object.keys(synthesis.report.cellTypes).some(k => k.startsWith('SB_')));
    await action('open-synth').click();
    await dialog().locator('.netlist-svg').waitFor();
    assert.match(await dialog().innerText(), /counter/);
    assert.ok(await dialog().locator('.netlist-cell').count() > 0);
    assert.ok(await dialog().locator('.netlist-port').count() >= 3);
    assert.ok(await dialog().locator('.netlist-wire').count() > 0);
    const viewBox = await dialog().locator('.netlist-svg').getAttribute('viewBox');
    await dialog().getByRole('button', { name: 'Zoom In', exact: true }).click();
    assert.notEqual(await dialog().locator('.netlist-svg').getAttribute('viewBox'), viewBox);
    await dialog().getByRole('button', { name: 'Fit', exact: true }).click();
    assert.equal(await dialog().locator('.netlist-svg').getAttribute('viewBox'), viewBox);
    await dialog().locator('.netlist-cell').first().click();
    assert.match(await dialog().locator('.netlist-details').innerText(), /connections/);
    assert.ok(await dialog().locator('.netlist-wire.selected').count() > 0);
    await dialog().locator('.netlist-svg').focus();
    await page.keyboard.press('ArrowRight');
    assert.notEqual(await dialog().locator('.netlist-svg').getAttribute('viewBox'), viewBox);
    await page.keyboard.press('Escape');
    await action('schematic').click();
    await dialog().locator('.netlist-svg').waitFor();
    await page.keyboard.press('Escape');
    await page.locator('.tab[data-tab="netlist"]').click();
    await page.waitForFunction(() => document.getElementById('sourcesTree').textContent.includes('SB_'));
    assert.match(await page.locator('#sourcesTree').innerText(), /counter/);
    await page.locator('.tab[data-tab="sources"]').click();
    console.log('PASS real synthesis statistics and generated netlist displayed');

    const implementation = await run(action('run-implementation'), 'implement');
    assert.equal(implementation.report.package, 'ct256');
    assert.equal(implementation.report.part, 'ice40hx8k');
    assert.ok(implementation.artifacts.some(a => a.name === 'implementation.asc' && a.size > 0));
    await action('open-impl').click();
    assert.match(await dialog().innerText(), /ct256/);
    assert.match(await dialog().innerText(), /Timing/);
    assert.match(await dialog().innerText(), /Resource utilization/);
    assert.equal(await dialog().getByRole('link', { name: /implementation.asc/ }).count(), 1);
    await page.keyboard.press('Escape');
    console.log('PASS real nextpnr implementation, package/report and routed artifact');

    const bitstream = await run(action('generate-bitstream'), 'bitstream');
    const artifact = bitstream.artifacts.find(a => a.name === 'bitstream.bin');
    assert.ok(artifact && artifact.size > 100);
    const download = page.waitForEvent('download');
    await dialog().getByRole('link', { name: /bitstream.bin/ }).click();
    const downloaded = await download;
    assert.equal(downloaded.suggestedFilename(), 'bitstream.bin');
    assert.equal(await downloaded.failure(), null);
    const bytes = await fs.readFile(await downloaded.path());
    assert.equal(bytes.length, artifact.size);
    assert.ok(bytes.includes(Buffer.from([0x7e, 0xaa, 0x99, 0x7e])), 'iCE40 bitstream preamble');
    await page.keyboard.press('Escape');
    console.log(`PASS real icepack bitstream downloads ${bytes.length} bytes with iCE40 preamble`);

    // 失败必须撤销成功状态并显示诊断，不能沿用上一次成功报告。
    await page.locator('.editor-textarea').fill('module counter( broken syntax');
    const failureResponse = page.waitForResponse(r => r.request().method() === 'POST' && r.url().endsWith(`/api/build/${project.id}/synthesize`));
    await action('run-synthesis').click();
    const failed = await failureResponse;
    assert.equal(failed.ok(), false);
    await page.waitForFunction(() => !window.webvado.flow.busy);
    assert.equal(await action('run-synthesis').evaluate(el => el.classList.contains('done')), false);
    assert.match(await page.locator('#consoleBody').innerText(), /ERROR:/);
    console.log('PASS failed real synthesis reports errors and clears success marker');
  } finally {
    if (project) {
      await page.evaluate(() => { window.webvado.codeEditor.close(); }).catch(() => {});
      assert.equal((await api.delete(`/api/projects/${project.id}`)).ok(), true, 'build fixture cleanup');
    }
  }
};
