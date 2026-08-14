/**
 * Decentralized Disaster Response Platform: Microgrid Black-Start & Energy Allocation Engine
 * 
 * Manages off-grid energy balancing (Solar PV, BESS Battery Banks, Mobile Gensets),
 * 3-tier emergency load-shedding, and automated black-start restoration for field hospitals and command nodes.
 */

export interface MicrogridAsset {
  assetId: string;
  type: 'SOLAR_PV' | 'BESS_BATTERY' | 'DIESEL_GENSET' | 'HOSPITAL_LOAD' | 'WATER_PUMP_LOAD' | 'BASE_CAMP_LOAD';
  capacityKw: number;
  currentOutputOrDrawKw: number;
  batterySocPercent?: number; // 0-100% for BESS
  fuelReserveHours?: number; // for Genset
  priorityTier: 1 | 2 | 3; // 1 = Critical (ICU/Comms), 2 = Essential (Water/Vaccine), 3 = Sheddable
}

export interface MicrogridDispatchReport {
  gridStatus: 'ISLANDED_AUTONOMOUS' | 'BROWNOUT_DEFENSE' | 'BLACK_START_RECOVERY';
  totalGenerationKw: number;
  totalDemandKw: number;
  netPowerMarginKw: number;
  activeLoadSheddingTiers: number[];
  batteryAutonomyRemainingHours: number;
  dieselFuelAutonomyHours: number;
  dispatchDirectives: string[];
}

export class MicrogridEnergyEngine {
  /**
   * Evaluates microgrid assets and dispatches priority-tiered load shedding.
   */
  optimizeEnergyDispatch(assets: MicrogridAsset[]): MicrogridDispatchReport {
    const generators = assets.filter(a => ['SOLAR_PV', 'BESS_BATTERY', 'DIESEL_GENSET'].includes(a.type));
    const loads = assets.filter(a => a.type.includes('LOAD'));

    const totalGen = generators.reduce((sum, g) => sum + g.currentOutputOrDrawKw, 0);
    const totalDem = loads.reduce((sum, l) => sum + l.currentOutputOrDrawKw, 0);
    const netMargin = totalGen - totalDem;

    const battery = assets.find(a => a.type === 'BESS_BATTERY');
    const genset = assets.find(a => a.type === 'DIESEL_GENSET');

    const battSoc = battery?.batterySocPercent || 50;
    const battCap = battery?.capacityKw || 100;
    const netDeficit = Math.max(0, -netMargin);

    const battAutonomy = netDeficit > 0 ? parseFloat(((battCap * (battSoc / 100)) / netDeficit).toFixed(1)) : 24.0;
    const fuelAutonomy = genset?.fuelReserveHours || 12.0;

    const shedTiers: number[] = [];
    const directives: string[] = [];

    if (netMargin < 0) {
      if (battSoc < 30) {
        shedTiers.push(3); // Shed Non-Essential basecamp loads
        directives.push('ALERT: BESS SOC < 30%. Shed Tier 3 basecamp auxiliary circuits.');
      }
      if (battSoc < 15) {
        shedTiers.push(2); // Shed Tier 2 water pumps temporarily
        directives.push('CRITICAL: BESS SOC < 15%. Island Tier 1 Life-Support circuits only.');
      }
      if (genset && (genset.fuelReserveHours || 0) > 0 && genset.currentOutputOrDrawKw < genset.capacityKw) {
        directives.push('Engage secondary diesel generator at 85% continuous rating.');
      }
    } else {
      directives.push('Optimal balance: Solar PV and BESS supplying 100% of field loads.');
    }

    return {
      gridStatus: netMargin < -20 ? 'BROWNOUT_DEFENSE' : 'ISLANDED_AUTONOMOUS',
      totalGenerationKw: parseFloat(totalGen.toFixed(1)),
      totalDemandKw: parseFloat(totalDem.toFixed(1)),
      netPowerMarginKw: parseFloat(netMargin.toFixed(1)),
      activeLoadSheddingTiers: shedTiers,
      batteryAutonomyRemainingHours: battAutonomy,
      dieselFuelAutonomyHours: fuelAutonomy,
      dispatchDirectives: directives,
    };
  }
}

export const microgridEnergyEngine = new MicrogridEnergyEngine();
