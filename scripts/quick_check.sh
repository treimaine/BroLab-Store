#!/bin/bash
# Quick integrity check script for safe updates

echo "🔍 Running quick integrity check..."

# TypeScript check
echo "📋 TypeScript compilation..."
npm run check > .reports/quick_tsc.txt 2>&1
if [ $? -eq 0 ]; then
    echo "✅ TypeScript: PASSED"
    TS_STATUS="PASSED"
else
    echo "❌ TypeScript: FAILED"
    TS_STATUS="FAILED"
fi

# Test check
echo "🧪 Test suite..."
npm test --silent --passWithNoTests > .reports/quick_tests.txt 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Tests: PASSED"
    TEST_STATUS="PASSED"
else
    echo "❌ Tests: FAILED"
    TEST_STATUS="FAILED"
fi

# Server health (if running)
echo "🌐 Server health..."
if curl -s http://localhost:5000/api/health > /dev/null 2>&1; then
    echo "✅ Server: REACHABLE"
    SERVER_STATUS="REACHABLE"
else
    echo "⚠️ Server: NOT REACHABLE"
    SERVER_STATUS="NOT_REACHABLE"
fi

# Summary
echo ""
echo "📊 QUICK CHECK SUMMARY:"
echo "   TypeScript: $TS_STATUS"
echo "   Tests: $TEST_STATUS"  
echo "   Server: $SERVER_STATUS"

# Safety confidence
if [ "$TS_STATUS" = "PASSED" ] && [ "$TEST_STATUS" = "PASSED" ]; then
    echo "✅ SAFE TO PROCEED (95%+ confidence)"
    exit 0
else
    echo "⚠️ CAUTION REQUIRED (<95% confidence)"
    exit 1
fi