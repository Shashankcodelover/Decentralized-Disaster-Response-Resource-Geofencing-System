/**
 * Decentralized Disaster Response Platform: Atmospheric Plume Dispersion Engine — Industrial Readiness Level 11 (IR-11)
 * 
 * Computes Gaussian Plume pollutant dispersion modeling (Pasquill-Gifford stability classes A-F),
 * Briggs thermal plume rise buoyancy equations, NIOSH/OSHA IDLH chemical hazard thresholds,
 * dynamic multi-tiered toxic hazard boundary polygons, and safe upwind responder ingress routes.
 */

export type StabilityClass = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export interface PlumeSourceParams {
  sourceId: string;
  contaminantName: 'CHLORINE_GAS' | 'AMMONIA' | 'HYDROGEN_SULFIDE' | 'SULFUR_DIOXIDE' | 'WILDFIRE_PM25' | string;
  releaseRateGramsPerSec: number; // Q
  effectiveHeightMeters: number;  // H_s
  originCoordinates: [number, number]; // [lng, lat]
  windSpeedMps: number;           // u
  windBearingDegrees: number;     // Direction wind is BLOWING FROM (0 = North, 90 = East)
  stabilityClass: StabilityClass;
  stackGasTempCelsius?: number;   // For Briggs buoyancy plume rise
  ambientTempCelsius?: number;
  stackDiameterMeters?: number;
  stackExitVelocityMps?: number;
}

export interface PlumeContourPolygon {
  hazardLevel: 'LETHAL_RED' | 'DANGER_ORANGE' | 'CAUTION_YELLOW';
  thresholdMgM3: number;
  maxDownwindDistanceKm: number;
  maxCrosswindRadiusKm: number;
  boundaryPolygon: [number, number][]; // [lng, lat]
}

export interface PlumeSimulationResult {
  sourceId: string;
  contaminantName: string;
  timestamp: number;
  windVector: {
    speedMps: number;
    fromBearingDeg: number;
    toBearingDeg: number;
  };
  effectiveReleaseHeightMeters: number; // Including Briggs buoyancy rise
  stabilityClass: StabilityClass;
  contours: PlumeContourPolygon[];
  safeResponderIngressBearingDeg: number;
  crosswindFlankIngressBearingDeg: number;
  evacuationUrgency: 'IMMEDIATE_LIFE_THREAT' | 'HIGH_SHELTER_IN_PLACE' | 'MONITOR_PERIMETER';
}

// NIOSH IDLH / OSHA PEL toxic threshold lookup table (in mg/m^3)
const CHEMICAL_THRESHOLDS: Record<string, { lethalRed: number; dangerOrange: number; cautionYellow: number }> = {
  CHLORINE_GAS: { lethalRed: 29.0, dangerOrange: 8.7, cautionYellow: 1.5 },
  AMMONIA: { lethalRed: 210.0, dangerOrange: 70.0, cautionYellow: 17.5 },
  HYDROGEN_SULFIDE: { lethalRed: 140.0, dangerOrange: 42.0, cautionYellow: 7.0 },
  SULFUR_DIOXIDE: { lethalRed: 260.0, dangerOrange: 52.0, cautionYellow: 5.2 },
  WILDFIRE_PM25: { lethalRed: 0.5, dangerOrange: 0.15, cautionYellow: 0.05 },
};

export class AtmosphericPlumeEngine {
  /**
   * Calculates Briggs Plume Rise (delta H) in meters based on thermal buoyancy.
   */
  calculateBriggsPlumeRise(
    windSpeedMps: number,
    stackTempC: number = 20,
    ambientTempC: number = 20,
    stackDiameterM: number = 1.0,
    exitVelocityMps: number = 2.0
  ): number {
    const u = Math.max(1.0, windSpeedMps);
    const tsK = stackTempC + 273.15;
    const taK = ambientTempC + 273.15;

    if (tsK <= taK) {
      // Momentum dominated rise
      return parseFloat(((1.5 * exitVelocityMps * stackDiameterM) / u).toFixed(1));
    }

    // Buoyancy flux parameter F = g * v * d^2 * (Ts - Ta) / (4 * Ts)
    const g = 9.81;
    const F = (g * exitVelocityMps * Math.pow(stackDiameterM, 2) * (tsK - taK)) / (4 * tsK);
    const deltaH = F > 0 ? (21.425 * Math.pow(F, 0.75)) / u : 0;

    return parseFloat(Math.min(150, deltaH).toFixed(1));
  }

  /**
   * Evaluates Pasquill-Gifford dispersion coefficients sigma_y and sigma_z (in meters) for downwind distance x (in km).
   */
  private getDispersionCoefficients(xKm: number, stability: StabilityClass): { sigmaY: number; sigmaZ: number } {
    const x = Math.max(0.01, xKm);

    const params: Record<StabilityClass, { c: number; d: number; a: number; b: number }> = {
      A: { a: 213, b: 0.894, c: 440.8, d: 1.941 },
      B: { a: 156, b: 0.894, c: 106.6, d: 1.149 },
      C: { a: 104, b: 0.894, c: 61.0,  d: 0.911 },
      D: { a: 68,  b: 0.894, c: 33.2,  d: 0.725 },
      E: { a: 50.5,b: 0.894, c: 22.8,  d: 0.678 },
      F: { a: 34,  b: 0.894, c: 14.35, d: 0.740 },
    };

    const p = params[stability] || params.D;
    const sigmaY = p.a * Math.pow(x, p.b);
    const sigmaZ = Math.min(5000, p.c * Math.pow(x, p.d));

    return { sigmaY, sigmaZ };
  }

  /**
   * Calculates ground-level concentration C(x, y, 0) in mg/m^3.
   */
  calculateGroundConcentrationMgM3(
    xKm: number,
    yMeters: number,
    releaseRateGps: number,
    windSpeedMps: number,
    effectiveHeightM: number,
    stability: StabilityClass
  ): number {
    if (xKm <= 0) return 0;
    const u = Math.max(0.5, windSpeedMps);
    const { sigmaY, sigmaZ } = this.getDispersionCoefficients(xKm, stability);

    const qMg = releaseRateGps * 1000;
    const denom = Math.PI * u * sigmaY * sigmaZ;
    if (denom <= 0) return 0;

    const crosswindExp = Math.exp(-Math.pow(yMeters, 2) / (2 * Math.pow(sigmaY, 2)));
    const heightExp = Math.exp(-Math.pow(effectiveHeightM, 2) / (2 * Math.pow(sigmaZ, 2)));

    const conc = (qMg / denom) * crosswindExp * heightExp;
    return isNaN(conc) ? 0 : conc;
  }

  /**
   * Simulates plume dispersion and produces multi-tiered hazard polygons with NIOSH chemical thresholds.
   */
  simulatePlume(params: PlumeSourceParams): PlumeSimulationResult {
    const downwindBearing = (params.windBearingDegrees + 180) % 360;
    const safeIngressBearing = params.windBearingDegrees; // Direct upwind
    const crosswindFlankBearing = (params.windBearingDegrees + 90) % 360;

    const plumeRise = this.calculateBriggsPlumeRise(
      params.windSpeedMps,
      params.stackGasTempCelsius,
      params.ambientTempCelsius,
      params.stackDiameterMeters,
      params.stackExitVelocityMps
    );
    const totalEffHeight = params.effectiveHeightMeters + plumeRise;

    const thresholds = CHEMICAL_THRESHOLDS[params.contaminantName] || {
      lethalRed: 50.0,
      dangerOrange: 10.0,
      cautionYellow: 2.0,
    };

    const levels: ('LETHAL_RED' | 'DANGER_ORANGE' | 'CAUTION_YELLOW')[] = [
      'LETHAL_RED',
      'DANGER_ORANGE',
      'CAUTION_YELLOW',
    ];

    const contours: PlumeContourPolygon[] = [];
    const [originLng, originLat] = params.originCoordinates;

    levels.forEach(lvl => {
      const thresh =
        lvl === 'LETHAL_RED'
          ? thresholds.lethalRed
          : lvl === 'DANGER_ORANGE'
          ? thresholds.dangerOrange
          : thresholds.cautionYellow;

      // Find max downwind distance where centerline concentration >= threshold
      let maxDistKm = 0.1;
      for (let d = 0.1; d <= 25.0; d += 0.2) {
        const c = this.calculateGroundConcentrationMgM3(
          d,
          0,
          params.releaseRateGramsPerSec,
          params.windSpeedMps,
          totalEffHeight,
          params.stabilityClass
        );
        if (c >= thresh) {
          maxDistKm = d;
        }
      }

      // Max crosswind radius at 50% downwind distance
      const halfDist = maxDistKm * 0.5;
      const { sigmaY } = this.getDispersionCoefficients(halfDist, params.stabilityClass);
      const crosswindRadiusKm = Math.min(maxDistKm * 0.4, (2.15 * sigmaY) / 1000);

      // Generate polygon points oriented along downwind vector
      const rad = (downwindBearing * Math.PI) / 180;
      const perpRad = rad + Math.PI / 2;

      const cosR = Math.cos(rad);
      const sinR = Math.sin(rad);
      const cosP = Math.cos(perpRad);
      const sinP = Math.sin(perpRad);

      const kmToDegLat = 1 / 110.574;
      const kmToDegLng = 1 / (111.32 * Math.cos((originLat * Math.PI) / 180));

      const polygon: [number, number][] = [
        [originLng, originLat],
        [
          originLng + (maxDistKm * 0.25 * sinR + crosswindRadiusKm * 0.6 * sinP) * kmToDegLng,
          originLat + (maxDistKm * 0.25 * cosR + crosswindRadiusKm * 0.6 * cosP) * kmToDegLat,
        ],
        [
          originLng + (halfDist * sinR + crosswindRadiusKm * sinP) * kmToDegLng,
          originLat + (halfDist * cosR + crosswindRadiusKm * cosP) * kmToDegLat,
        ],
        [
          originLng + (maxDistKm * 0.75 * sinR + crosswindRadiusKm * 0.7 * sinP) * kmToDegLng,
          originLat + (maxDistKm * 0.75 * cosR + crosswindRadiusKm * 0.7 * cosP) * kmToDegLat,
        ],
        [
          originLng + (maxDistKm * sinR) * kmToDegLng,
          originLat + (maxDistKm * cosR) * kmToDegLat,
        ],
        [
          originLng + (maxDistKm * 0.75 * sinR - crosswindRadiusKm * 0.7 * sinP) * kmToDegLng,
          originLat + (maxDistKm * 0.75 * cosR - crosswindRadiusKm * 0.7 * cosP) * kmToDegLat,
        ],
        [
          originLng + (halfDist * sinR - crosswindRadiusKm * sinP) * kmToDegLng,
          originLat + (halfDist * cosR - crosswindRadiusKm * cosP) * kmToDegLat,
        ],
        [
          originLng + (maxDistKm * 0.25 * sinR - crosswindRadiusKm * 0.6 * sinP) * kmToDegLng,
          originLat + (maxDistKm * 0.25 * cosR - crosswindRadiusKm * 0.6 * cosP) * kmToDegLat,
        ],
        [originLng, originLat],
      ];


      contours.push({
        hazardLevel: lvl,
        thresholdMgM3: thresh,
        maxDownwindDistanceKm: parseFloat(maxDistKm.toFixed(2)),
        maxCrosswindRadiusKm: parseFloat(crosswindRadiusKm.toFixed(2)),
        boundaryPolygon: polygon,
      });
    });

    const maxLethal = contours[0]?.maxDownwindDistanceKm || 0;
    const urgency =
      maxLethal > 2.0
        ? 'IMMEDIATE_LIFE_THREAT'
        : maxLethal > 0.5
        ? 'HIGH_SHELTER_IN_PLACE'
        : 'MONITOR_PERIMETER';

    return {
      sourceId: params.sourceId,
      contaminantName: params.contaminantName,
      timestamp: Date.now(),
      windVector: {
        speedMps: params.windSpeedMps,
        fromBearingDeg: params.windBearingDegrees,
        toBearingDeg: downwindBearing,
      },
      effectiveReleaseHeightMeters: totalEffHeight,
      stabilityClass: params.stabilityClass,
      contours,
      safeResponderIngressBearingDeg: safeIngressBearing,
      crosswindFlankIngressBearingDeg: crosswindFlankBearing,
      evacuationUrgency: urgency,
    };
  }
}

export const atmosphericPlumeEngine = new AtmosphericPlumeEngine();
