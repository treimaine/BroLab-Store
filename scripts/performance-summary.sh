#!/bin/bash

# Performance Summary Script - BroLab Entertainment
# Quick performance overview and optimization status

echo "🚀 BroLab Entertainment - Performance Summary"
echo "=============================================="
echo "Date: $(date)"
echo ""

# Bundle size analysis
echo "📊 Bundle Analysis:"
if [ -f "dist/public/assets/index-*.js" ]; then
    BUNDLE_SIZE=$(ls -la dist/public/assets/index-*.js 2>/dev/null | awk '{print $5}' | head -1)
    if [ ! -z "$BUNDLE_SIZE" ]; then
        BUNDLE_KB=$((BUNDLE_SIZE / 1024))
        echo "   Main Bundle: ${BUNDLE_KB} KB"
        
        if [ $BUNDLE_KB -gt 500 ]; then
            echo "   Status: ⚠️  Over 500KB limit"
        else
            echo "   Status: ✅ Within limits"
        fi
    fi
else
    echo "   Status: 📦 Build required (run: npm run build)"
fi

# Code splitting check
ADVANCED_FILTERS=$(ls dist/public/assets/AdvancedBeatFilters-*.js 2>/dev/null | wc -l)
if [ $ADVANCED_FILTERS -gt 0 ]; then
    echo "   Code Splitting: ✅ Active (AdvancedBeatFilters separated)"
else
    echo "   Code Splitting: ❌ Not detected"
fi

echo ""

# Component optimization
echo "🧩 Component Optimization:"
LAZY_COMPONENTS=$(find client/src -name "LazyComponents.tsx" | wc -l)
LOADING_COMPONENTS=$(ls client/src/components/ | grep -E "(Loading|Skeleton)" | wc -l)
LAZY_USAGE=$(grep -r "LazyComponents" client/src --include="*.tsx" | wc -l)

echo "   Lazy Loading System: $([ $LAZY_COMPONENTS -gt 0 ] && echo "✅ Implemented" || echo "❌ Missing")"
echo "   Loading Components: ${LOADING_COMPONENTS} skeleton components"
echo "   Lazy Component Usage: ${LAZY_USAGE} implementations"

echo ""

# Performance monitoring
echo "📈 Performance Monitoring:"
PERF_MONITORING=$(find client/src -name "performanceMonitoring.ts" | wc -l)
PERF_UTILS=$(find client/src -name "performance.ts" | wc -l)
CLS_OPTIMIZATION=$(find client/src -name "clsOptimization.ts" | wc -l)

echo "   Web Vitals Monitoring: $([ $PERF_MONITORING -gt 0 ] && echo "✅ Active" || echo "❌ Missing")"
echo "   Performance Utils: $([ $PERF_UTILS -gt 0 ] && echo "✅ Implemented" || echo "❌ Missing")"
echo "   CLS Prevention: $([ $CLS_OPTIMIZATION -gt 0 ] && echo "✅ Implemented" || echo "❌ Missing")"

echo ""

# Overall status
echo "🎯 Overall Performance Status:"
TOTAL_OPTIMIZATIONS=$((LAZY_COMPONENTS + PERF_MONITORING + PERF_UTILS + CLS_OPTIMIZATION))

if [ $TOTAL_OPTIMIZATIONS -ge 4 ]; then
    echo "   Status: 🟢 EXCELLENT - All optimizations implemented"
elif [ $TOTAL_OPTIMIZATIONS -ge 2 ]; then
    echo "   Status: 🟡 GOOD - Most optimizations implemented"
else
    echo "   Status: 🔴 NEEDS WORK - More optimizations required"
fi

echo ""
echo "📋 Quick Commands:"
echo "   npm run build          # Build and analyze bundle"
echo "   node scripts/performance-report.js  # Detailed analysis"
echo "   npm run dev           # Start with performance monitoring"
echo ""
echo "For detailed report, see: PERFORMANCE_FINAL_REPORT.md"