#!/bin/bash

# WebVado Demo Script
# Demonstrates the complete working system

echo "============================================"
echo "   WebVado Phase 1 Demo"
echo "============================================"
echo ""

cd "$(dirname "$0")/.."

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Start server in background
echo "🚀 Starting WebVado server..."
node backend/server.js > /tmp/webvado-demo.log 2>&1 &
SERVER_PID=$!

# Wait for server to start
sleep 3

# Check if server is running
if ! curl -s http://localhost:3000/api/health > /dev/null; then
    echo "❌ Server failed to start. Check /tmp/webvado-demo.log"
    exit 1
fi

echo "✅ Server running at http://localhost:3000"
echo "   PID: $SERVER_PID"
echo ""

# Create example project
echo "📁 Creating example LED Blinker project..."
RESPONSE=$(curl -s -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"demo_led_blinker","part":"ice40hx8k"}')

PROJECT_ID=$(echo $RESPONSE | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

if [ -z "$PROJECT_ID" ]; then
    echo "❌ Failed to create project"
    kill $SERVER_PID 2>/dev/null
    exit 1
fi

echo "✅ Project created: $PROJECT_ID"
echo ""

# Add Verilog source file
echo "📝 Adding blinker.v..."
curl -s -X POST "http://localhost:3000/api/files/demo_led_blinker/srcs/rtl/blinker.v" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "module blinker(\n    input clk,\n    input rst,\n    output reg led\n);\n\nreg [23:0] counter;\n\nalways @(posedge clk or posedge rst) begin\n    if (rst) begin\n        counter <= 0;\n        led <= 0;\n    end else begin\n        counter <= counter + 1;\n        if (counter == 24'\''hFFFFFF) begin\n            led <= ~led;\n            counter <= 0;\n        end\n    end\nend\n\nendmodule"
  }' > /dev/null 2>&1

echo "✅ blinker.v created"
echo ""

# Add testbench
echo "📝 Adding testbench..."
curl -s -X POST "http://localhost:3000/api/files/demo_led_blinker/srcs/sim/blinker_tb.v" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "`timescale 1ns / 1ps\n\nmodule blinker_tb;\n\nreg clk;\nreg rst;\nwire led;\n\nblinker uut (\n    .clk(clk),\n    .rst(rst),\n    .led(led)\n);\n\ninitial begin\n    clk = 0;\n    forever #5 clk = ~clk;\nend\n\ninitial begin\n    rst = 1;\n    #100 rst = 0;\n    #100000000;\n    $finish;\nend\n\nendmodule"
  }' > /dev/null 2>&1

echo "✅ blinker_tb.v created"
echo ""

# Show project structure
echo "📂 Project structure:"
tree -L 3 "projects/demo_led_blinker" 2>/dev/null || find "projects/demo_led_blinker" -print | sed -e 's;[^/]*/;|____;g;s;____|; |;g'
echo ""

# Show API endpoints
echo "============================================"
echo "   Available API Endpoints"
echo "============================================"
echo ""
echo "Health Check:"
echo "  GET http://localhost:3000/api/health"
echo ""
echo "Projects:"
echo "  GET  http://localhost:3000/api/projects"
echo "  POST http://localhost:3000/api/projects"
echo "  GET  http://localhost:3000/api/projects/:id"
echo "  PUT  http://localhost:3000/api/projects/:id"
echo "  DELETE http://localhost:3000/api/projects/:id"
echo ""
echo "Files:"
echo "  GET  http://localhost:3000/api/files/:projectId/*"
echo "  POST http://localhost:3000/api/files/:projectId/*"
echo "  PUT  http://localhost:3000/api/files/:projectId/*"
echo "  DELETE http://localhost:3000/api/files/:projectId/*"
echo ""

echo "============================================"
echo "   Next Steps"
echo "============================================"
echo ""
echo "1. Open http://localhost:3000 in your browser"
echo "2. Explore the Vivado-inspired UI"
echo "3. Check the Flow Navigator (left sidebar)"
echo "4. Try the Tcl Console (type 'help')"
echo ""
echo "Press Ctrl+C to stop the server"
echo "Server logs: tail -f /tmp/webvado-demo.log"
echo ""

# Keep running
trap "echo ''; echo '🛑 Stopping server...'; kill $SERVER_PID 2>/dev/null; exit 0" INT TERM

# Try to open browser
if command -v open > /dev/null 2>&1; then
    echo "🌐 Opening browser..."
    open http://localhost:3000 2>/dev/null
elif command -v xdg-open > /dev/null 2>&1; then
    echo "🌐 Opening browser..."
    xdg-open http://localhost:3000 2>/dev/null
fi

# Wait for Ctrl+C
wait $SERVER_PID 2>/dev/null
