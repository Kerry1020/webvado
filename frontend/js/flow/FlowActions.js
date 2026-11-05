/**
 * FlowActions - Flow Navigator / Flow menu actions:
 * syntax check, simulation, synthesis, reports, and an honest message for
 * steps the open-source toolchain integration does not cover yet.
 */

import { Dialog } from '../components/Dialog.js';
import { WaveformViewer } from '../components/WaveformViewer.js';
import { NetlistViewer } from '../components/NetlistViewer.js';
import { HardwareDialog } from '../components/dialogs/HardwareDialog.js';
import { loadSettings } from '../components/dialogs/SettingsDialog.js';
import i18n from '../i18n/index.js';

const t = (key, params) => i18n.t(key, params);

const INSTALL_HINT = 'OSS CAD Suite (https://github.com/YosysHQ/oss-cad-suite-build), then add its bin/ to PATH';

// Flow Navigator items that need tools WebVado does not drive yet
const NOT_INTEGRATED = {
  'lang-templates': ['flowNav.langTemplates', null],
  'ip-catalog': ['flowNav.ipCatalog', 'an IP catalog'],
  'create-block': ['flowNav.createBlock', 'a block design editor'],
  'open-block': ['flowNav.openBlock', 'a block design editor'],
  'open-elab': ['flowNav.openElab', 'a schematic viewer'],
  'report-drc': ['flowNav.reportDrc', 'nextpnr']
};

const TEMPLATES = {
  'Counter': `module counter #(
  parameter WIDTH = 8
) (
  input  wire             clk,
  input  wire             rst,
  output reg  [WIDTH-1:0] count
);

  always @(posedge clk) begin
    if (rst) count <= 0;
    else     count <= count + 1'b1;
  end

endmodule
`,
  'D flip-flop with enable': `always @(posedge clk) begin
  if (rst)     q <= 1'b0;
  else if (en) q <= d;
end
`,
  'Finite state machine': `localparam IDLE = 2'd0, RUN = 2'd1, DONE = 2'd2;
reg [1:0] state, next_state;

always @(posedge clk) begin
  if (rst) state <= IDLE;
  else     state <= next_state;
end

always @(*) begin
  next_state = state;
  case (state)
    IDLE: if (start) next_state = RUN;
    RUN:  if (finish) next_state = DONE;
    DONE: next_state = IDLE;
    default: next_state = IDLE;
  endcase
end
`,
  'Testbench skeleton': `\`timescale 1ns / 1ps

module tb;
  reg clk = 0;
  reg rst = 1;

  always #5 clk = ~clk;

  // dut u_dut (.clk(clk), .rst(rst));

  initial begin
    $dumpfile("simulation.vcd");
    $dumpvars(0, tb);
    #20 rst = 0;
    #1000 $finish;
  end
endmodule
`
};

export class FlowActions {
  constructor(app) {
    this.app = app;
    this.lastSynthesis = null;
    this.lastSimulation = null;
    this.waveform = null;
    this.busy = false;

    const on = (action, fn) => app.eventBus.on(`action:${action}`, fn);
    on('check-syntax', () => this.checkSyntax());
    on('run-simulation', () => this.runSimulation());
    on('run-synthesis', () => this.runSynthesis());
    on('run-implementation', () => this.runImplementation());
    on('generate-bitstream', () => this.runBitstream());
    on('open-impl', () => this.showImplementation());
    on('open-synth', () => this.showNetlist());
    on('schematic', () => this.showNetlist());
    on('open-hw', () => HardwareDialog.show(this.app));
    on('program-device', () => HardwareDialog.show(this.app));
    on('lang-templates', () => this.showTemplates());
    for (const action of Object.keys(NOT_INTEGRATED)) {
      if (action !== 'lang-templates') on(action, () => this.notIntegrated(action));
    }

    // Reports tab shows the last synthesis report
    app.eventBus.on('tab:reports', () => {
      if (this.lastSynthesis && !this.reportShown) {
        this.reportShown = true;
        this.logReport(this.lastSynthesis);
      }
    });
  }

  get console() {
    return this.app.consoleManager;
  }

  reset() {
    this.lastSynthesis = null;
    this.lastSimulation = null;
    this.lastImplementation = null;
    this.lastBitstream = null;
    this.reportShown = false;
    this.hideWaveform();
  }

  invalidate(step = 'synthesize') {
    if (step === 'synthesize') {
      this.lastSynthesis = null;
      this.app.sourcesPanel.netlist = null;
      this.app.flowNavigator.markItemIncomplete('run-synth');
    }
    if (step !== 'bitstream') {
      this.lastImplementation = null;
      this.app.flowNavigator.markItemIncomplete('run-impl');
    }
    this.lastBitstream = null;
    this.app.flowNavigator.markItemIncomplete('gen-bitstream');
  }

  summaryLines() {
    const lines = [];
    if (this.lastSimulation) lines.push(`Last simulation:    ${this.lastSimulation.signals} signals, ${this.lastSimulation.endtime} ${this.lastSimulation.timescale}`);
    if (this.lastSynthesis) lines.push(`Last synthesis:     ${this.lastSynthesis.cells} cells (${this.lastSynthesis.top})`);
    if (this.lastImplementation) lines.push(`Last implementation: ${JSON.stringify(this.lastImplementation.report)}`);
    if (this.lastBitstream) lines.push(`Bitstream artifacts: ${JSON.stringify(this.lastBitstream.artifacts)}`);
    return lines;
  }

  // Runs one backend build step with status bar, console echo and error handling
  async run({ command, status, path, body, onSuccess, flowItem }) {
    if (!this.app.requireProject()) return;
    if (this.busy) {
      this.app.uiManager.flashStatus('A run is already in progress', t('status.ready'));
      return;
    }
    this.busy = true;
    const projectId = this.app.currentProjectId;
    const navigationVersion = this.app.navigationVersion;
    // Reserve the run before awaiting the save so a double click cannot launch two builds.
    try {
      if (this.app.codeEditor.isDirty() && !(await this.app.handleSave())) return;
      if (projectId !== this.app.currentProjectId || navigationVersion !== this.app.navigationVersion) return;
      if (this.app.codeEditor.isDirty()) {
        this.console.log(t('messages.saveAgain'), 'warning');
        return;
      }
      if (['synthesize', 'implement', 'bitstream'].includes(path)) this.invalidate(path);
      this.console.log(command, 'command');
      this.app.uiManager.setStatusBar(status);
      this.app.codeEditor.clearErrors();
      const result = await this.app.apiClient.post(`/api/build/${encodeURIComponent(projectId)}/${path}`, body);
      if (projectId !== this.app.currentProjectId || navigationVersion !== this.app.navigationVersion) return;
      if (result.success === false) throw new Error(result.error?.message || result.message || 'Build failed');
      this.logDiagnostics(result.diagnostics);
      onSuccess(result);
      if (flowItem) this.app.flowNavigator.markItemComplete(flowItem);
      this.app.uiManager.flashStatus(t('status.ready'), t('status.ready'), 1);
    } catch (err) {
      if (projectId !== this.app.currentProjectId || navigationVersion !== this.app.navigationVersion) return;
      if (flowItem) this.app.flowNavigator.markItemIncomplete(flowItem);
      this.logDiagnostics(err.details?.diagnostics);
      this.console.log(`ERROR: ${err.message}`, 'error');
      if (err.details?.log) this.console.log(err.details.log, 'error', 'log');
      if (err.code === 'TOOL_MISSING') {
        this.console.log(`INFO: Install ${INSTALL_HINT}`, 'info');
        Dialog.alert(t('common.error'), `${err.message}\n\nInstall: ${INSTALL_HINT}`);
      }
      this.app.uiManager.flashStatus(`${status.replace(/\.+$/, '')}: failed`, t('status.ready'), 5000);
    } finally {
      this.busy = false;
    }
  }

  logDiagnostics(diagnostics = []) {
    for (const d of diagnostics) {
      const where = d.file ? `${d.file}${d.line ? `:${d.line}` : ''}: ` : '';
      this.console.log(`${d.severity.toUpperCase()}: ${where}${d.message}`, d.severity === 'error' ? 'error' : 'warning');
    }
    // Underline lines in the open file
    const open = this.app.codeEditor.filename;
    const inOpenFile = (diagnostics || []).filter(d => d.line && open && open.endsWith(d.file));
    if (inOpenFile.length) this.app.codeEditor.setErrors(inOpenFile);
  }

  checkSyntax() {
    return this.run({
      command: 'check_syntax',
      status: t('status.compiling'),
      path: 'compile',
      body: { topModule: this.app.currentProject?.top_module || undefined },
      onSuccess: (r) => {
        const warnings = (r.diagnostics || []).filter(d => d.severity === 'warning').length;
        this.console.log(`INFO: Syntax check passed (${warnings} warnings)`, 'success');
      }
    });
  }

  runSimulation() {
    const { simulationTime } = loadSettings();
    return this.run({
      command: `launch_simulation -mode behavioral -runtime ${simulationTime}ns`,
      status: t('status.simulating'),
      path: 'simulate',
      body: { runTime: simulationTime },
      flowItem: 'run-sim',
      onSuccess: (r) => {
        if (r.output) r.output.split('\n').filter(Boolean).forEach(line => this.console.log(line, 'info', 'log'));
        const data = r.waveformData;
        this.lastSimulation = { signals: data.signals.length, endtime: data.endtime, timescale: data.timescale };
        this.console.log(t('messages.simSuccess') + ` (${data.signals.length} signals, ${r.vcdFile})`, 'success');
        this.showWaveform(data, r.top);
      }
    });
  }

  runSynthesis() {
    return this.run({
      command: 'synth_design -run synth_1',
      status: 'Running synthesis...',
      path: 'synthesize',
      body: { topModule: this.app.currentProject?.top_module || undefined },
      flowItem: 'run-synth',
      onSuccess: (r) => {
        if (r.log) r.log.split('\n').filter(Boolean).forEach(line => this.console.log(line, 'info', 'log'));
        this.lastSynthesis = r.report;
        this.lastImplementation = null;
        this.lastBitstream = null;
        this.app.sourcesPanel.loadNetlist();
        this.reportShown = false;
        this.console.log(t('messages.synthSuccess') + ` (top: ${r.report.top}, ${r.report.cells} cells)`, 'success');
        this.logReport(r.report);
      }
    });
  }

  logReport(report) {
    this.console.log(`Utilization report: ${report.top} (${report.family})`, 'info', 'report');
    for (const [cell, n] of Object.entries(report.cellTypes)) {
      this.console.log(`  ${cell.padEnd(24)}${n}`, 'info', 'report');
    }
    this.console.log(`  ${'Total cells'.padEnd(24)}${report.cells}`, 'info', 'report');
    this.console.log(`  ${'Wires'.padEnd(24)}${report.wires}`, 'info', 'report');
  }

  runImplementation() {
    return this.run({
      command: 'place_and_route -tool nextpnr-ice40',
      status: t('status.implementing'),
      path: 'implement',
      body: { topModule: this.app.currentProject?.top_module || undefined },
      flowItem: 'run-impl',
      onSuccess: result => {
        this.lastImplementation = result;
        this.lastBitstream = null;
        this.logImplementation(result);
        this.console.log(t('messages.implSuccess'), 'success');
      }
    });
  }

  runBitstream() {
    return this.run({
      command: 'write_bitstream -tool icepack',
      status: t('status.generatingBitstream'),
      path: 'bitstream',
      body: { topModule: this.app.currentProject?.top_module || undefined },
      flowItem: 'gen-bitstream',
      onSuccess: result => {
        this.lastBitstream = result;
        this.logImplementation(result);
        this.console.log(t('messages.bitstreamSuccess'), 'success');
        this.showArtifacts(t('flowNav.genBitstream'), result);
      }
    });
  }

  logImplementation(result) {
    if (result.log) this.console.log(result.log, 'info', 'log');
    this.console.log(JSON.stringify({ report: result.report, artifacts: result.artifacts }, null, 2), 'info', 'report');
  }

  showImplementation() {
    if (!this.app.requireProject()) return;
    if (this.lastImplementation) this.showArtifacts(t('flowNav.openImpl'), this.lastImplementation);
    else Dialog.alert(t('flowNav.openImpl'), t('messages.runImplementationFirst'));
  }

  showArtifacts(title, result) {
    const body = document.createElement('div');
    const table = (heading, headers, rows) => {
      if (!rows.length) return;
      const h = document.createElement('h3');
      h.textContent = heading;
      const el = document.createElement('table');
      el.className = 'build-report-table';
      [headers, ...rows].forEach((row, i) => {
        const tr = el.insertRow();
        row.forEach(value => {
          const cell = document.createElement(i ? 'td' : 'th');
          cell.textContent = value;
          tr.appendChild(cell);
        });
      });
      body.append(h, el);
    };
    table(i18n.t('netlist.timing'), ['Clock', 'Achieved MHz', 'Target MHz'], Object.entries(result.report?.fmax || {}).map(([name, value]) => [name, value.achieved, value.constraint]));
    table(i18n.t('netlist.resources'), ['Resource', 'Used', 'Available'], Object.entries(result.report?.utilization || {}).map(([name, value]) => [name, value.used, value.available]));
    const report = document.createElement('pre');
    report.className = 'dialog-pre';
    report.textContent = JSON.stringify(result.report, null, 2);
    body.appendChild(report);
    for (const artifact of result.artifacts || []) {
      const link = document.createElement('a');
      link.href = `/api/build/${encodeURIComponent(this.app.currentProjectId)}/artifacts/${encodeURIComponent(artifact.name)}`;
      link.download = artifact.name;
      link.textContent = `${artifact.name} (${artifact.size} bytes)`;
      const row = document.createElement('p');
      row.appendChild(link);
      body.appendChild(row);
    }
    Dialog.show({ title, body, buttons: [{ text: t('common.close') }] });
  }

  async showNetlist() {
    if (!this.app.requireProject()) return;
    const projectId = this.app.currentProjectId;
    try {
      const result = await this.app.apiClient.get(`/api/build/${encodeURIComponent(projectId)}/netlist`);
      if (projectId !== this.app.currentProjectId) return;
      const viewer = new NetlistViewer(result.netlist);
      Dialog.show({ title: t('flowNav.openSynth'), body: viewer.root, customClass: 'netlist-dialog', buttons: [{ text: t('common.close') }] });
    } catch (error) {
      Dialog.alert(t('common.error'), `${t('messages.runSynthesisFirst')}\n${error.message}`);
    }
  }

  showReport(kind) {
    if (!this.app.requireProject()) return;
    if (!this.lastSynthesis) {
      Dialog.alert(t('flowNav.openSynth'), 'Run Synthesis first.');
      return;
    }
    const r = this.lastSynthesis;
    const rows = Object.entries(r.cellTypes).map(([cell, n]) => `${cell.padEnd(24)}${n}`);
    Dialog.alert(kind === 'utilization' ? `${t('flowNav.openSynth')}: ${r.top}` : kind, [
      `Top module:   ${r.top}`,
      `Family:       ${r.family}`,
      `Total cells:  ${r.cells}`,
      `Wires:        ${r.wires}`,
      '',
      ...rows
    ].join('\n'));
  }

  // ── Waveform ────────────────────────────────────────────────

  showWaveform(data, top) {
    const body = document.getElementById('editorBody');
    if (!this.waveform) {
      const host = document.createElement('div');
      host.className = 'waveform-host';
      host.innerHTML = `
        <div class="waveform-host-header">
          <span class="waveform-host-title"></span>
          <button type="button" class="editor-close-btn" data-action="close-waveform" title="Close waveform">×</button>
        </div>
        <div class="waveform-host-body"></div>`;
      body.appendChild(host);
      this.waveformHost = host;
      this.waveform = new WaveformViewer(host.querySelector('.waveform-host-body'));
      this.app.eventBus.on('action:close-waveform', () => this.hideWaveform());
      this.app.eventBus.on('layout:changed', () => this.waveform?.updateCanvasSize());
    }
    this.waveformHost.querySelector('.waveform-host-title').textContent = `Behavioral Simulation - ${top || 'tb'}`;
    this.waveformHost.hidden = false;
    body.classList.add('showing-waveform');
    // Size the canvases after the host is laid out
    requestAnimationFrame(() => {
      this.waveform.updateCanvasSize();
      this.waveform.setData(data);
    });
  }

  hideWaveform() {
    if (!this.waveformHost) return;
    this.waveformHost.hidden = true;
    document.getElementById('editorBody').classList.remove('showing-waveform');
  }

  // ── Not integrated / templates ──────────────────────────────

  notIntegrated(action) {
    if (!this.app.requireProject()) return;
    const [labelKey, tool] = NOT_INTEGRATED[action];
    const feature = t(labelKey);
    this.console.log(`WARNING: ${t('messages.notAvailable', { feature, tool })}`, 'warning');
    Dialog.alert(feature, t('messages.notAvailable', { feature, tool }));
  }

  showTemplates() {
    const names = Object.keys(TEMPLATES);
    const form = document.createElement('div');
    form.innerHTML = `
      <div class="dialog-form-group">
        <label for="template-select">Verilog</label>
        <select id="template-select">${names.map(n => `<option>${Dialog.escape(n)}</option>`).join('')}</select>
      </div>
      <div class="dialog-pre" id="template-preview"></div>`;
    const select = form.querySelector('select');
    const preview = form.querySelector('#template-preview');
    const update = () => { preview.textContent = TEMPLATES[select.value]; };
    select.onchange = update;
    update();

    const editorOpen = this.app.codeEditor.isOpen();
    Dialog.show({
      title: t('flowNav.langTemplates'),
      body: form,
      buttons: [
        { text: t('common.close') },
        {
          text: editorOpen ? 'Insert at Cursor' : 'Copy',
          primary: true,
          onClick: async () => {
            if (editorOpen) {
              this.app.codeEditor.insertText(TEMPLATES[select.value]);
            } else {
              if (!navigator.clipboard) throw new Error(t('messages.clipboardUnavailable'));
              await navigator.clipboard.writeText(TEMPLATES[select.value]);
              this.app.uiManager.flashStatus('Template copied', t('status.ready'));
            }
          }
        }
      ]
    });
  }
}
