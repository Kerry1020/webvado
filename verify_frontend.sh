#!/bin/bash

echo "=== WebVado Frontend Verification ==="
echo ""

# Check if server is running
if ! pgrep -f "node backend/server.js" > /dev/null; then
    echo "❌ Server not running"
    echo "   Start with: node backend/server.js"
    exit 1
fi
echo "✅ Server is running"

# Test main page
if curl -sf http://localhost:3000/ | grep -q "id=\"app\""; then
    echo "✅ Main page loads"
else
    echo "❌ Main page failed"
    exit 1
fi

# Test all component files
components=(
    "Dialog.js"
    "WaveformViewer.js"
    "SourcesPanel.js"
    "dialogs/NewProjectDialog.js"
    "dialogs/SettingsDialog.js"
    "dialogs/AboutDialog.js"
)

for comp in "${components[@]}"; do
    if curl -sf "http://localhost:3000/js/components/$comp" > /dev/null; then
        echo "✅ Component: $comp"
    else
        echo "❌ Component failed: $comp"
        exit 1
    fi
done

# Test CodeEditor
if curl -sf "http://localhost:3000/js/editor/CodeEditor.js" > /dev/null; then
    echo "✅ CodeEditor"
else
    echo "❌ CodeEditor failed"
    exit 1
fi

# Test CSS files
css_files=(
    "components/dialog.css"
    "components/waveform.css"
)

for css in "${css_files[@]}"; do
    if curl -sf "http://localhost:3000/css/$css" > /dev/null; then
        echo "✅ CSS: $css"
    else
        echo "❌ CSS failed: $css"
        exit 1
    fi
done

# Test main.js imports
if curl -sf "http://localhost:3000/js/main.js" | grep -q "import { Dialog }"; then
    echo "✅ main.js updated with new imports"
else
    echo "❌ main.js missing imports"
    exit 1
fi

# Test index.html CSS links
if curl -sf "http://localhost:3000/" | grep -q "components/dialog.css"; then
    echo "✅ index.html includes dialog.css"
else
    echo "❌ index.html missing dialog.css"
    exit 1
fi

if curl -sf "http://localhost:3000/" | grep -q "components/waveform.css"; then
    echo "✅ index.html includes waveform.css"
else
    echo "❌ index.html missing waveform.css"
    exit 1
fi

# Test page loads
if curl -sf "http://localhost:3000/test.html" | grep -q "WebVado Component Test"; then
    echo "✅ Test page available"
else
    echo "❌ Test page failed"
    exit 1
fi

echo ""
echo "=== All Checks Passed! ==="
echo ""
echo "Available URLs:"
echo "  • Main app:  http://localhost:3000/"
echo "  • Test page: http://localhost:3000/test.html"
echo ""
echo "Components implemented:"
echo "  • Dialog system (modal, confirm, prompt, alert)"
echo "  • NewProjectDialog, SettingsDialog, AboutDialog"
echo "  • WaveformViewer (canvas-based)"
echo "  • CodeEditor (with line numbers & errors)"
echo "  • SourcesPanel (file tree with drag-drop)"
echo ""
