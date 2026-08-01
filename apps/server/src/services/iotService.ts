import logger from '../logger';

export interface TelemetryLog {
  sensorId: string;
  type: 'radiation' | 'air_quality' | 'temperature';
  value: number;
  unit: string;
  lng: number;
  lat: number;
  status: 'normal' | 'alert' | 'critical';
}

export interface DroneTelemetry {
  droneId: string;
  batteryPct: number;
  altitudeMeters: number;
  status: 'patrolling' | 'returning' | 'grounded';
  payloadKgs: number;
  lat: number;
  lng: number;
}

/**
 * Hardware and IoT simulation service.
 * Ingests live radiation, air quality, temperature, and drone fleet statuses.
 */

// Generate seed telemetry logs
const SENSOR_STATIONS: TelemetryLog[] = [
  { sensorId: 'STATION-01-RAD', type: 'radiation', value: 0.12, unit: 'uSv/h', lng: -118.4, lat: 34.2, status: 'normal' },
  { sensorId: 'STATION-02-AQI', type: 'air_quality', value: 165, unit: 'AQI', lng: -87.6, lat: 41.9, status: 'alert' },
  { sensorId: 'STATION-03-TEMP', type: 'temperature', value: 41.2, unit: 'C', lng: -73.9, lat: 40.75, status: 'alert' },
  { sensorId: 'STATION-04-RAD', type: 'radiation', value: 8.4, unit: 'uSv/h', lng: -118.45, lat: 34.25, status: 'critical' },
];

const DRONES: DroneTelemetry[] = [
  { droneId: 'DRONE-ALPHA', batteryPct: 82, altitudeMeters: 120, status: 'patrolling', payloadKgs: 4.5, lat: 34.21, lng: -118.41 },
  { droneId: 'DRONE-BETA', batteryPct: 14, altitudeMeters: 45, status: 'returning', payloadKgs: 0, lat: 41.92, lng: -87.62 },
];

/**
 * Returns latest edge sensor logs.
 */
export async function getLatestSensorTelemetry(): Promise<TelemetryLog[]> {
  // Add small random noise to simulate actual readings updating
  return SENSOR_STATIONS.map(station => {
    let noise = (Math.random() - 0.5) * 2;
    if (station.type === 'radiation') noise = (Math.random() - 0.5) * 0.05;
    
    const val = parseFloat((station.value + noise).toFixed(2));
    let status: TelemetryLog['status'] = 'normal';
    if (station.type === 'radiation' && val > 5.0) status = 'critical';
    else if (station.type === 'air_quality' && val > 150) status = 'alert';
    else if (station.type === 'temperature' && val > 38.0) status = 'alert';

    return { ...station, value: Math.max(0, val), status };
  });
}

/**
 * Returns active drone telemetry statuses.
 */
export async function getDroneTelemetry(): Promise<DroneTelemetry[]> {
  return DRONES.map(drone => {
    // Simulate battery drain
    const battery = Math.max(0, drone.batteryPct - (Math.random() > 0.7 ? 1 : 0));
    return { 
      ...drone, 
      batteryPct: battery,
      status: battery < 15 ? 'returning' : drone.status,
      lat: drone.lat + (Math.random() - 0.5) * 0.002,
      lng: drone.lng + (Math.random() - 0.5) * 0.002,
    };
  });
}
