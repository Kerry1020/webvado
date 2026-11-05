#!/bin/bash
# WebVado 100% Completion Test Script

echo "🚀 WebVado 100% Completion Test"
echo "================================"
echo ""

BASE_URL="http://localhost:3000"
PASS=0
FAIL=0

# Helper function
test_endpoint() {
  local name="$1"
  local url="$2"
  local expected="$3"
  
  echo -n "Testing $name... "
  
  response=$(curl -s "$BASE_URL$url")
  
  if echo "$response" | grep -q "$expected"; then
    echo "✅ PASS"
    PASS=$((PASS + 1))
  else
    echo "❌ FAIL"
    echo "  Expected: $expected"
    echo "  Got: $response"
    FAIL=$((FAIL + 1))
  fi
}

# Test 1: Server Health
test_endpoint "Server Health" "/api/health" '"status":"ok"'

# Test 2: HTML loads
test_endpoint "HTML Page" "/" "WebVado"

# Test 3: Language Switcher Present
test_endpoint "Language Switcher" "/" "toggle-language"

# Test 4: Icons.js exists
echo -n "Testing Icons.js file... "
if curl -s "$BASE_URL/js/ui/icons.js" | grep -q "export const Icons"; then
  echo "✅ PASS"
  PASS=$((PASS + 1))
else
  echo "❌ FAIL"
  FAIL=$((FAIL + 1))
fi

# Test 5: Main.js includes i18n
echo -n "Testing i18n import... "
if curl -s "$BASE_URL/js/main.js" | grep -q "from './i18n/index.js'"; then
  echo "✅ PASS"
  PASS=$((PASS + 1))
else
  echo "❌ FAIL"
  FAIL=$((FAIL + 1))
fi

# Test 6: All SVG icons present
echo -n "Testing SVG icons count... "
icon_count=$(curl -s "$BASE_URL/js/ui/icons.js" | grep -c "svg")
if [ "$icon_count" -gt 25 ]; then
  echo "✅ PASS ($icon_count icons)"
  PASS=$((PASS + 1))
else
  echo "❌ FAIL (only $icon_count icons)"
  FAIL=$((FAIL + 1))
fi

# Test 7: CSS loads
test_endpoint "Main CSS" "/css/main.css" "color"

# Test 8: Welcome screen present
test_endpoint "Welcome Screen" "/" "Welcome to WebVado"

# Test 9: Flow Navigator present
test_endpoint "Flow Navigator" "/" "Flow Navigator"

# Test 10: Console present
test_endpoint "Console" "/" "Tcl Console"

echo ""
echo "================================"
echo "Results: $PASS passed, $FAIL failed"
echo ""

if [ $FAIL -eq 0 ]; then
  echo "🎉 All tests passed!"
  exit 0
else
  echo "❌ Some tests failed"
  exit 1
fi
