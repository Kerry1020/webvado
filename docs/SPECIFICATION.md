# WebVado Technical Specification
**Version:** 1.0  
**Last Updated:** 2026-11-05  
**Status:** Design Phase

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Project Objectives](#2-project-objectives)
3. [Architecture Overview](#3-architecture-overview)
4. [Technology Stack](#4-technology-stack)
5. [Core Components](#5-core-components)
6. [Feature Roadmap](#6-feature-roadmap)
7. [API Specification](#7-api-specification)
8. [Data Models](#8-data-models)
9. [UI Design System](#9-ui-design-system)
10. [Toolchain Integration](#10-toolchain-integration)
11. [Testing Strategy](#11-testing-strategy)
12. [Deployment & Distribution](#12-deployment--distribution)
13. [Security Considerations](#13-security-considerations)
14. [Performance Requirements](#14-performance-requirements)
15. [Success Criteria](#15-success-criteria)

---

## 1. Executive Summary

**WebVado** is an open-source, web-based FPGA development environment that replicates the core functionality of Xilinx Vivado while using entirely open-source toolchains. The project aims to:

- Provide a **production-quality IDE** for Verilog/SystemVerilog development
- Integrate **real compilation and simulation** using Icarus Verilog and Verilator
- Support **complete FPGA workflows** from RTL to bitstream generation (Level 3)
- Target **open-source FPGAs** (iCE40, ECP5) with **stretch goal** of Xilinx 7-series support
- Be **entirely self-contained** and runnable locally without external dependencies

### What Makes WebVado Unique

- **No Native Dependencies**: Runs in any modern browser, backend in pure Node.js
- **Educational Focus**: Perfect for learning FPGA development without expensive tools
- **100% Open Source**: Every component is open-source, auditable, and hackable
- **Progressive Enhancement**: Works offline, installable as PWA (future)

---

## 2. Project Objectives

### Primary Goals (Level 2 - Near Term)

1. ✅ **Real Verilog Compilation**: Integrate Icarus Verilog for syntax checking and elaboration
2. ✅ **Real Simulation**: Run behavioral simulations and generate waveforms
3. ✅ **Interactive Waveform Viewer**: Canvas-based waveform rendering (no GTKWave dependency)
4. ✅ **Project Management**: Multi-file projects, source hierarchy, constraint files
5. ✅ **Code Editing**: Syntax highlighting, auto-complete, error markers
6. ✅ **Console Integration**: Real-time logs, Tcl-like command interface

### Ultimate Goals (Level 3 - Long Term)

7. ✅ **RTL Synthesis**: Integrate Yosys for RTL → netlist conversion
8. ✅ **Place & Route**: Integrate nextpnr for FPGA place-and-route
9. ✅ **Timing Analysis**: Post-route timing reports, slack analysis
10. ✅ **Bitstream Generation**: Generate .bit files for iCE40/ECP5 FPGAs
11. 🎯 **Xilinx Support (Stretch Goal)**: Reverse-engineer Xilinx bitstream format or integrate Project X-Ray

### Non-Goals

- ❌ Native desktop application (stays web-based)
- ❌ Cloud compilation (all processing is local)
- ❌ IP core marketplace (users bring their own IP)
- ❌ Commercial support or licensing

---

## 3. Architecture Overview

### 3.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        BROWSER (Frontend)                    │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  UI Layer  │  │ Code Editor  │  │ Waveform Viewer  │   │
│  │  (Vanilla) │  │ (CodeMirror) │  │   (Canvas/SVG)   │   │
│  └─────┬──────┘  └──────┬───────┘  └────────┬─────────┘   │
│        │                │                    │              │
│  ┌─────▼────────────────▼────────────────────▼─────────┐   │
│  │         WebSocket + REST API Client                  │   │
│  └──────────────────────────┬───────────────────────────┘   │
└─────────────────────────────┼───────────────────────────────┘
                              │ JSON/Binary over HTTP/WS
┌─────────────────────────────▼───────────────────────────────┐
│                    NODE.JS BACKEND (Express)                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              API Gateway (Express Router)            │   │
│  └────┬──────────┬──────────┬──────────┬────────────┬──┘   │
│       │          │          │          │            │       │
│  ┌────▼────┐ ┌──▼───┐ ┌────▼────┐ ┌───▼───┐ ┌─────▼─────┐ │
│  │ Project │ │ File │ │ Build   │ │  Sim  │ │ Toolchain │ │
│  │ Manager │ │  Mgr │ │ Service │ │ Engine│ │  Manager  │ │
│  └────┬────┘ └──┬───┘ └────┬────┘ └───┬───┘ └─────┬─────┘ │
│       │         │          │          │            │       │
│  ┌────▼─────────▼──────────▼──────────▼────────────▼─────┐ │
│  │              Filesystem Abstraction Layer            │ │
│  │         (projects/, cache/, temp/, logs/)            │ │
│  └──────────────────────────┬───────────────────────────┘ │
└─────────────────────────────┼───────────────────────────────┘
                              │ Child Process / Spawn
┌─────────────────────────────▼───────────────────────────────┐
│                    EXTERNAL TOOLCHAINS                       │
│  ┌──────────┐  ┌──────────┐  ┌───────┐  ┌──────────────┐  │
│  │ iverilog │  │verilator │  │ yosys │  │   nextpnr    │  │
│  │ (compile)│  │  (lint)  │  │(synth)│  │ (place/route)│  │
│  └──────────┘  └──────────┘  └───────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Data Flow: Compilation Pipeline

```
User clicks "Run Synthesis"
         │
         ▼
Frontend sends POST /api/build/synthesize
         │
         ▼
Backend: BuildService.synthesize()
         │
         ├─→ Validate project structure
         ├─→ Generate iverilog command
         ├─→ Spawn child process
         ├─→ Stream logs via WebSocket
         ├─→ Parse errors/warnings
         │
         ▼
Frontend updates console + marks errors in editor
```

### 3.3 Component Responsibilities

| Component | Responsibility |
|-----------|---------------|
| **Frontend UI** | User interactions, layout, theming |
| **Code Editor** | Syntax highlighting, LSP integration, error markers |
| **API Client** | REST calls, WebSocket management, state sync |
| **Project Manager** | CRUD operations on projects, file tree state |
| **Build Service** | Orchestrate compilation, synthesis, P&R |
| **Simulation Engine** | Execute simulations, parse VCD files |
| **Toolchain Manager** | Detect installed tools, version checks, install helpers |

---

## 4. Technology Stack

### 4.1 Frontend

| Layer | Technology | Justification |
|-------|-----------|---------------|
| **Core** | Vanilla JS (ES2022+) | Zero framework overhead, full control |
| **Code Editor** | CodeMirror 6 | Best Verilog support, extensible LSP |
| **Waveform** | Canvas API + WebGL | High-performance rendering |
| **State Management** | Custom event bus | Simple pub/sub for UI reactivity |
| **Build Tool** | esbuild | Fast bundling, tree-shaking |
| **CSS Framework** | Custom CSS (no Tailwind) | Exact pixel-perfect recreation of Vivado UI |

**Key Libraries:**
```json
{
  "codemirror": "^6.0.0",
  "@codemirror/lang-verilog": "^6.0.0",
  "ws": "^8.14.0"
}
```

### 4.2 Backend

| Layer | Technology | Justification |
|-------|-----------|---------------|
| **Runtime** | Node.js 18+ | Native child_process for toolchain invocation |
| **Web Server** | Express 4.x | Proven, lightweight REST framework |
| **WebSocket** | ws + express-ws | Real-time logs and progress updates |
| **File System** | fs-extra | Enhanced fs operations |
| **Process Management** | execa | Better child_process API |
| **Logging** | pino | Structured JSON logging |

**Key Dependencies:**
```json
{
  "express": "^4.18.2",
  "express-ws": "^5.0.2",
  "fs-extra": "^11.1.1",
  "execa": "^8.0.1",
  "pino": "^8.16.0",
  "chokidar": "^3.5.3"
}
```

### 4.3 Toolchain (Bundled or Detected)

| Tool | Purpose | Minimum Version | Detection Method |
|------|---------|-----------------|------------------|
| **iverilog** | Verilog compilation & simulation | 11.0+ | `iverilog -V` |
| **verilator** | Linting & fast simulation | 5.0+ | `verilator --version` |
| **yosys** | RTL synthesis | 0.33+ | `yosys -V` |
| **nextpnr-ice40** | FPGA P&R (iCE40) | 0.5+ | `nextpnr-ice40 --version` |
| **nextpnr-ecp5** | FPGA P&R (ECP5) | 0.5+ | `nextpnr-ecp5 --version` |
| **icestorm** | iCE40 bitstream tools | Latest | `icepack -h` |
| **prjtrellis** | ECP5 bitstream tools | Latest | `ecppack -h` |

**Installation Strategy:**
- macOS: `brew install icarus-verilog verilator yosys icestorm`
- Linux: `apt-get install iverilog verilator yosys`
- Windows: Bundle precompiled binaries in `tools/` directory

---

## 5. Core Components

### 5.1 Project Manager

**Responsibilities:**
- Create/open/close/delete projects
- Maintain project metadata (`.webvado/project.json`)
- Track file hierarchy (Design Sources, Constraints, Simulation)
- Manage top module selection

**Project Structure:**
```
my_project/
├── .webvado/
│   ├── project.json          # Metadata
│   ├── build/                # Build artifacts
│   │   ├── synthesis/
│   │   ├── implementation/
│   │   └── simulation/
│   └── cache/                # Incremental build cache
├── srcs/
│   ├── rtl/                  # Design sources
│   │   ├── top.v
│   │   └── counter.v
│   ├── sim/                  # Testbenches
│   │   └── top_tb.v
│   └── constrs/              # Constraints
│       └── pins.xdc
└── README.md
```

**API Endpoints:**
```
POST   /api/projects              # Create new project
GET    /api/projects              # List all projects
GET    /api/projects/:id          # Get project details
PUT    /api/projects/:id          # Update project settings
DELETE /api/projects/:id          # Delete project
POST   /api/projects/:id/files    # Add file to project
DELETE /api/projects/:id/files/:path  # Remove file
```

### 5.2 Build Service

**Responsibilities:**
- Orchestrate multi-stage builds (compile → synthesize → implement → bitstream)
- Stream logs to frontend via WebSocket
- Parse tool outputs for errors/warnings
- Generate reports (utilization, timing, DRC)

**Build Pipeline:**

```javascript
class BuildService {
  async runSynthesis(projectId) {
    // 1. Validate project
    const project = await this.projectManager.get(projectId);
    
    // 2. Generate iverilog command
    const cmd = this.generateIverilogCommand(project);
    
    // 3. Execute with streaming
    const proc = execa(cmd[0], cmd.slice(1));
    proc.stdout.on('data', (data) => {
      this.wsManager.broadcast('build:log', { 
        type: 'stdout', 
        content: data.toString() 
      });
    });
    
    // 4. Parse errors
    const errors = await this.parseErrors(proc.stderr);
    
    // 5. Update project state
    await this.projectManager.updateBuildStatus(projectId, {
      stage: 'synthesis',
      status: errors.length > 0 ? 'failed' : 'success',
      errors
    });
    
    return { success: errors.length === 0, errors };
  }
}
```

### 5.3 Simulation Engine

**Responsibilities:**
- Execute behavioral simulations
- Parse VCD (Value Change Dump) files
- Convert VCD → JSON for waveform viewer
- Support time-based queries (get signal value at time T)

**Simulation Flow:**
```
1. User clicks "Run Simulation"
2. Backend: Compile testbench with iverilog
3. Backend: Execute vvp (Verilog simulator)
4. Backend: Generate VCD file
5. Backend: Parse VCD → JSON
6. Frontend: Render waveforms on Canvas
```

**VCD Parser Output Format:**
```json
{
  "timescale": "1ps",
  "signals": [
    {
      "id": "clk",
      "type": "wire",
      "width": 1,
      "values": [
        { "time": 0, "value": "0" },
        { "time": 5000, "value": "1" },
        { "time": 10000, "value": "0" }
      ]
    }
  ]
}
```

### 5.4 Waveform Viewer (Frontend)

**Technologies:**
- Canvas API for rendering
- Offscreen Canvas for large datasets (Web Workers)
- Virtualized scrolling (only render visible time range)

**Features:**
- Zoom (time scale)
- Pan (horizontal scroll)
- Signal grouping/hierarchy
- Radix selection (binary/hex/decimal)
- Measurement cursors
- Signal search/filter

**Performance Targets:**
- Render 1M+ signal transitions smoothly (60 FPS)
- Initial render < 500ms for typical simulation (100K transitions)

---

## 6. Feature Roadmap

### Phase 1: Foundation (Weeks 1-2)

| Feature | Description | Status |
|---------|-------------|--------|
| Project scaffolding | Express server + static file serving | 🟡 Planned |
| File system API | CRUD operations for project files | 🟡 Planned |
| Basic UI shell | Menu bar, toolbar, panels (Flow Navigator, Sources, Editor) | 🟡 Planned |
| Code editor integration | CodeMirror with Verilog syntax | 🟡 Planned |

### Phase 2: Level 1 - UI Parity (Weeks 3-4)

| Feature | Description | Status |
|---------|-------------|--------|
| Complete UI rebuild | All panels, dialogs, icons from scratch | 🟡 Planned |
| Project management UI | New/open/save/close project workflows | 🟡 Planned |
| Console + Tcl interface | Command input, log viewer, message filtering | 🟡 Planned |
| Settings dialog | Project settings, tool paths, editor preferences | 🟡 Planned |

### Phase 3: Level 2 - Real Toolchain (Weeks 5-8)

| Feature | Description | Status |
|---------|-------------|--------|
| Iverilog integration | Compile + simulate Verilog | 🟡 Planned |
| VCD parser | Parse simulation outputs | 🟡 Planned |
| Waveform viewer | Canvas-based signal rendering | 🟡 Planned |
| Error highlighting | Mark errors in code editor | 🟡 Planned |
| Verilator linting | Real-time syntax checking | 🟡 Planned |

### Phase 4: Level 3 - Full Workflow (Weeks 9-16)

| Feature | Description | Status |
|---------|-------------|--------|
| Yosys synthesis | RTL → netlist | 🟡 Planned |
| Netlist viewer | Schematic rendering | 🟡 Planned |
| nextpnr integration | Place & route for iCE40 | 🟡 Planned |
| Timing analysis | Setup/hold checks, slack reports | 🟡 Planned |
| Bitstream generation | .bin output for iCE40 | 🟡 Planned |
| Device programming | Integration with iceprog/openFPGALoader | 🟡 Planned |

### Phase 5: Advanced Features (Weeks 17+)

| Feature | Description | Status |
|---------|-------------|--------|
| ECP5 support | nextpnr-ecp5 + prjtrellis | 🟡 Planned |
| Xilinx support (stretch) | Project X-Ray integration | 🟡 Research |
| Block design | Visual IP integrator | 🟡 Future |
| Tcl scripting | Full automation support | 🟡 Future |
| Multi-project workspace | Work on multiple projects | 🟡 Future |

---

## 7. API Specification

### 7.1 REST Endpoints

#### Projects

```http
POST /api/projects
Content-Type: application/json

{
  "name": "my_fpga_project",
  "part": "ice40hx8k",
  "language": "verilog"
}

Response: 201 Created
{
  "id": "proj_abc123",
  "name": "my_fpga_project",
  "created_at": "2026-11-05T10:30:00Z",
  "path": "/Users/kerrylee/webvado/projects/my_fpga_project"
}
```

#### Files

```http
POST /api/projects/:id/files
Content-Type: application/json

{
  "path": "srcs/rtl/counter.v",
  "content": "module counter(...); endmodule"
}

Response: 201 Created
{
  "path": "srcs/rtl/counter.v",
  "size": 245,
  "modified_at": "2026-11-05T10:31:00Z"
}
```

#### Build

```http
POST /api/projects/:id/build/synthesize
Content-Type: application/json

{
  "top_module": "counter_top"
}

Response: 202 Accepted
{
  "job_id": "build_xyz789",
  "status": "running",
  "ws_channel": "build:build_xyz789"
}
```

### 7.2 WebSocket Events

**Channel Format:** `/ws/projects/:id`

**Client → Server:**
```json
{
  "type": "build:start",
  "payload": { "stage": "synthesis" }
}
```

**Server → Client:**
```json
{
  "type": "build:log",
  "payload": {
    "level": "info",
    "message": "Compiling counter.v...",
    "timestamp": 1699189800000
  }
}

{
  "type": "build:progress",
  "payload": {
    "stage": "synthesis",
    "percent": 45,
    "message": "Optimizing netlist..."
  }
}

{
  "type": "build:complete",
  "payload": {
    "stage": "synthesis",
    "success": true,
    "duration_ms": 3420,
    "errors": [],
    "warnings": [
      {
        "file": "counter.v",
        "line": 12,
        "column": 5,
        "message": "Signal 'unused_wire' is never used"
      }
    ]
  }
}
```

---

## 8. Data Models

### 8.1 Project Schema

```typescript
interface Project {
  id: string;                    // Unique identifier
  name: string;                  // Project name
  path: string;                  // Absolute path on filesystem
  part: string;                  // Target FPGA (e.g., "ice40hx8k")
  language: 'verilog' | 'vhdl';  // HDL language
  top_module: string;            // Top-level module name
  created_at: string;            // ISO 8601 timestamp
  updated_at: string;
  settings: ProjectSettings;
  build_status: BuildStatus;
}

interface ProjectSettings {
  simulator: 'iverilog' | 'verilator';
  synthesis_strategy: 'default' | 'area' | 'speed';
  target_frequency_mhz: number;
}

interface BuildStatus {
  synthesis?: StageStatus;
  implementation?: StageStatus;
  bitstream?: StageStatus;
}

interface StageStatus {
  status: 'idle' | 'running' | 'success' | 'failed';
  started_at?: string;
  completed_at?: string;
  errors: Diagnostic[];
  warnings: Diagnostic[];
}

interface Diagnostic {
  file: string;
  line: number;
  column: number;
  severity: 'error' | 'warning' | 'info';
  message: string;
  code?: string;  // Tool-specific error code
}
```

### 8.2 File System Schema

```typescript
interface FileNode {
  type: 'file' | 'directory';
  name: string;
  path: string;  // Relative to project root
  children?: FileNode[];  // Only for directories
  metadata?: {
    size: number;
    modified_at: string;
    file_type: 'verilog' | 'vhdl' | 'constraint' | 'testbench' | 'other';
  };
}

interface SourceHierarchy {
  design_sources: FileNode[];
  constraints: FileNode[];
  simulation_sources: FileNode[];
  utility_sources: FileNode[];
}
```

---

## 9. UI Design System

### 9.1 Color Palette (Vivado 2017.4 Theme)

```css
:root {
  /* Windows XP-inspired grays */
  --bg-window: #ece9d8;
  --bg-panel: #f5f5f5;
  --bg-panel-header: linear-gradient(to bottom, #717171, #5c5c5c);
  --bg-titlebar: linear-gradient(to bottom, #f9f9f9, #e5e5e5);
  
  /* Borders */
  --border-default: #c8c8c8;
  --border-dark: #adadad;
  
  /* Interactive elements */
  --accent-blue: #0078d7;
  --accent-blue-hover: #bee6fd;
  --accent-green: #107c10;
  --accent-red: #e81123;
  --accent-orange: #ca5010;
  
  /* Text */
  --text-primary: #000;
  --text-secondary: #444;
  --text-disabled: #999;
}
```

### 9.2 Typography

```css
body {
  font-family: "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 11px;  /* Base font size matches Vivado */
}

code, pre, .monospace {
  font-family: Consolas, "Courier New", monospace;
  font-size: 12px;
}

h1 { font-size: 18px; font-weight: 600; }
h2 { font-size: 14px; font-weight: 600; }
h3 { font-size: 12px; font-weight: 600; }
```

### 9.3 Component Library

All UI components will be built from scratch using vanilla HTML/CSS:

| Component | Description | Example |
|-----------|-------------|---------|
| **Button** | Standard, primary, ghost variants | `<button class="btn btn-primary">OK</button>` |
| **Input** | Text, number, file inputs | `<input type="text" class="input">` |
| **Select** | Dropdown menus | `<select class="select">...</select>` |
| **Checkbox** | Boolean selection | `<label><input type="checkbox"> Option</label>` |
| **Radio** | Single choice | `<label><input type="radio" name="g"> Option</label>` |
| **Panel** | Container with title bar | `<div class="panel">...</div>` |
| **Tree View** | Hierarchical file explorer | `<div class="tree">...</div>` |
| **Tab Bar** | Horizontal tabs | `<div class="tabs">...</div>` |
| **Modal** | Dialog overlay | `<div class="modal">...</div>` |
| **Progress Bar** | Build progress indicator | `<div class="progress"><div class="progress-bar"></div></div>` |

---

## 10. Toolchain Integration

### 10.1 Icarus Verilog (iverilog)

**Use Cases:**
- Syntax checking (`iverilog -t null`)
- Compilation (`iverilog -o sim.vvp`)
- Simulation (`vvp sim.vvp`)

**Command Generation:**
```javascript
function generateIverilogCommand(project) {
  const sources = project.sources.filter(f => f.type === 'verilog');
  const includes = project.includePaths.map(p => `-I${p}`);
  
  return [
    'iverilog',
    '-g2012',              // SystemVerilog 2012
    '-Wall',               // All warnings
    '-o', `${project.buildDir}/sim.vvp`,
    ...includes,
    ...sources.map(s => s.path)
  ];
}
```

**Error Parsing:**
```javascript
// Input: "counter.v:15: error: syntax error"
// Output: { file: 'counter.v', line: 15, column: 0, message: 'syntax error' }

function parseIverilogError(line) {
  const match = line.match(/^(.+?):(\d+):\s*(error|warning):\s*(.+)$/);
  if (!match) return null;
  
  return {
    file: match[1],
    line: parseInt(match[2]),
    column: 0,  // iverilog doesn't report column
    severity: match[3],
    message: match[4]
  };
}
```

### 10.2 Yosys (Synthesis)

**Command:**
```bash
yosys -p "
  read_verilog counter.v;
  synth_ice40 -top counter_top -json counter.json;
  write_json counter_netlist.json
"
```

**Netlist Output:**
```json
{
  "modules": {
    "counter_top": {
      "ports": {
        "clk": { "direction": "input", "bits": [2] },
        "led": { "direction": "output", "bits": [3, 4, 5, 6] }
      },
      "cells": {
        "counter_reg[0]": {
          "type": "SB_DFF",
          "connections": { "C": [2], "D": [7], "Q": [3] }
        }
      }
    }
  }
}
```

### 10.3 nextpnr (Place & Route)

**Command:**
```bash
nextpnr-ice40 \
  --hx8k \
  --package ct256 \
  --json counter.json \
  --pcf pins.pcf \
  --asc counter.asc
```

**PCF (Physical Constraints File):**
```
set_io clk J3
set_io led[0] B5
set_io led[1] B4
set_io led[2] A2
set_io led[3] A1
```

**Timing Report Parsing:**
```javascript
// Input: "Info: Max frequency for clock 'clk': 45.32 MHz"
// Output: { clock: 'clk', max_freq_mhz: 45.32 }

function parseTimingReport(logText) {
  const freqMatch = logText.match(/Max frequency for clock '(.+?)':\s*([\d.]+)\s*MHz/);
  if (!freqMatch) return null;
  
  return {
    clock: freqMatch[1],
    max_freq_mhz: parseFloat(freqMatch[2])
  };
}
```

---

## 11. Testing Strategy

### 11.1 Backend Unit Tests (Jest)

**Test Coverage Targets:**
- Services: 90%+ coverage
- API routes: 80%+ coverage
- Utilities: 95%+ coverage

**Example Test:**
```javascript
describe('ProjectManager', () => {
  it('should create a new project with valid structure', async () => {
    const pm = new ProjectManager(testDir);
    const project = await pm.create({
      name: 'test_project',
      part: 'ice40hx8k'
    });
    
    expect(project.id).toBeDefined();
    expect(fs.existsSync(project.path)).toBe(true);
    expect(fs.existsSync(path.join(project.path, '.webvado'))).toBe(true);
  });
});
```

### 11.2 Frontend Integration Tests (Playwright)

**Critical User Flows:**
1. Create project → Add file → Save → Reload page → File persists
2. Edit code → Run synthesis → See errors in console and editor
3. Run simulation → View waveforms → Zoom/pan → Export screenshot

**Example Test:**
```javascript
test('should compile and simulate LED blinker', async ({ page }) => {
  await page.goto('http://localhost:3000');
  
  // Create project
  await page.click('[data-test="new-project"]');
  await page.fill('[name="project-name"]', 'led_blink');
  await page.click('[data-test="create"]');
  
  // Add source file
  await page.click('[data-test="add-source"]');
  await page.setInputFiles('[type="file"]', 'fixtures/led_blink.v');
  
  // Run synthesis
  await page.click('[data-test="run-synthesis"]');
  await page.waitForSelector('[data-test="synthesis-complete"]');
  
  // Verify success
  const status = await page.textContent('[data-test="build-status"]');
  expect(status).toContain('synth_design Complete');
});
```

### 11.3 Toolchain Integration Tests

**Test Matrix:**

| Tool | Test Case | Expected Output |
|------|-----------|-----------------|
| iverilog | Compile valid Verilog | Exit code 0, .vvp file created |
| iverilog | Compile with syntax error | Exit code 1, error message parsed |
| vvp | Run simulation | Exit code 0, .vcd file created |
| yosys | Synthesize counter | Exit code 0, .json netlist created |
| nextpnr | Place & route | Exit code 0, .asc file created |

---

## 12. Deployment & Distribution

### 12.1 Local Development

```bash
git clone https://github.com/username/webvado.git
cd webvado
npm install
npm run dev  # Starts backend on :3000, opens browser
```

### 12.2 Production Build

```bash
npm run build
# Output:
# - dist/frontend/  → Static files
# - dist/backend/   → Bundled Node.js app
```

### 12.3 Packaging Options

**Option A: Standalone Package**
```bash
npm run package
# Creates webvado-v1.0.0-darwin-x64.tar.gz containing:
# - Node.js runtime (bundled)
# - Backend + Frontend
# - Precompiled toolchains (optional)
```

**Option B: Docker Image**
```dockerfile
FROM node:18-alpine
RUN apk add --no-cache iverilog yosys icestorm
COPY . /app
WORKDIR /app
RUN npm ci --production
EXPOSE 3000
CMD ["node", "backend/server.js"]
```

**Option C: Electron App (Future)**
- Desktop app with native menus
- Auto-updater
- Better file system integration

---

## 13. Security Considerations

### 13.1 Threat Model

**Risks:**
1. **Command Injection**: User-controlled input passed to `child_process.spawn`
2. **Path Traversal**: User uploads file with path like `../../../../etc/passwd`
3. **Denial of Service**: Infinite loop in Verilog code consumes 100% CPU
4. **XSS**: User-generated content rendered without sanitization

**Mitigations:**

| Risk | Mitigation |
|------|-----------|
| Command Injection | Use `execa` with array args, never shell interpolation |
| Path Traversal | Validate all paths with `path.resolve()` and check they start with project dir |
| DoS | Kill child processes after 60s timeout, limit concurrent builds |
| XSS | Sanitize all user input with DOMPurify before rendering |

### 13.2 Input Validation

```javascript
function validateProjectName(name) {
  if (!/^[a-zA-Z0-9_-]{1,50}$/.test(name)) {
    throw new ValidationError('Invalid project name');
  }
}

function validateFilePath(projectPath, userPath) {
  const resolved = path.resolve(projectPath, userPath);
  if (!resolved.startsWith(projectPath)) {
    throw new SecurityError('Path traversal detected');
  }
  return resolved;
}
```

---

## 14. Performance Requirements

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Cold Start** | < 3s | Time from `npm start` to browser opens |
| **Project Load** | < 500ms | Load project with 100 files |
| **File Save** | < 100ms | Save 10KB Verilog file |
| **Syntax Check** | < 1s | Verilator lint on 1000-line file |
| **Compilation** | < 5s | iverilog compile 10-file project |
| **Simulation** | < 10s | Run 1M cycle simulation |
| **Waveform Render** | < 500ms | Render 100K signal transitions |
| **Synthesis** | < 30s | Yosys synthesis of 5K LUT design |
| **Place & Route** | < 2min | nextpnr on iCE40-HX8K |

---

## 15. Success Criteria

### Level 2 (Minimum Viable Product)

✅ **Functional Requirements:**
- [ ] User can create a new project
- [ ] User can add/edit/delete Verilog files
- [ ] User can run iverilog compilation and see errors
- [ ] User can run behavioral simulation
- [ ] User can view waveforms with zoom/pan
- [ ] All UI matches Vivado's layout (Flow Navigator, Sources, Editor, Console)

✅ **Non-Functional Requirements:**
- [ ] Zero crashes during 1-hour user session
- [ ] All operations complete within performance targets
- [ ] Works on macOS, Linux, Windows (with toolchains installed)
- [ ] 100% of features work offline

### Level 3 (Full FPGA Workflow)

✅ **Functional Requirements:**
- [ ] User can synthesize RTL to netlist
- [ ] User can run place & route
- [ ] User can view timing reports
- [ ] User can generate bitstreams for iCE40/ECP5
- [ ] User can program physical FPGA device

✅ **Stretch Goal (Xilinx Support):**
- [ ] Research Project X-Ray feasibility
- [ ] Prototype Xilinx 7-series bitstream generation
- [ ] Document limitations vs. proprietary Vivado

---

## Appendix A: Reference Materials

- **Vivado User Guide (UG893)**: UI layout reference
- **Icarus Verilog Manual**: Command-line syntax
- **Yosys Manual**: Synthesis commands and JSON format
- **nextpnr Documentation**: P&R algorithms and PCF syntax
- **Project IceStorm**: iCE40 bitstream format
- **Project Trellis**: ECP5 bitstream format
- **Project X-Ray**: Xilinx 7-series bitstream (research)

---

## Appendix B: License Strategy

**Recommended License:** MIT License

**Justification:**
- Maximum compatibility with open-source tools (Yosys, nextpnr are ISC/MIT)
- Allows commercial use (users can build products with WebVado)
- Simple and permissive (encourages contributions)

**Alternative:** Apache 2.0 (if patent protection is desired)

---

**END OF SPECIFICATION**
