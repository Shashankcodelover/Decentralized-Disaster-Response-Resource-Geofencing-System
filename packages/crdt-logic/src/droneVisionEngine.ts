/**
 * Edge AI Aerial Drone Computer Vision Ingestion Engine — Industrial Readiness Level 11 (IR-11)
 * 
 * Ingests and processes high-frequency bounding box telemetry from aerial UAVs
 * running onboard YOLO / thermal vision models for real-time disaster survivor discovery.
 * 
 * Includes multi-spectral thermal signature verification, hypothermia risk detection,
 * and spatial clustering against known ground RF beacons.
 */

export type VisionClass =
  | 'survivor_waving'
  | 'trapped_person'
  | 'structural_collapse'
  | 'wildfire_front'
  | 'flood_inundation';

export interface BoundingBoxDetection {
  detectionId: string;
  droneId: string;
  timestamp: number;
  aiClass: VisionClass;
  confidence: number; // 0.0 to 1.0
  thermalSignatureCelsius?: number;
  groundBounds: {
    minLng: number;
    minLat: number;
    maxLng: number;
    maxLat: number;
  };
  centroid: [number, number]; // [lng, lat]
}

export interface VisionCorrelationResult {
  detection: BoundingBoxDetection;
  actionTaken: 'MATCHED_EXISTING_BEACON' | 'NEW_SOS_TRIGGERED' | 'HAZARD_MAP_UPDATED' | 'LOW_CONFIDENCE_IGNORED';
  matchedBeaconId?: string;
  priorityScore: number;
  dispatchUrgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  thermalCorroboration: {
    isHumanBodyTempConfirmed: boolean;
    isHypothermiaRisk: boolean;
    calibratedConfidence: number;
  };
}

/**
 * Calculates approximate Euclidean distance between two [lng, lat] points in meters.
 */
function approxDistanceMeters(p1: [number, number], p2: [number, number]): number {
  const dLng = (p2[0] - p1[0]) * 111320 * Math.cos(p1[1] * Math.PI / 180);
  const dLat = (p2[1] - p1[1]) * 110540;
  return Math.sqrt(dLng * dLng + dLat * dLat);
}

/**
 * Evaluates an aerial computer vision detection against existing known beacon records.
 */
export function correlateVisionDetection(
  detection: BoundingBoxDetection,
  knownBeacons: { beaconId: string; coordinates: [number, number]; severity: string }[],
  confidenceThreshold: number = 0.65
): VisionCorrelationResult {
  // Thermal signature validation
  let isHumanTemp = false;
  let isHypothermia = false;
  let calibratedConf = detection.confidence;

  if (detection.thermalSignatureCelsius !== undefined) {
    if (detection.thermalSignatureCelsius >= 35.0 && detection.thermalSignatureCelsius <= 39.5) {
      isHumanTemp = true;
      calibratedConf = Math.min(1.0, detection.confidence + 0.12); // Boost confidence with thermal lock
    } else if (detection.thermalSignatureCelsius < 35.0 && detection.thermalSignatureCelsius > 28.0) {
      isHypothermia = true;
      calibratedConf = Math.min(1.0, detection.confidence + 0.08);
    }
  }

  // 1. Ignore low confidence noise
  if (calibratedConf < confidenceThreshold) {
    return {
      detection,
      actionTaken: 'LOW_CONFIDENCE_IGNORED',
      priorityScore: 0,
      dispatchUrgency: 'LOW',
      thermalCorroboration: { isHumanBodyTempConfirmed: isHumanTemp, isHypothermiaRisk: isHypothermia, calibratedConfidence: calibratedConf },
    };
  }

  // 2. Check if detection is a hazard zone perimeter
  if (detection.aiClass === 'wildfire_front' || detection.aiClass === 'flood_inundation' || detection.aiClass === 'structural_collapse') {
    return {
      detection,
      actionTaken: 'HAZARD_MAP_UPDATED',
      priorityScore: Math.round(calibratedConf * 85),
      dispatchUrgency: detection.aiClass === 'wildfire_front' ? 'CRITICAL' : 'HIGH',
      thermalCorroboration: { isHumanBodyTempConfirmed: isHumanTemp, isHypothermiaRisk: isHypothermia, calibratedConfidence: calibratedConf },
    };
  }

  // 3. Survivor / Trapped Person: Check correlation with existing beacons (within 40m radius)
  let closestBeacon: { beaconId: string; dist: number } | null = null;
  for (const b of knownBeacons) {
    const dist = approxDistanceMeters(detection.centroid, b.coordinates);
    if (dist <= 40.0) {
      if (!closestBeacon || dist < closestBeacon.dist) {
        closestBeacon = { beaconId: b.beaconId, dist };
      }
    }
  }

  if (closestBeacon) {
    // Matched existing beacon -> update visual confirmation
    return {
      detection,
      actionTaken: 'MATCHED_EXISTING_BEACON',
      matchedBeaconId: closestBeacon.beaconId,
      priorityScore: Math.round(calibratedConf * 95),
      dispatchUrgency: isHypothermia ? 'CRITICAL' : 'HIGH',
      thermalCorroboration: { isHumanBodyTempConfirmed: isHumanTemp, isHypothermiaRisk: isHypothermia, calibratedConfidence: calibratedConf },
    };
  }

  // 4. Untracked victim sighted -> Trigger new high-priority SOS alert
  return {
    detection,
    actionTaken: 'NEW_SOS_TRIGGERED',
    priorityScore: Math.round(calibratedConf * 100),
    dispatchUrgency: 'CRITICAL',
    thermalCorroboration: { isHumanBodyTempConfirmed: isHumanTemp, isHypothermiaRisk: isHypothermia, calibratedConfidence: calibratedConf },
  };
}
