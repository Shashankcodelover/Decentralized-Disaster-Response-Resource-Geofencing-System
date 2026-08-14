import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { calculateDepletionForecasts } from '../services/supplyPredictor';
import logger from '../logger';

export const forecastRouter = Router();

/**
 * GET /api/v1/forecast/depletion
 * Returns predictive supply stockout timelines and automated transfer recommendations.
 */
forecastRouter.get('/depletion', requireAuth, async (req, res) => {
  try {
    const weatherSeverity = parseFloat((req.query.weatherMultiplier as string) || '1.2');
    const summaries = await calculateDepletionForecasts(weatherSeverity);
    
    // Overall critical count
    const criticalHubs = summaries.filter(s => s.overallStatus === 'critical').length;
    const warningHubs = summaries.filter(s => s.overallStatus === 'warning').length;
    const totalRecommendedTransfers = summaries.reduce((acc, s) => acc + s.recommendedTransfersCount, 0);

    res.json({
      timestamp: new Date().toISOString(),
      weatherSeverityMultiplier: weatherSeverity,
      overallNetworkHealth: criticalHubs > 0 ? 'CRITICAL_DEPLETION' : warningHubs > 0 ? 'WARNING_STOCKOUT' : 'OPTIMAL',
      criticalHubsCount: criticalHubs,
      warningHubsCount: warningHubs,
      totalRecommendedTransfers,
      hubs: summaries,
    });
  } catch (err) {
    logger.error({ err }, 'Failed to get supply depletion forecast');
    res.status(500).json({ error: 'Supply forecast error' });
  }
});
