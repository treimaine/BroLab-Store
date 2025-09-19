// Analytics Dashboard Component - Demonstrates the complete monitoring system

import React, { useEffect, useState } from "react";
import { AnalyticsDashboardData, TimeRange } from "../../../shared/types/analytics";
import "../../styles/analytics-dashboard.css";
import { useAnalytics } from "../hooks/useAnalytics";

interface AnalyticsDashboardProps {
  className?: string;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ className = "" }) => {
  const { getDashboardData, realTimeMetrics, isLoading, error, trackClick } = useAnalytics({
    autoTrackPageViews: true,
    autoTrackClicks: true,
    realTimeUpdates: true,
  });

  const [dashboardData, setDashboardData] = useState<AnalyticsDashboardData | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>({
    start: Date.now() - 24 * 60 * 60 * 1000, // Last 24 hours
    end: Date.now(),
  });

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const data = await getDashboardData(timeRange);
        setDashboardData(data);
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      }
    };

    loadDashboardData();
  }, [getDashboardData, timeRange]);

  const handleRefresh = async () => {
    await trackClick("refresh-dashboard");
    const data = await getDashboardData(timeRange);
    setDashboardData(data);
  };

  const handleTimeRangeChange = (range: "1h" | "24h" | "7d" | "30d") => {
    const now = Date.now();
    const ranges = {
      "1h": 60 * 60 * 1000,
      "24h": 24 * 60 * 60 * 1000,
      "7d": 7 * 24 * 60 * 60 * 1000,
      "30d": 30 * 24 * 60 * 60 * 1000,
    };

    setTimeRange({
      start: now - ranges[range],
      end: now,
    });
  };

  if (error) {
    return (
      <div className={`analytics-dashboard error ${className}`}>
        <div className="error-message">
          <h3>Analytics Error</h3>
          <p>Failed to load analytics data: {error.message}</p>
          <button onClick={handleRefresh} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`analytics-dashboard ${className}`}>
      <div className="dashboard-header">
        <h2>Analytics Dashboard</h2>
        <div className="dashboard-controls">
          <div className="time-range-selector">
            <button onClick={() => handleTimeRangeChange("1h")}>1H</button>
            <button onClick={() => handleTimeRangeChange("24h")}>24H</button>
            <button onClick={() => handleTimeRangeChange("7d")}>7D</button>
            <button onClick={() => handleTimeRangeChange("30d")}>30D</button>
          </div>
          <button onClick={handleRefresh} disabled={isLoading}>
            {isLoading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Real-time Metrics */}
      <div className="real-time-section">
        <h3>Real-time Metrics</h3>
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-value">{realTimeMetrics?.activeUsers || 0}</div>
            <div className="metric-label">Active Users</div>
          </div>
          <div className="metric-card">
            <div className="metric-value">{realTimeMetrics?.liveConversions || 0}</div>
            <div className="metric-label">Live Conversions</div>
          </div>
          <div className="metric-card">
            <div className="metric-value">
              {realTimeMetrics?.errorRate
                ? `${(realTimeMetrics.errorRate * 100).toFixed(1)}%`
                : "0%"}
            </div>
            <div className="metric-label">Error Rate</div>
          </div>
          <div className="metric-card">
            <div className="metric-value">
              {realTimeMetrics?.systemLoad ? `${realTimeMetrics.systemLoad.toFixed(1)}%` : "0%"}
            </div>
            <div className="metric-label">System Load</div>
          </div>
        </div>
      </div>

      {/* Overview Metrics */}
      {dashboardData && (
        <div className="overview-section">
          <h3>
            Overview ({new Date(timeRange.start).toLocaleDateString()} -{" "}
            {new Date(timeRange.end).toLocaleDateString()})
          </h3>
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-value">{dashboardData.overview.totalUsers}</div>
              <div className="metric-label">Total Users</div>
            </div>
            <div className="metric-card">
              <div className="metric-value">{dashboardData.overview.pageViews}</div>
              <div className="metric-label">Page Views</div>
            </div>
            <div className="metric-card">
              <div className="metric-value">
                {(dashboardData.overview.conversionRate * 100).toFixed(1)}%
              </div>
              <div className="metric-label">Conversion Rate</div>
            </div>
            <div className="metric-card">
              <div className="metric-value">
                {(dashboardData.overview.bounceRate * 100).toFixed(1)}%
              </div>
              <div className="metric-label">Bounce Rate</div>
            </div>
          </div>
        </div>
      )}

      {/* User Behavior */}
      {dashboardData && (
        <div className="behavior-section">
          <h3>User Behavior</h3>
          <div className="behavior-grid">
            <div className="behavior-card">
              <h4>Top Pages</h4>
              <ul>
                {dashboardData.userBehavior.topPages.slice(0, 5).map((page, index) => (
                  <li key={index}>
                    <span className="page-url">{page.page}</span>
                    <span className="page-views">{page.views} views</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="behavior-card">
              <h4>Top Actions</h4>
              <ul>
                {dashboardData.userBehavior.topActions.slice(0, 5).map((action, index) => (
                  <li key={index}>
                    <span className="action-name">{action.action}</span>
                    <span className="action-count">{action.count} times</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="behavior-card">
              <h4>Device Breakdown</h4>
              <ul>
                {Object.entries(dashboardData.userBehavior.deviceBreakdown).map(
                  ([device, count]) => (
                    <li key={device}>
                      <span className="device-type">{device}</span>
                      <span className="device-count">{count} users</span>
                    </li>
                  )
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Insights */}
      {dashboardData && dashboardData.insights.length > 0 && (
        <div className="insights-section">
          <h3>Insights & Recommendations</h3>
          <div className="insights-list">
            {dashboardData.insights.map(insight => (
              <div key={insight.id} className={`insight-card ${insight.impact}`}>
                <div className="insight-header">
                  <h4>{insight.title}</h4>
                  <span className="insight-impact">{insight.impact}</span>
                </div>
                <p className="insight-description">{insight.description}</p>
                <div className="insight-recommendations">
                  <h5>Recommendations:</h5>
                  <ul>
                    {insight.recommendations.map((rec, index) => (
                      <li key={index}>{rec}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {realTimeMetrics && realTimeMetrics.recentInteractions.length > 0 && (
        <div className="activity-section">
          <h3>Recent Activity</h3>
          <div className="activity-list">
            {realTimeMetrics.recentInteractions.slice(0, 10).map(interaction => (
              <div key={interaction.id} className="activity-item">
                <span className="activity-time">
                  {new Date(interaction.timestamp).toLocaleTimeString()}
                </span>
                <span className="activity-type">{interaction.type}</span>
                <span className="activity-component">{interaction.component}</span>
                <span className="activity-action">{interaction.action}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
