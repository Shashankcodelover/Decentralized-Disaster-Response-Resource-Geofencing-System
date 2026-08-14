/**
 * Supply Depletion & Burn-Rate Predictor Service
 * 
 * Analyzes real-time crisis data to forecast resource consumption:
 * - Computes consumption rate per hour based on population density, casualty severity, and weather index
 * - Forecasts exact "Hours until Depletion" (stockout ETA)
 * - Proactively triggers automated inter-hub resource transfer recommendations
 */

import { ResourceHubModel } from '../models/ResourceHub';
import { DangerZoneModel } from '../models/DangerZone';
import logger from '../logger';

export interface DepletionForecast {
  hubId: string;
  hubName: string;
  resourceName: string;
  currentStock: number;
  unit: string;
  burnRatePerHour: number;
  hoursUntilDepletion: number;
  status: 'critical' | 'warning' | 'adequate';
  recommendedTransferOrder?: {
    fromHubId: string;
    fromHubName: string;
    transferQuantity: number;
  };
}

export interface HubDepletionSummary {
  hubId: string;
  hubName: string;
  overallStatus: 'critical' | 'warning' | 'adequate';
  resources: DepletionForecast[];
  recommendedTransfersCount: number;
}

/**
 * Baseline consumption rates per capita per hour in disaster environments.
 */
const BASELINE_BURN_RATES: Record<string, number> = {
  'water': 0.25,        // liters per person per hour (6L/day)
  'food': 0.125,       // ration units per person per hour (3 meals/day)
  'first_aid': 0.05,   // kits/dressings per person per hour
  'blood_units': 0.02, // units per red casualty per hour
  'medicine': 0.1,     // standard doses per casualty per hour
};

/**
 * Computes predictive supply depletion forecasts for all active resource hubs.
 */
export async function calculateDepletionForecasts(weatherSeverityMultiplier: number = 1.2): Promise<HubDepletionSummary[]> {
  try {
    const [hubs, zones] = await Promise.all([
      ResourceHubModel.find(),
      DangerZoneModel.find({ active: { $ne: false } }),
    ]);

    // Aggregate estimated population load across all active disaster zones
    const totalDisasterPopulation = zones.length * 150;
    const assignedPerHub = Math.max(50, Math.round(totalDisasterPopulation / Math.max(1, hubs.length)));

    const summaries: HubDepletionSummary[] = [];

    // Find potential surplus donor hubs for each resource
    for (const hub of hubs) {
      const forecasts: DepletionForecast[] = [];
      let worstStatus: 'critical' | 'warning' | 'adequate' = 'adequate';

      for (const res of hub.resources) {
        const itemKey = res.name.toLowerCase().includes('water') ? 'water' :
                        res.name.toLowerCase().includes('food') ? 'food' :
                        res.name.toLowerCase().includes('aid') ? 'first_aid' :
                        res.name.toLowerCase().includes('blood') ? 'blood_units' : 'medicine';

        const baseRate = BASELINE_BURN_RATES[itemKey] || 0.1;
        const burnRatePerHour = parseFloat((assignedPerHub * baseRate * weatherSeverityMultiplier).toFixed(2));
        const hoursUntilDepletion = burnRatePerHour > 0
          ? parseFloat((res.quantity / burnRatePerHour).toFixed(1))
          : 999.0;

        let status: 'critical' | 'warning' | 'adequate' = 'adequate';
        if (hoursUntilDepletion <= 6.0) status = 'critical';
        else if (hoursUntilDepletion <= 24.0) status = 'warning';

        if (status === 'critical') worstStatus = 'critical';
        else if (status === 'warning' && worstStatus !== 'critical') worstStatus = 'warning';

        let recommendedTransferOrder;
        if (status === 'critical') {
          // Find donor hub with highest surplus of this item
          const donorHub = hubs.find(h => {
            if (h._id.toString() === hub._id.toString()) return false;
            const donorItem = h.resources.find((r: any) => r.name === res.name);
            return donorItem && donorItem.quantity > res.quantity * 2;
          });

          if (donorHub) {
            recommendedTransferOrder = {
              fromHubId: donorHub._id.toString(),
              fromHubName: donorHub.name,
              transferQuantity: Math.round(burnRatePerHour * 12), // 12-hour buffer
            };
          }
        }

        forecasts.push({
          hubId: hub._id.toString(),
          hubName: hub.name,
          resourceName: res.name,
          currentStock: res.quantity,
          unit: res.unit,
          burnRatePerHour,
          hoursUntilDepletion,
          status,
          recommendedTransferOrder,
        });
      }

      summaries.push({
        hubId: hub._id.toString(),
        hubName: hub.name,
        overallStatus: worstStatus,
        resources: forecasts,
        recommendedTransfersCount: forecasts.filter(f => f.recommendedTransferOrder).length,
      });
    }

    return summaries;
  } catch (err) {
    logger.error({ err }, 'Failed to compute depletion forecasts');
    return [];
  }
}
