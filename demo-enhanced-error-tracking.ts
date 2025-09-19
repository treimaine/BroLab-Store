#!/usr/bin/env ts-node

/**
 * Demonstration of Enhanced Error Tracking and Analytics
 *
 * This script demonstrates the new capabilities added to the ErrorBoundaryManagerImpl:
 * - Error trend analysis
 * - Error categorization and pattern detection
 * - Error resolution workflow and notifications
 * - Integration with PerformanceMonitor for comprehensive reporting
 */

import { ErrorType } from "./shared/constants/errors";
import {
  ErrorBoundaryManagerImpl,
  NetworkError,
  SystemError,
  ValidationError,
  createErrorContext,
} from "./shared/utils/error-handler";
import { PerformanceMonitorImpl } from "./shared/utils/system-manager";

async function demonstrateEnhancedErrorTracking() {
  console.log("🚀 Enhanced Error Tracking and Analytics Demo\n");

  // Initialize the enhanced error boundary manager
  const errorBoundaryManager = new ErrorBoundaryManagerImpl();
  const performanceMonitor = new PerformanceMonitorImpl();

  // Integrate with performance monitor for comprehensive reporting
  errorBoundaryManager.setPerformanceMonitor(performanceMonitor);

  console.log("1. 📊 Error Pattern Detection");
  console.log("   Creating recurring error patterns...\n");

  // Simulate recurring network errors
  const networkContext = createErrorContext("NetworkService", "api_call", {
    endpoint: "/api/users",
    method: "GET",
  });

  for (let i = 0; i < 6; i++) {
    errorBoundaryManager.captureError(new NetworkError("Connection timeout"), networkContext);
  }

  // Simulate validation errors
  const validationContext = createErrorContext("UserForm", "validate_input", {
    field: "email",
    value: "invalid-email",
  });

  for (let i = 0; i < 3; i++) {
    errorBoundaryManager.captureError(
      new ValidationError("Invalid email format"),
      validationContext
    );
  }

  // Get top errors with patterns
  const topErrors = await errorBoundaryManager.getTopErrors(5);
  console.log("   Top Error Patterns:");
  topErrors.forEach((error, index) => {
    console.log(`   ${index + 1}. ${error.error} (${error.count} occurrences)`);
    if (error.pattern) {
      console.log(`      Pattern: ${error.pattern.isRecurring ? "Recurring" : "Isolated"}`);
      console.log(`      Suggested Fix: ${error.pattern.suggestedFix}`);
    }
  });

  console.log("\n2. 📈 Error Statistics and Trends");

  const timeRange = {
    start: Date.now() - 60000, // Last minute
    end: Date.now(),
  };

  const stats = await errorBoundaryManager.getErrorStats(timeRange);
  console.log("   Error Statistics:");
  console.log(`   - Total Errors: ${stats.totalErrors}`);
  console.log(`   - Resolution Rate: ${stats.resolutionRate.toFixed(1)}%`);
  console.log(`   - Critical Errors: ${stats.criticalErrors}`);
  console.log(`   - Recent Errors: ${stats.recentErrors}`);

  console.log("\n   Errors by Type:");
  Object.entries(stats.errorsByType).forEach(([type, count]) => {
    console.log(`   - ${type}: ${count}`);
  });

  console.log("\n   Errors by Component:");
  Object.entries(stats.errorsByComponent).forEach(([component, count]) => {
    console.log(`   - ${component}: ${count}`);
  });

  const trends = await errorBoundaryManager.getErrorTrends(timeRange);
  console.log(`\n   Error Trends: ${trends.length} trend points detected`);

  console.log("\n3. 🔧 Enhanced Recovery Options");

  // Test enhanced recovery options for recurring errors
  const recurringError = new NetworkError("Frequent API timeout");
  const recoveryOptions = errorBoundaryManager.getErrorRecoveryOptions(recurringError);

  console.log("   Available Recovery Options:");
  recoveryOptions.forEach((option, index) => {
    console.log(`   ${index + 1}. ${option.label}: ${option.description}`);
    console.log(
      `      Destructive: ${option.isDestructive}, Requires Confirmation: ${option.requiresConfirmation}`
    );
  });

  console.log("\n4. 📊 Performance Integration");

  // Show performance metrics integration
  const metrics = await performanceMonitor.getMetrics();
  const errorMetrics = metrics.filter(m => m.name.includes("error"));

  console.log("   Error-related Performance Metrics:");
  errorMetrics.forEach(metric => {
    console.log(`   - ${metric.name}: ${metric.value} (${metric.unit})`);
    if (metric.tags) {
      const tags = Object.entries(metric.tags)
        .map(([key, value]) => `${key}=${value}`)
        .join(", ");
      console.log(`     Tags: ${tags}`);
    }
  });

  console.log("\n5. 🔔 Error Notification System");

  // Set up error trend notification
  let notificationCount = 0;
  errorBoundaryManager.onErrorTrend((error, trend) => {
    notificationCount++;
    console.log(`   📢 Error Trend Alert #${notificationCount}:`);
    console.log(`      Error: ${error.message}`);
    console.log(`      Component: ${trend.component}`);
    console.log(`      Error Count: ${trend.errorCount}`);
    console.log(`      Severity: ${trend.severity}`);
  });

  // Trigger trend notification by creating many errors
  console.log("   Generating high-frequency errors to trigger notifications...");
  const trendContext = createErrorContext("HighFrequencyService", "process_data");

  for (let i = 0; i < 12; i++) {
    errorBoundaryManager.captureError(
      new SystemError(ErrorType.SERVER_ERROR, "Database connection failed"),
      trendContext
    );
  }

  console.log("\n6. 🔄 Error Resolution Workflow");

  // Demonstrate error resolution tracking
  const errorHistory = await errorBoundaryManager.getErrorHistory(3);
  console.log("   Recent Errors (before resolution):");
  errorHistory.slice(0, 2).forEach((error, index) => {
    console.log(`   ${index + 1}. ${error.message} (${error.component})`);
    console.log(`      Status: ${error.resolved ? "Resolved" : "Unresolved"}`);
    console.log(`      Severity: ${error.severity}`);
  });

  // Resolve an error
  if (errorHistory.length > 0) {
    await errorBoundaryManager.markErrorResolved(
      errorHistory[0].id,
      "Applied database connection pooling fix"
    );
    console.log(`\n   ✅ Resolved error: ${errorHistory[0].message}`);
  }

  // Show updated resolution metrics
  const updatedStats = await errorBoundaryManager.getErrorStats(timeRange);
  console.log(`   Updated Resolution Rate: ${updatedStats.resolutionRate.toFixed(1)}%`);

  console.log("\n7. 🎯 Component-Specific Error Analysis");

  // Analyze errors by specific component
  const networkErrors = await errorBoundaryManager.getErrorsByComponent("NetworkService");
  console.log(`   NetworkService Errors: ${networkErrors.length}`);

  const userFormErrors = await errorBoundaryManager.getErrorsByComponent("UserForm");
  console.log(`   UserForm Errors: ${userFormErrors.length}`);

  console.log("\n✨ Enhanced Error Tracking Demo Complete!");
  console.log("\nKey Features Demonstrated:");
  console.log("✓ Error pattern detection and analysis");
  console.log("✓ Error categorization by type and component");
  console.log("✓ Trend analysis and statistics");
  console.log("✓ Enhanced recovery options with pattern-based suggestions");
  console.log("✓ Performance metrics integration");
  console.log("✓ Real-time error trend notifications");
  console.log("✓ Error resolution workflow and tracking");
  console.log("✓ Component-specific error analysis");
}

// Run the demonstration
if (require.main === module) {
  demonstrateEnhancedErrorTracking().catch(console.error);
}

export { demonstrateEnhancedErrorTracking };
