// Emergency Victim Beacon Protocol & Priority Scoring Engine

export type DistressSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface EmergencyBeacon {
  beaconId: string;
  timestamp: number;
  blurredLat: number;
  blurredLng: number;
  distressSeverity: DistressSeverity;
  batteryLevelPercent: number;
  payload: string;
}

export function computePriorityScore(beacon: EmergencyBeacon): number {
  let score = 0;
  
  // Severity weights
  if (beacon.distressSeverity === 'CRITICAL') score += 100;
  else if (beacon.distressSeverity === 'HIGH') score += 75;
  else if (beacon.distressSeverity === 'MEDIUM') score += 50;
  else score += 25;

  // Low battery penalty boost (urgent rescue needed before device dies)
  if (beacon.batteryLevelPercent <= 15) score += 30;
  else if (beacon.batteryLevelPercent <= 30) score += 15;

  return score;
}

export function sortBeaconsByPriority(beacons: EmergencyBeacon[]): EmergencyBeacon[] {
  return [...beacons].sort((a, b) => computePriorityScore(b) - computePriorityScore(a));
}
