# WebVado

A web-based FPGA development environment that mimics Vivado's UI but uses open-source toolchains.

## What you can do with it

Write Verilog, synthesize, generate bitstreams, simulate waveforms. All in your browser. No need to install Vivado's 50GB monster.

Currently integrates:
- **Icarus Verilog** — Simulation
- **Yosys** — Synthesis  
- **nextpnr** — Place and route

The UI is modeled after Vivado 2017.4. If you're used to Vivado, you'll feel at home.

## Screenshot

![Main Interface](docs/screenshot-main.png)

Flow Navigator on the left, code editor and file tree in the center, Tcl console at the bottom.

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Install toolchains (optional)

If you want actual synthesis and simulation:

```bash
# macOS
brew install icarus-verilog yosys

# Ubuntu/Debian
sudo apt install iverilog yosys
```

nextpnr requires compilation and is more involved. You can skip it if you just want to try the UI.

### 3. Start the server

```bash
npm start
```

Open http://localhost:3000 in your browser.

## Project Structure

```
webvado/
├── backend/              # Node.js + Express backend
│   ├── server.js         # Server entry point
│   ├── services/         # Core services (project mgmt, file mgmt, toolchain invocation)
│   └── routes/           # API routes
├── frontend/             # Pure HTML/CSS/JS frontend (no framework)
│   ├── index.html        # Main page
│   ├── css/              # Stylesheets
│   ├── js/               # All JS modules
│   │   ├── main.js       # App entry point
│   │   ├── components/   # UI components (Dialog, FlowNavigator, SourcesPanel, etc.)
│   │   ├── managers/     # Managers (ProjectManager, EditorManager, ConsoleManager)
│   │   ├── ui/           # UI utilities (UIManager, icons.js)
│   │   ├── editor/       # Code editor
│   │   └── i18n/         # Multilingual support (EN/CN)
└── projects/             # User project storage
```

## Feature List

### Implemented

- ✅ Project management (create, open, save)
- ✅ Vivado-style Flow Navigator
- ✅ Code editor with syntax highlighting
- ✅ File tree
- ✅ Tcl console
- ✅ Waveform viewer (VCD files)
- ✅ Language switching (EN/CN)
- ✅ Toolchain invocation interface
- ✅ WebSocket real-time communication

### Planned

- ⏳ Full nextpnr integration (currently only Yosys and Icarus)
- ⏳ Block Design (graphical design, like IP Integrator)
- ⏳ Constraint editor (XDC/PCF files)
- ⏳ Hardware Manager (Program Device)
- ⏳ Project import/export
- ⏳ Dark theme

### Won't Do

- ❌ Commercial FPGA tool support (Quartus / ISE / Vivado itself)
- ❌ Proprietary IP cores
- ❌ VHDL support (Verilog only)

## Why This Exists

Vivado is too heavy. 50GB install, slow startup, license hassles. Often you just want to edit a few lines of Verilog, run a simulation, check waveforms — you don't need the full suite.

Open-source toolchains (Yosys + nextpnr) already support many FPGAs (iCE40, ECP5, Gowin, etc.), but there's no good IDE. WebVado aims to be a lightweight, browser-based development environment.

## Tech Stack

- **Backend**: Node.js + Express
- **Frontend**: Vanilla JS (no React/Vue/Angular), ES6 modules
- **UI Style**: Mimics Vivado 2017.4
- **Icons**: Hand-written SVG, no emoji
- **Multilingual**: Custom i18n system, no library dependencies
- **Offline**: All static assets loaded locally, no CDN

Chose Vanilla JS to control bundle size. No 50MB frontend frameworks. All UI components are hand-written.

## Development

### Adding a new Flow Navigator item

Edit `frontend/js/components/FlowNavigator.js`, add to `getSections()`:

```javascript
{
  id: 'my-section',
  title: 'MY SECTION',
  items: [
    { 
      id: 'my-item', 
      iconSvg: Icons.play, 
      label: 'My Item', 
      action: 'my-action',
      playable: true  // green play button
    }
  ]
}
```

Then register the event in `main.js`:

```javascript
this.eventBus.on('action:my-action', () => this.handleMyAction());
```

### Adding a new dialog

Create a new file under `frontend/js/components/dialogs/`, follow the pattern in `NewProjectDialog.js`. All dialog buttons must have `type="button"` to prevent form submission.

### Debugging

Open browser DevTools Console. All components print initialization logs. Server logs are configured with pino in `backend/server.js` and output to the terminal.

## Known Issues

- VCD waveform viewer only displays simple signals; complex buses and hierarchy display has bugs
- Tcl console has no command history
- Code editor autocomplete not implemented yet
- Browser refresh loses project state (need to reopen)

## Contributing

PRs welcome. Search for existing issues before opening a new one.

Code style:
- Use ES6 modules and async/await
- All buttons must have `data-action` attribute
- CSS uses BEM naming
- Commit messages in English, follow [Conventional Commits](https://www.conventionalcommits.org/)

## License

MIT License

---

## FAQ

**Q: Why don't buttons respond when I click them?**

A: Check the browser Console for errors. Most "no response" issues are due to failed JS module loading or unbound events.

**Q: Why don't Flow Navigator section titles show up?**

A: CSS might not have loaded. Check the Network panel to see if `flow-navigator.css` returns 404.

**Q: Which FPGAs are supported?**

A: Theoretically all chips supported by Yosys + nextpnr (iCE40, ECP5, Nexus, Gowin, Anlogic, etc.). In reality I've only tested on iCE40HX8K.

**Q: Can I use VHDL?**

A: No. Yosys has incomplete VHDL support, and I don't want to maintain two languages.

**Q: Can I import Vivado projects?**

A: Not yet. Vivado's project file format is proprietary. You can copy .v files over, but constraints and IP core configs need manual reconstruction.

**Q: Why not use React?**

A: To keep the bundle under 1MB. React brings in tons of dependencies and ends up at 50MB+ after bundling. This project aims to "run smoothly on an old laptop with 2GB RAM."

**Q: Does it work on mobile?**

A: Barely. The UI is designed for desktop; screens under 1024px get crushed.

---

**Bottom line**: This project is still in early development. Many features are half-baked. If you find bugs or have feature requests, open an issue or submit a PR.
