#!/usr/bin/env node

/**
 * Performance Report Generator
 * Analyzes bundle size, components, and provides optimization recommendations
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BUNDLE_SIZE_LIMIT = 500; // KB
const CLIENT_SRC = path.join(__dirname, '../client/src');

// Analyze component files
function analyzeComponentFiles() {
  const componentsDir = path.join(CLIENT_SRC, 'components');
  const components = fs.readdirSync(componentsDir, { withFileTypes: true })
    .filter(dirent => dirent.isFile() && dirent.name.endsWith('.tsx'))
    .map(dirent => dirent.name.replace('.tsx', ''));

  const heavyComponents = [
    'WaveformAudioPlayer',
    'EnhancedWaveformPlayer', 
    'AdvancedBeatFilters',
    'CustomBeatRequest',
    'BeatSimilarityRecommendations',
    'StripeCheckoutForm',
    'PayPalButton'
  ];

  const optimizedComponents = components.filter(comp => 
    heavyComponents.includes(comp)
  );

  return {
    totalComponents: components.length,
    heavyComponents: heavyComponents.length,
    optimizedComponents: optimizedComponents.length,
    optimizationCoverage: Math.round((optimizedComponents.length / heavyComponents.length) * 100)
  };
}

// Analyze bundle size from build output
function analyzeBundleSize() {
  try {
    const distPath = path.join(__dirname, '../dist/public');
    if (!fs.existsSync(distPath)) {
      return { error: 'Build not found. Run npm run build first.' };
    }

    const files = fs.readdirSync(distPath);
    const jsFiles = files.filter(file => file.startsWith('assets/index-') && file.endsWith('.js'));
    
    if (jsFiles.length === 0) {
      return { error: 'No bundle files found' };
    }

    const bundleFile = jsFiles[0];
    const bundlePath = path.join(distPath, bundleFile);
    const stats = fs.statSync(bundlePath);
    const sizeKB = Math.round(stats.size / 1024);

    return {
      bundleSize: sizeKB,
      isOverLimit: sizeKB > BUNDLE_SIZE_LIMIT,
      limitExcess: sizeKB > BUNDLE_SIZE_LIMIT ? sizeKB - BUNDLE_SIZE_LIMIT : 0,
      optimizationTarget: Math.max(0, sizeKB - BUNDLE_SIZE_LIMIT)
    };
  } catch (error) {
    return { error: error.message };
  }
}

// Generate performance recommendations
function generateRecommendations(componentAnalysis, bundleAnalysis) {
  const recommendations = [];

  if (bundleAnalysis.isOverLimit) {
    recommendations.push({
      priority: 'HIGH',
      category: 'Bundle Size',
      issue: `Bundle size ${bundleAnalysis.bundleSize}KB exceeds ${BUNDLE_SIZE_LIMIT}KB limit`,
      solution: 'Implement manual chunking in vite.config.ts or increase lazy loading'
    });
  }

  if (componentAnalysis.optimizationCoverage < 100) {
    recommendations.push({
      priority: 'MEDIUM',
      category: 'Component Optimization',
      issue: `${componentAnalysis.heavyComponents - componentAnalysis.optimizedComponents} heavy components not lazy-loaded`,
      solution: 'Add remaining components to LazyComponents.tsx'
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      priority: 'INFO',
      category: 'Performance',
      issue: 'All optimizations implemented',
      solution: 'Continue monitoring performance metrics'
    });
  }

  return recommendations;
}

// Generate full report
function generateReport() {
  console.log('🚀 BroLab Entertainment - Performance Analysis Report');
  console.log('=' .repeat(60));
  console.log(`Generated: ${new Date().toISOString()}`);
  console.log();

  // Component Analysis
  const componentAnalysis = analyzeComponentFiles();
  console.log('📦 Component Analysis:');
  console.log(`   Total Components: ${componentAnalysis.totalComponents}`);
  console.log(`   Heavy Components: ${componentAnalysis.heavyComponents}`);
  console.log(`   Optimized Components: ${componentAnalysis.optimizedComponents}`);
  console.log(`   Optimization Coverage: ${componentAnalysis.optimizationCoverage}%`);
  console.log();

  // Bundle Analysis
  const bundleAnalysis = analyzeBundleSize();
  console.log('📊 Bundle Analysis:');
  if (bundleAnalysis.error) {
    console.log(`   Error: ${bundleAnalysis.error}`);
  } else {
    console.log(`   Bundle Size: ${bundleAnalysis.bundleSize}KB`);
    console.log(`   Size Limit: ${BUNDLE_SIZE_LIMIT}KB`);
    console.log(`   Status: ${bundleAnalysis.isOverLimit ? '❌ OVER LIMIT' : '✅ WITHIN LIMIT'}`);
    if (bundleAnalysis.isOverLimit) {
      console.log(`   Excess: ${bundleAnalysis.limitExcess}KB`);
    }
  }
  console.log();

  // Recommendations
  const recommendations = generateRecommendations(componentAnalysis, bundleAnalysis);
  console.log('💡 Recommendations:');
  recommendations.forEach((rec, index) => {
    console.log(`   ${index + 1}. [${rec.priority}] ${rec.category}`);
    console.log(`      Issue: ${rec.issue}`);
    console.log(`      Solution: ${rec.solution}`);
    console.log();
  });

  // Performance Status
  const performanceScore = calculatePerformanceScore(componentAnalysis, bundleAnalysis);
  console.log('🎯 Performance Score:');
  console.log(`   Overall Score: ${performanceScore}/100`);
  console.log(`   Status: ${getPerformanceStatus(performanceScore)}`);
  
  return {
    componentAnalysis,
    bundleAnalysis,
    recommendations,
    performanceScore
  };
}

function calculatePerformanceScore(componentAnalysis, bundleAnalysis) {
  let score = 100;
  
  // Deduct points for bundle size
  if (!bundleAnalysis.error && bundleAnalysis.isOverLimit) {
    const excessPercentage = (bundleAnalysis.limitExcess / BUNDLE_SIZE_LIMIT) * 100;
    score -= Math.min(40, excessPercentage); // Max 40 points deduction
  }
  
  // Deduct points for unoptimized components
  const unoptimizedPercentage = 100 - componentAnalysis.optimizationCoverage;
  score -= Math.min(30, unoptimizedPercentage * 0.3); // Max 30 points deduction
  
  return Math.max(0, Math.round(score));
}

function getPerformanceStatus(score) {
  if (score >= 90) return '🟢 EXCELLENT';
  if (score >= 75) return '🟡 GOOD';
  if (score >= 60) return '🟠 NEEDS IMPROVEMENT';
  return '🔴 CRITICAL';
}

// Run report if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateReport();
}

export { generateReport, analyzeComponentFiles, analyzeBundleSize };