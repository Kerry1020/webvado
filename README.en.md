# WebVado

[中文](README.md) · [Quick start](docs/QUICK_START.md) · [Verification record](docs/STATUS.md)

A browser-based Verilog workbench with a Vivado 2017.4-inspired interface. Express runs the local FPGA toolchain; the frontend uses vanilla JavaScript and local assets, without React, Vue, or CDN dependencies.

## Start

Requires Node.js 18+, npm, and a desktop browser.

```sh
git clone https://github.com/Kerry1020/webvado.git
cd webvado
npm ci
npm start
```

Open **http://localhost:3000**. `npm run dev` serves both frontend and API from Express; refresh after frontend edits.

### Install the toolchain

Download [OSS CAD Suite](https://github.com/YosysHQ/oss-cad-suite-build/releases) for your OS and CPU, verify the official SHA-256, and extract it into `tools/oss-cad-suite/`. Homebrew is not required.

Alternatively, use an existing installation:

```sh
WEBVADO_TOOLCHAIN=/absolute/path/oss-cad-suite/bin npm start
npm run check-tools
```

The configured directory (or bundled directory) is searched before system `PATH`. Help → About shows detection results. Missing tools produce explicit build errors.

## Workflow

1. Create a project and select a device.
2. Add design sources to `srcs/rtl`, testbenches to `srcs/sim`, and constraints to `srcs/constrs`.
3. Edit a file and save with the toolbar or Ctrl/Cmd+S. The file context menu sets the top module.
4. **Check Syntax** invokes Icarus Verilog.
5. **Run Simulation** compiles design and testbench, runs vvp, and displays the generated VCD.
6. **Run Synthesis** invokes Yosys and produces a netlist and utilization statistics.
7. For iCE40 projects, **Run Implementation** invokes nextpnr and **Generate Bitstream** invokes icepack.
8. **Open Hardware Manager** detects a programming cable and flashes the bitstream (openFPGALoader; manual trigger only, stale bitstreams are rejected).

See the [sample design and testbench](docs/QUICK_START.md). Device, package, and PCF pin assignments must match the board. Producing a bitstream does not prove hardware operation; no physical-board programming result is claimed.

## Scope

- English/Chinese UI switching via Help → Language, persisted in the browser.
- Text editor with line numbers, find/replace, undo/redo, and compiler diagnostics. It is not CodeMirror/Monaco and has no semantic completion.
- Console commands and history. This is a limited command dispatcher, **not a Tcl interpreter**; use `help` for supported commands.
- VCD scalar and bus signals with zoom and pan.
- iCE40 is the place-and-route/bitstream target. Yosys device support does not imply that every device is integrated here.
- IP Catalog, graphical Block Design, and RTL elaboration views are not implemented. The post-synthesis netlist schematic (SVG) is implemented, as is hardware programming via openFPGALoader (manual trigger only; stale bitstreams are rejected) — but no physical board has been programmed, so real-device flashing is not claimed as verified. Capability messages are not implementations of features.
- No direct Vivado project import, proprietary IP, or VHDL compilation.

Application assets are local. Editing and builds work offline after dependencies and tools are installed; external documentation/GitHub links require a network connection.

## Development

```sh
npm run check             # JavaScript syntax, including imported modules
npm run lint
npm test                  # Node unit tests
npm run test:integration  # Real FPGA tools required
npm run test:e2e          # Playwright browser regressions
npm run build             # Runnable ESM tree in dist/
```

Install the browser once with `npx playwright install chromium`. Test requirements and actual results are recorded in [STATUS.md](docs/STATUS.md).

The build preserves the source directory structure and ESM imports. It excludes dependencies, user projects, and tool binaries. Run `node dist/backend/server.js` from the repository, with `WEBVADO_TOOLCHAIN` pointing to an external toolchain when needed. Set `WEBVADO_PROJECTS_DIR` to choose a project storage directory.

`backend/` contains API routes, services, and VCD parsing. `frontend/` contains local HTML/CSS/JS. `projects/` stores user data and `tools/` stores local binaries; neither belongs in Git. Test and build helpers live in `tests/` and `scripts/`.

The original specification and implementation plan describe design goals, not verified delivery. Report bugs with reproduction steps and preserve diagnostics in fixes.

[Issues](https://github.com/Kerry1020/webvado/issues) · MIT License
