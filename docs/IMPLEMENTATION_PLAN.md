# WebVado Implementation Plan

> 原始路线图，不是完成清单。当前实现范围和实际验证见 [STATUS.md](STATUS.md)；未实现的阶段不能因本文件存在而视为已交付。
**Version:** 1.0  
**Created:** 2026-11-05  
**Target Completion:** 16 weeks

---

## Overview

This document outlines the complete implementation plan for WebVado, broken down into manageable tasks organized by phase. Each task includes acceptance criteria, dependencies, and verification steps.

## Phase Breakdown

| Phase | Duration | Description | Milestone |
|-------|----------|-------------|-----------|
| **Phase 1** | Weeks 1-2 | Foundation & Infrastructure | Basic app runs locally |
| **Phase 2** | Weeks 3-4 | UI Rebuild & Polish | Vivado-like interface complete |
| **Phase 3** | Weeks 5-8 | Level 2 - Real Toolchain | Compilation & simulation work |
| **Phase 4** | Weeks 9-16 | Level 3 - Full FPGA Workflow | Synthesis to bitstream |

---

## Phase 1: Foundation (Weeks 1-2)

### Checkpoint Goals
- [x] Project scaffolding complete
- [ ] Backend server running and serving frontend
- [ ] Frontend loads without errors
- [ ] Basic UI shell visible
- [ ] API endpoints respond correctly

### Tasks

#### Task 1.1: Project Infrastructure ✅ DONE
**Description:** Set up repository structure, package.json, configuration files

**Completed:**
- [x] Directory structure created
- [x] package.json with all dependencies
- [x] README.md with installation instructions
- [x] SPECIFICATION.md (60-page technical spec)
- [x] Backend server.js skeleton
- [x] Frontend index.html scaffold
- [x] Main CSS file with Vivado theme

**Dependencies:** None

---

#### Task 1.2: Backend Core Services
**Description:** Implement core backend services for file system, project management, and API routing

**Acceptance Criteria:**
- [ ] ProjectManager service can create/read projects
- [ ] File system operations work (create/read/write/delete)
- [ ] API endpoints return correct responses
- [ ] WebSocket connections establish successfully
- [ ] Error handling and logging in place

**Files to Create:**
- `backend/services/ProjectManager.js`
- `backend/services/FileManager.js`
- `backend/routes/projects.js`
- `backend/routes/files.js`
- `backend/utils/validation.js`

**Verification:**
```bash
npm test -- backend/services/
curl http://localhost:3000/api/health
curl http://localhost:3000/api/projects
```

**Dependencies:** Task 1.1

**Estimated Effort:** 2 days

---

#### Task 1.3: Frontend Module Architecture
**Description:** Create remaining frontend modules (UIManager, ProjectManager, etc.)

**Acceptance Criteria:**
- [ ] UIManager initializes and sets up event delegation
- [ ] ProjectManager communicates with backend API
- [ ] EditorManager placeholder ready
- [ ] ConsoleManager can log messages
- [ ] All modules export ES6 classes

**Files to Create:**
- `frontend/js/ui/UIManager.js`
- `frontend/js/managers/ProjectManager.js`
- `frontend/js/managers/EditorManager.js`
- `frontend/js/managers/ConsoleManager.js`
- `frontend/js/components/Dialog.js`
- `frontend/js/components/TreeView.js`

**Verification:**
- Open browser console, no errors
- `window.webvado` object available
- Click menu items, events fire

**Dependencies:** Task 1.1

**Estimated Effort:** 2 days

---

#### Task 1.4: Menu Bar & Toolbar Functionality
**Description:** Wire up all menu items and toolbar buttons to event system

**Acceptance Criteria:**
- [ ] All menu items trigger correct events
- [ ] Toolbar buttons have working click handlers
- [ ] Keyboard shortcuts work (Ctrl+S, Ctrl+N, etc.)
- [ ] Menu dropdowns open/close correctly
- [ ] Disabled states work

**Files to Modify:**
- `frontend/js/ui/UIManager.js`
- `frontend/js/main.js`

**Verification:**
- Click every menu item, check console for event
- Test all keyboard shortcuts
- Verify disabled items don't trigger events

**Dependencies:** Task 1.3

**Estimated Effort:** 1 day

---

### Checkpoint 1: Foundation Complete

**Verification Checklist:**
- [ ] `npm start` launches server without errors
- [ ] Browser opens to http://localhost:3000
- [ ] Welcome screen displays correctly
- [ ] All menus and buttons clickable (even if not functional)
- [ ] Console logs messages correctly
- [ ] No JavaScript errors in browser console

---

## Phase 2: UI Rebuild (Weeks 3-4)

### Checkpoint Goals
- [ ] All UI components match Vivado 2017.4 appearance
- [ ] Flow Navigator populated with real sections
- [ ] Sources panel shows file tree
- [ ] Code editor integrated (CodeMirror 6)
- [ ] Console fully functional

### Tasks

#### Task 2.1: Flow Navigator Component
**Description:** Build the Flow Navigator sidebar with collapsible sections

**Acceptance Criteria:**
- [ ] All sections render (Project Manager, Simulation, Synthesis, etc.)
- [ ] Sections expand/collapse on click
- [ ] Items have play icons where appropriate
- [ ] Completed items show checkmarks
- [ ] Matches Vivado styling exactly

**Files to Create:**
- `frontend/js/components/FlowNavigator.js`
- `frontend/css/components/flow-navigator.css`

**Reference Images:**
- Extract from `vivado的使用步骤与仿真详解.html` (Flow Navigator screenshots)

**Dependencies:** Task 1.3

**Estimated Effort:** 2 days

---

#### Task 2.2: Sources Panel & File Tree
**Description:** Implement the Sources panel with hierarchical file tree

**Acceptance Criteria:**
- [ ] Tree view shows Design Sources, Constraints, Simulation Sources
- [ ] Files grouped under correct categories
- [ ] Tree nodes expand/collapse
- [ ] Files selectable (highlight on click)
- [ ] Context menu on right-click
- [ ] Drag-and-drop file upload works

**Files to Create:**
- `frontend/js/components/SourcesPanel.js`
- `frontend/js/components/TreeView.js`
- `frontend/css/components/tree-view.css`

**Dependencies:** Task 2.1

**Estimated Effort:** 3 days

---

#### Task 2.3: Code Editor Integration
**Description:** Integrate CodeMirror 6 with Verilog syntax highlighting

**Acceptance Criteria:**
- [ ] CodeMirror loads in editor area
- [ ] Verilog syntax highlighting works
- [ ] Line numbers display
- [ ] Tab support (insert 4 spaces)
- [ ] Error markers can be placed
- [ ] Undo/redo works
- [ ] Find/Replace dialog functional

**Files to Create:**
- `frontend/js/editor/CodeMirrorWrapper.js`
- `frontend/js/editor/VerilogMode.js`
- `frontend/js/components/FindReplaceDialog.js`
- `frontend/css/codemirror.css`

**Dependencies:** Task 2.2

**Estimated Effort:** 3 days

---

#### Task 2.4: Console Implementation
**Description:** Complete console functionality with log filtering and Tcl-like commands

**Acceptance Criteria:**
- [ ] Logs display with correct colors (info/warning/error/success)
- [ ] Console input accepts commands
- [ ] Command history (up/down arrows)
- [ ] Auto-scroll to bottom
- [ ] Clear console button works
- [ ] Search in console works
- [ ] Tabs (Tcl Console, Messages, Logs, Reports) functional

**Files to Create:**
- `frontend/js/managers/ConsoleManager.js` (complete implementation)
- `frontend/js/console/CommandParser.js`
- `frontend/css/components/console.css`

**Dependencies:** Task 2.3

**Estimated Effort:** 2 days

---

#### Task 2.5: Dialogs System
**Description:** Build reusable dialog system for New Project, Settings, About, etc.

**Acceptance Criteria:**
- [ ] New Project dialog with form validation
- [ ] Open Project dialog (file picker simulation)
- [ ] Settings dialog with tabs
- [ ] About dialog with version info
- [ ] Modal overlay blocks interactions
- [ ] Escape key closes dialogs
- [ ] Form submission works

**Files to Create:**
- `frontend/js/ui/DialogManager.js`
- `frontend/js/components/dialogs/NewProjectDialog.js`
- `frontend/js/components/dialogs/SettingsDialog.js`
- `frontend/js/components/dialogs/AboutDialog.js`
- `frontend/css/components/dialog.css`

**Dependencies:** Task 2.4

**Estimated Effort:** 2 days

---

### Checkpoint 2: UI Complete

**Verification Checklist:**
- [ ] Side-by-side comparison with Vivado screenshots matches 95%+
- [ ] All panels resize correctly
- [ ] Code editor syntax highlights Verilog
- [ ] Console displays all log types with correct styling
- [ ] Dialogs open/close without visual glitches
- [ ] Keyboard navigation works throughout UI

---

## Phase 3: Level 2 - Real Toolchain (Weeks 5-8)

### Checkpoint Goals
- [ ] Icarus Verilog integrated
- [ ] Projects compile successfully
- [ ] Simulations run and generate VCD
- [ ] Waveform viewer displays signals
- [ ] Error markers appear in editor

### Tasks

#### Task 3.1: Toolchain Manager
**Description:** Detect and manage external toolchain binaries

**Acceptance Criteria:**
- [ ] Detect iverilog, verilator, yosys on system PATH
- [ ] Report versions to frontend
- [ ] Warn if tools missing
- [ ] Provide installation links
- [ ] Support custom tool paths in settings

**Files to Create:**
- `backend/services/ToolchainManager.js`
- `backend/utils/toolDetection.js`

**Verification:**
```bash
node scripts/check-toolchain.js
curl http://localhost:3000/api/tools
```

**Dependencies:** Task 2.5

**Estimated Effort:** 2 days

---

#### Task 3.2: Build Service - Compilation
**Description:** Implement Verilog compilation with Icarus Verilog

**Acceptance Criteria:**
- [ ] Generate correct iverilog command from project files
- [ ] Execute iverilog via child_process
- [ ] Stream stdout/stderr to frontend via WebSocket
- [ ] Parse errors and warnings
- [ ] Return diagnostic objects with file/line/column
- [ ] Handle compilation failures gracefully

**Files to Create:**
- `backend/services/BuildService.js`
- `backend/services/CompilationService.js`
- `backend/parsers/IverilogParser.js`

**Verification:**
- Create test project with syntax error
- Run synthesis
- Verify error appears in console and editor

**Dependencies:** Task 3.1

**Estimated Effort:** 4 days

---

#### Task 3.3: Simulation Engine
**Description:** Execute simulations and generate VCD files

**Acceptance Criteria:**
- [ ] Compile testbench with iverilog
- [ ] Execute `vvp` simulator
- [ ] Generate VCD output file
- [ ] Parse VCD file to JSON
- [ ] Return signal data to frontend
- [ ] Support simulation time range selection

**Files to Create:**
- `backend/services/SimulationEngine.js`
- `backend/parsers/VCDParser.js`
- `backend/utils/vcdToJson.js`

**Verification:**
- Run simulation on example project
- Verify VCD file generated
- Check JSON conversion correctness

**Dependencies:** Task 3.2

**Estimated Effort:** 5 days

---

#### Task 3.4: Waveform Viewer (Canvas)
**Description:** Build high-performance waveform renderer

**Acceptance Criteria:**
- [ ] Canvas renders signal waveforms
- [ ] Zoom in/out with mouse wheel
- [ ] Pan horizontally
- [ ] Signal labels on left
- [ ] Time axis on top
- [ ] Radix selection (binary/hex/decimal)
- [ ] Measurement cursors
- [ ] 60 FPS smooth rendering

**Files to Create:**
- `frontend/js/waveform/WaveformViewer.js`
- `frontend/js/waveform/SignalRenderer.js`
- `frontend/js/waveform/TimeAxis.js`
- `frontend/css/components/waveform.css`

**Reference:**
- Study GTKWave UI for layout
- Use Canvas API best practices

**Dependencies:** Task 3.3

**Estimated Effort:** 6 days

---

#### Task 3.5: Error Highlighting in Editor
**Description:** Mark compilation errors directly in code

**Acceptance Criteria:**
- [ ] Parse diagnostics from backend
- [ ] Place error/warning markers in CodeMirror
- [ ] Hover shows full error message
- [ ] Errors clear on successful compilation
- [ ] Navigate to next/previous error with shortcuts

**Files to Modify:**
- `frontend/js/editor/CodeMirrorWrapper.js`
- `frontend/js/managers/EditorManager.js`

**Dependencies:** Task 3.2, Task 2.3

**Estimated Effort:** 2 days

---

#### Task 3.6: Project Persistence
**Description:** Save/load projects to/from disk

**Acceptance Criteria:**
- [ ] Save project metadata to `.webvado/project.json`
- [ ] Save all file contents
- [ ] Load project on open
- [ ] Auto-save on file edit (debounced)
- [ ] Recent projects list

**Files to Modify:**
- `backend/services/ProjectManager.js`
- `frontend/js/managers/ProjectManager.js`

**Dependencies:** Task 3.5

**Estimated Effort:** 2 days

---

### Checkpoint 3: Level 2 Complete

**Verification Checklist:**
- [ ] Create new project with LED blinker example
- [ ] Add testbench
- [ ] Compile successfully (no errors)
- [ ] Run simulation
- [ ] View waveforms in integrated viewer
- [ ] Zoom and pan waveforms smoothly
- [ ] Introduce syntax error, verify marker in editor

---

## Phase 4: Level 3 - Full FPGA Workflow (Weeks 9-16)

### Checkpoint Goals
- [ ] Yosys synthesis works
- [ ] nextpnr place & route completes
- [ ] Timing reports generated
- [ ] Bitstream file created
- [ ] Device programming supported

### Tasks

#### Task 4.1: Yosys Integration - Synthesis
**Description:** Integrate Yosys for RTL synthesis

**Acceptance Criteria:**
- [ ] Generate Yosys script from project
- [ ] Execute Yosys synthesis
- [ ] Parse JSON netlist output
- [ ] Display utilization report
- [ ] Show cell counts (LUTs, FFs, etc.)

**Files to Create:**
- `backend/services/SynthesisService.js`
- `backend/parsers/YosysParser.js`
- `backend/utils/yosysScriptGenerator.js`

**Dependencies:** Task 3.6

**Estimated Effort:** 5 days

---

#### Task 4.2: Netlist Viewer (SVG)
**Description:** Render synthesized netlist as schematic

**Acceptance Criteria:**
- [ ] Parse Yosys JSON netlist
- [ ] Generate SVG schematic
- [ ] Show modules, ports, cells, connections
- [ ] Pan and zoom SVG
- [ ] Click cell to highlight

**Files to Create:**
- `frontend/js/netlist/NetlistViewer.js`
- `frontend/js/netlist/SchematicRenderer.js`

**Dependencies:** Task 4.1

**Estimated Effort:** 6 days

---

#### Task 4.3: nextpnr Integration - Place & Route
**Description:** Run FPGA place and route with nextpnr

**Acceptance Criteria:**
- [ ] Convert constraint files (XDC → PCF)
- [ ] Execute nextpnr-ice40
- [ ] Parse placement result
- [ ] Parse routing result
- [ ] Display resource usage

**Files to Create:**
- `backend/services/PlaceRouteService.js`
- `backend/parsers/NextpnrParser.js`
- `backend/utils/xdcToPcf.js`

**Dependencies:** Task 4.2

**Estimated Effort:** 5 days

---

#### Task 4.4: Timing Analysis
**Description:** Parse and display timing reports

**Acceptance Criteria:**
- [ ] Parse nextpnr timing output
- [ ] Show critical path
- [ ] Display setup/hold slack
- [ ] Show max frequency per clock
- [ ] Highlight timing violations

**Files to Create:**
- `backend/services/TimingAnalyzer.js`
- `frontend/js/components/TimingReport.js`

**Dependencies:** Task 4.3

**Estimated Effort:** 4 days

---

#### Task 4.5: Bitstream Generation
**Description:** Generate .bin bitstream file

**Acceptance Criteria:**
- [ ] Execute icepack (iCE40) or ecppack (ECP5)
- [ ] Generate bitstream file
- [ ] Verify bitstream integrity
- [ ] Provide download link

**Files to Create:**
- `backend/services/BitstreamService.js`

**Dependencies:** Task 4.4

**Estimated Effort:** 2 days

---

#### Task 4.6: Device Programming Support
**Description:** Program physical FPGA devices

**Acceptance Criteria:**
- [ ] Detect connected FPGA devices
- [ ] Support iceprog and openFPGALoader
- [ ] Upload bitstream to device
- [ ] Show programming progress
- [ ] Handle programming errors

**Files to Create:**
- `backend/services/ProgrammingService.js`
- `frontend/js/components/ProgrammingDialog.js`

**Dependencies:** Task 4.5

**Estimated Effort:** 3 days

---

### Checkpoint 4: Level 3 Complete

**Verification Checklist:**
- [ ] Synthesize LED blinker with Yosys
- [ ] View netlist schematic
- [ ] Run place & route with nextpnr
- [ ] Check timing report (meets timing)
- [ ] Generate bitstream
- [ ] (Optional) Program real iCE40 board

---

## Testing Strategy

### Unit Tests (Jest)
- Target: 80% coverage for backend services
- Run on every commit

### Integration Tests (Playwright)
- Critical user flows
- Run nightly

### Manual Testing
- UI/UX verification against Vivado screenshots
- Weekly reviews

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Toolchain not available | High | Bundle binaries for Windows, provide install guide |
| CodeMirror performance issues | Medium | Use virtualization, limit file size |
| WebSocket disconnections | Medium | Implement reconnection logic with exponential backoff |
| VCD parsing too slow | Medium | Use Web Workers for parsing |
| nextpnr fails on complex designs | Low | Start with simple examples, document limitations |

---

## Success Criteria

**Phase 1:** ✅ Basic app launches and displays welcome screen  
**Phase 2:** UI matches Vivado 95%+ on side-by-side comparison  
**Phase 3:** Can compile, simulate, and view waveforms for LED blinker  
**Phase 4:** Complete flow from Verilog to bitstream works for iCE40

---

## Next Steps

1. ✅ Set up repository and infrastructure (DONE)
2. ⏳ Implement Task 1.2 - Backend Core Services (IN PROGRESS)
3. Run checkpoint verification for Phase 1
4. Begin Phase 2 UI implementation

---

**Document Status:** Living document, updated weekly  
**Last Updated:** 2026-11-05  
**Owner:** WebVado Project Team
