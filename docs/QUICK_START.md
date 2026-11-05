# WebVado Quick Start Guide

This guide will help you get WebVado up and running in under 10 minutes.

## Prerequisites

- **Node.js 18+** ([Download](https://nodejs.org/))
- **Icarus Verilog** (required for Level 2 features)
- **Git** (for cloning the repository)

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/webvado.git
cd webvado
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Install Verilog Toolchain

**macOS:**
```bash
brew install icarus-verilog
```

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install iverilog
```

**Windows:**
Use WSL2 with Ubuntu, then follow Linux instructions.

### 4. Verify Toolchain

```bash
npm run check-tools
```

You should see:
```
✓ Icarus Verilog            v12.0 (or higher)
✓ All required tools are installed!
```

## Running WebVado

### Development Mode

```bash
npm run dev
```

This will:
1. Start the backend server on port 3000
2. Automatically open your browser to `http://localhost:3000`
3. Enable hot-reload for development

### Production Mode

```bash
npm run build
npm start
```

## Your First Project

### 1. Create a New Project

1. Click **File → New Project**
2. Enter project name: `led_blinker`
3. Select target part: `ice40hx8k` (or leave default)
4. Click **Create**

### 2. Add a Verilog File

1. Right-click **Design Sources** in the Flow Navigator
2. Select **Add Sources → Create File**
3. Name: `blinker.v`
4. Add this code:

```verilog
module blinker(
    input clk,
    input rst,
    output reg led
);

reg [23:0] counter;

always @(posedge clk or posedge rst) begin
    if (rst) begin
        counter <= 0;
        led <= 0;
    end else begin
        counter <= counter + 1;
        if (counter == 24'hFFFFFF) begin
            led <= ~led;
            counter <= 0;
        end
    end
end

endmodule
```

### 3. Add a Testbench

1. Right-click **Simulation Sources**
2. Select **Add Sources → Create File**
3. Name: `blinker_tb.v`
4. Add this code:

```verilog
`timescale 1ns / 1ps

module blinker_tb;

reg clk;
reg rst;
wire led;

blinker uut (
    .clk(clk),
    .rst(rst),
    .led(led)
);

initial begin
    clk = 0;
    forever #5 clk = ~clk; // 100MHz clock
end

initial begin
    rst = 1;
    #100 rst = 0;
    
    #100000000; // Run for 100ms
    
    $finish;
end

endmodule
```

### 4. Run Simulation

1. Click **Flow → Run Simulation** (or press the play button in toolbar)
2. Wait for compilation to complete
3. Waveform viewer will open automatically
4. You should see the `led` signal toggling

### 5. Zoom and Explore

- **Zoom in:** Mouse wheel up or `Ctrl +`
- **Zoom out:** Mouse wheel down or `Ctrl -`
- **Pan:** Click and drag horizontally
- **Add cursor:** Click on waveform

## Project Structure

Your project will be created at:
```
~/webvado/projects/led_blinker/
├── .webvado/
│   ├── project.json        # Project metadata
│   └── build/              # Build artifacts
├── srcs/
│   ├── rtl/
│   │   └── blinker.v       # Your Verilog files
│   └── sim/
│       └── blinker_tb.v    # Testbenches
└── README.md
```

## Common Commands

### Tcl Console

WebVado includes a Tcl-like console for advanced users. Try these commands:

```tcl
# Show help
help

# List project files
ls

# Check syntax
check_syntax blinker.v

# Run simulation
launch_simulation -mode behavioral

# View project info
get_property TOP_MODULE [current_project]
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | New Project |
| `Ctrl+O` | Open Project |
| `Ctrl+S` | Save All |
| `Ctrl+F` | Find/Replace |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |
| `F11` | Fullscreen |

## Troubleshooting

### Backend Won't Start

**Problem:** `Error: Cannot find module 'express'`

**Solution:**
```bash
rm -rf node_modules package-lock.json
npm install
```

### Toolchain Not Found

**Problem:** `✗ Icarus Verilog NOT FOUND`

**Solution:**
1. Install Icarus Verilog (see Installation section)
2. Verify with: `iverilog -V`
3. If installed but not found, add to PATH

### Port Already in Use

**Problem:** `Error: listen EADDRINUSE: address already in use :::3000`

**Solution:**
```bash
# Kill existing process
lsof -ti:3000 | xargs kill -9

# Or use a different port
PORT=3001 npm start
```

### Simulation Hangs

**Problem:** Simulation doesn't complete

**Solution:**
- Check testbench has `$finish` statement
- Reduce simulation time
- Check for infinite loops in Verilog

## Next Steps

- **[Read the full documentation](docs/SPECIFICATION.md)**
- **[Explore example projects](examples/)**
- **[Join our Discord community](https://discord.gg/webvado)**
- **[Contribute on GitHub](https://github.com/yourusername/webvado)**

## Level 3 Features (Coming Soon)

Once you're comfortable with simulation, explore these advanced features:

- **Synthesis:** Convert RTL to netlist with Yosys
- **Place & Route:** FPGA implementation with nextpnr
- **Timing Analysis:** Check if your design meets timing
- **Bitstream Generation:** Create .bin files for real FPGAs
- **Device Programming:** Upload to iCE40 or ECP5 boards

To enable Level 3 features, install additional tools:
```bash
# macOS
brew install yosys icestorm nextpnr-ice40

# Ubuntu/Debian
sudo apt-get install yosys fpga-icestorm nextpnr-ice40
```

## Getting Help

- **Documentation:** [docs/](docs/)
- **GitHub Issues:** [Report bugs](https://github.com/yourusername/webvado/issues)
- **Discussions:** [Ask questions](https://github.com/yourusername/webvado/discussions)

---

**Welcome to WebVado! Happy coding! 🚀**
