#!/usr/bin/env node
import { ToolchainManager } from '../backend/services/ToolchainManager.js';

// 与服务器共用探测逻辑，包含项目内 OSS CAD Suite 与 WEBVADO_TOOLCHAIN。
const tools = await new ToolchainManager().detect();
for (const [name, tool] of Object.entries(tools)) {
  console.log(`${name.padEnd(16)} ${tool.found ? `${tool.version}  ${tool.path}` : 'MISSING'}`);
}
const required = ['iverilog', 'vvp', 'yosys', 'nextpnr-ice40', 'icepack'];
const missing = required.filter(name => !tools[name]?.found);
if (missing.length) {
  console.error(`Missing for the complete iCE40 flow: ${missing.join(', ')}`);
  console.error('Extract OSS CAD Suite into tools/oss-cad-suite, or set WEBVADO_TOOLCHAIN to its bin directory.');
  process.exitCode = 1;
}
