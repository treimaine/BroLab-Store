import { Router } from 'express';
import monitoring from '../lib/monitoring';
import { apiRateLimit } from '../middleware/rateLimiter';

const router = Router();

// Health check endpoint
router.get('/health', apiRateLimit, async (req, res) => {
  try {
    const healthChecks = await monitoring.performHealthCheck();
    const allHealthy = healthChecks.every(check => check.status === 'healthy');
    
    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? 'healthy' : 'degraded',
      checks: healthChecks,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// System metrics endpoint (admin only)
router.get('/metrics', apiRateLimit, async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Simple admin check - in production, use proper role-based access
    const user = req.user!;
    const isAdmin = user.email === 'admin@brolabentertainment.com' || user.username === 'admin';
    
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { metrics, healthChecks } = await monitoring.collectPerformanceMetrics();
    
    res.json({
      system: metrics,
      services: healthChecks,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to collect metrics',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Quick status endpoint (lightweight)
router.get('/status', async (req, res) => {
  try {
    const metrics = monitoring.getSystemMetrics();
    
    res.json({
      status: 'online',
      uptime: metrics.uptime,
      memory: {
        used: Math.round(metrics.memoryUsage.heapUsed / 1024 / 1024),
        total: Math.round(metrics.memoryUsage.rss / 1024 / 1024)
      },
      requestsPerMinute: metrics.requestsPerMinute,
      errorRate: Math.round(metrics.errorRate * 100) / 100,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Manual health check trigger (admin only)
router.post('/health/check', apiRateLimit, async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = req.user!;
    const isAdmin = user.email === 'admin@brolabentertainment.com' || user.username === 'admin';
    
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const healthChecks = await monitoring.performHealthCheck();
    
    await monitoring.logSystemEvent({
      type: 'info',
      service: 'monitoring',
      message: 'Manual health check triggered',
      details: {
        triggeredBy: user.username,
        results: healthChecks
      }
    });

    res.json({
      message: 'Health check completed',
      results: healthChecks,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Health check failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;