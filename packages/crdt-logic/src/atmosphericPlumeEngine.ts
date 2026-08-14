/**
 * Decentralized Disaster Response Platform: Atmospheric Plume Dispersion Engine
 * 
 * Computes Gaussian Plume pollutant dispersion modeling (Pasquill-Gifford stability classes A-F),
 * dynamic multi-tiered toxic hazard boundary polygons, and safe upwind responder ingress routes.
 */

export type StabilityClass = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export interface PlumeSourceParams {
  sourceId: string;
  contaminantName: string; // e.g. 'CHLORINE_GAS' | 'AMMONIA' | 'WILDFIRE_PM25'
  releaseRateGramsPerSec: number; // Q
  effectiveHeightMeters: number; // H
  originCoordinates: [number, number]; // [lng, lat]
  windSpeedMps: number; // u
  windBearingDegrees: number; // Direction wind is BLOWING FROM (0 = North, 90 = East)
  stabilityClass: StabilityClass;
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
  stabilityClass: StabilityClass;
  contours: PlumeContourPolygon[];
  safeResponderIngressBearingDeg: number;
  evacuationUrgency: 'IMMEDIATE_LIFE_THREAT' | 'HIGH_SHELTER_IN_PLACE' | 'MONITOR_PERIMETER';
}

export class AtmosphericPlumeEngine {
  /**
   * Evaluates Pasquill-Gifford dispersion coefficients sigma_y and sigma_z (in meters) for downwind distance x (in km).
   */
  private getDispersionCoefficients(xKm: number, stability: StabilityClass): { sigmaY: number; sigmaZ: number } {
    const x = Math.max(0.01, xKm);

    // Standard EPA/Pasquill dispersion parameters
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
   * Calculates ground-level concentration C(x, y, 0) in mg/m^3 at downwind x (km) and crosswind y (meters).
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

    // Gaussian Plume ground level equation (z=0)
    // C = (Q / (pi * u * sigmaY * sigmaZ)) * exp(-y^2 / (2*sigmaY^2)) * exp(-H^2 / (2*sigmaZ^2))
    const qMg = releaseRateGps * 1000; // Convert g/s to mg/s
    const denom = Math.PI * u * sigmaY * sigmaZ;
    if (denom <= 0) return 0;

    const crosswindExp = Math.exp(-Math.pow(yMeters, 2) / (2 * Math.pow(sigmaY, 2)));
    const heightExp = Math.exp(-Math.pow(effectiveHeightM, 2) / (2 * Math.pow(sigmaZ, 2)));

    const conc = (qMg / denom) * crosswindExp * heightExp;
    return isNaN(conc) ? 0 : conc;
  }

  /**
   * Simulates plume dispersion and produces multi-tiered hazard polygons.
   */
  simulatePlume(params: PlumeSourceParams): PlumeSimulationResult {
    const downwindBearing = (params.windBearingDegrees + 180) % 360;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const toDeg = (rad: number) => (rad * 180) / Math.PI;

    // Define 3 standard hazardous concentration thresholds in mg/m^3
    const tierDefs: { level: 'LETHAL_RED' | 'DANGER_ORANGE' | 'CAUTION_YELLOW'; threshold: number }[] = [
      { level: 'LETHAL_RED', threshold: 50.0 },
      { level: 'DANGER_ORANGE', threshold: 10.0 },
      { level: 'CAUTION_YELLOW', threshold: 1.0 },
    ];

    const [originLng, originLat] = params.originCoordinates;
    const contours: PlumeContourPolygon[] = [];

    for (const tier of tierDefs) {
      // Find max downwind distance where centerline conc meets threshold
      let maxDistKm = 0.1;
      while (maxDistKm < 25.0) {
        const c = this.calculateGroundConcentrationMgM3(
          maxDistKm,
          0,
          params.releaseRateGramsPerSec,
          params.windSpeedMps,
          params.effectiveHeightMeters,
          params.stabilityClass
        );
        if (c < tier.threshold) break;
        maxDistKm += 0.25;
      }

      // Estimate max crosswind spread at midpoint
      const midDistKm = maxDistKm * 0.5;
      const { sigmaY } = this.getDispersionCoefficients(midDistKm, params.stabilityClass);
      const maxCrosswindKm = (sigmaY * 2.15) / 1000; // ~90% plume envelope

      // Construct teardrop polygon oriented along downwind direction
      const polygon: [number, number][] = [];
      const steps = 12;

      // Forward downwind tip
      const downwindAngleRad = toRad(downwindBearing);
      const crossAngleRad = toRad((downwindBearing + 90) % 360);

      // Origin
      polygon.push([originLng, originLat]);

      // Right lobe
      for (let s = 1; s <= steps; s++) {
        const fraction = s / steps;
        const dFwd = maxDistKm * fraction;
        const dCross = maxCrosswindKm * Math.sin(fraction * Math.PI);

        const dLat = (dFwd * Math.cos(downwindAngleRad) + dCross * Math.cos(crossAngleRad)) / 111.32;
        const dLng = (dFwd * Math.sin(downwindAngleRad) + dCross * Math.sin(crossAngleRad)) / (111.32 * Math.cos(toRad(originLat)));
        polygon.push([originLng + dLng, originLat + dLat]);
      }

      // Left lobe (mirror)
      for (let s = steps; s >= 1; s--) {
        const fraction = s / steps;
        const dFwd = maxDistKm * fraction;
        const dCross = -maxCrosswindKm * Math.sin(fraction * Math.PI);

        const dLat = (dFwd * Math.cos(downwindAngleRad) + dCross * Math.cos(crossAngleRad)) / 111.32;
        const dLng = (dFwd * Math.sin(downwindAngleRad) + dCross * Math.sin(crossAngleRad)) / (111.32 * Math.cos(toRad(originLat)));
        polygon.push([originLng + dLng, originLat + dLat]);
      }

      // Close polygon
      polygon.push([originLng, originLat]);

      contours.push({
        hazardLevel: tier.level,
        thresholdMgM3: tier.threshold,
        maxDownwindDistanceKm: parseFloat(maxDistKm.toFixed(2)),
        maxCrosswindRadiusKm: parseFloat(maxCrosswindKm.toFixed(2)),
        boundaryPolygon: polygon,
      });
    }

    // Ingress bearing: approach from upwind (windBearingDegrees) to stay clean of plume
    const safeIngressBearing = params.windBearingDegrees;

    const urgency =
      contours[0].maxDownwindDistanceKm > 2.0
        ? 'IMMEDIATE_LIFE_THREAT'
        : contours[1].maxDownwindDistanceKm > 1.0
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
      stabilityClass: params.stabilityClass,
      contours,
      safeResponderIngressBearingDeg: safeIngressBearing,
      evacuationUrgency: urgency,
    };
  }
}

export const atmosphericPlumeEngine = new AtmosphericPlumeEngine();
