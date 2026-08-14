/**
 * Edge AI Aerial Drone Computer Vision Ingestion Engine
 * 
 * Ingests and processes high-frequency bounding box telemetry from aerial UAVs
 * running onboard YOLO / thermal vision models for real-time disaster survivor discovery.
 * 
 * Supported AI Classes:
 * - survivor_waving: Person actively signalling for rescue
 * - trapped_person: Person under rubble / on rooftop
 * - structural_collapse: Building debris blocking roads / trapping civilians
 * - wildfire_front: Active fire perimeter
 * - flood_inundation: Rising flood water level
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
  // 1. Ignore low confidence noise
  if (detection.confidence < confidenceThreshold) {
    return {
      detection,
      actionTaken: 'LOW_CONFIDENCE_IGNORED',
      priorityScore: 0,
      dispatchUrgency: 'LOW',
    };
  }

  // 2. Check if detection is a hazard zone perimeter
  if (detection.aiClass === 'wildfire_front' || detection.aiClass === 'flood_inundation' || detection.aiClass === 'structural_collapse') {
    return {
      detection,
      actionTaken: 'HAZARD_MAP_UPDATED',
      priorityScore: Math.round(detection.confidence * 85),
      dispatchUrgency: detection.aiClass === 'wildfire_front' ? 'CRITICAL' : 'HIGH',
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
      priorityScore: Math.round(detection.confidence * 95),
      dispatchUrgency: 'HIGH',
    };
  }

  // 4. Untracked victim discovered -> Trigger new SOS
  const hasThermalDistress = (detection.thermalSignatureCelsius ?? 37) > 38.5 || (detection.thermalSignatureCelsius ?? 37) < 35.0;
  const isTrapped = detection.aiClass === 'trapped_person';
  const urgency = isTrapped || hasThermalDistress ? 'CRITICAL' : 'HIGH';
  const priority = isTrapped ? 98 : 88;

  return {
    detection,
    actionTaken: 'NEW_SOS_TRIGGERED',
    priorityScore: priority,
    dispatchUrgency: urgency,
  };
}
