/**
 * Cursor on Target (CoT) XML Protocol Bridge — Industrial Readiness Level 11 (IR-11)
 * 
 * Standardized MIL-STD / ATAK / WinTAK / TAK Server / Meshtastic interoperability protocol.
 * Translates decentralized disaster response entities (beacons, responders, danger zones, drone tracks, sensors)
 * into and out of canonical Cursor on Target (CoT) XML events.
 */

export interface CoTPoint {
  lat: number;
  lon: number;
  hae?: number; // Height Above Ellipsoid (meters)
  ce?: number;  // Circular Error (meters)
  le?: number;  // Linear Error (meters)
}

export interface CoTSensorDetail {
  fovDegrees?: number;
  rangeMeters?: number;
  azimuthDegrees?: number;
  elevationDegrees?: number;
}

export interface CoTChatDetail {
  senderCallsign: string;
  chatroomId?: string;
  messageText: string;
}

export interface CoTEvent {
  uid: string;
  type: string;  // CoT type e.g., 'a-f-G' (friendly ground), 'b-r-v' (rescue/victim), 'u-d-z' (danger zone)
  how: string;   // e.g., 'm-g' (machine-gps), 'h-e' (human-estimated)
  time: string;  // ISO timestamp
  start: string; // ISO timestamp
  stale: string; // ISO timestamp expiration
  point: CoTPoint;
  callsign?: string;
  sensor?: CoTSensorDetail;
  chat?: CoTChatDetail;
  detail?: Record<string, string | number | boolean>;
}

/**
 * Maps system entity types to standard MIL-STD Cursor on Target (CoT) type codes.
 */
export function getCoTTypeForEntity(
  category:
    | 'responder'
    | 'victim'
    | 'victim_red'
    | 'victim_yellow'
    | 'victim_green'
    | 'victim_black'
    | 'drone'
    | 'drone_quad'
    | 'danger_zone'
    | 'hazard_plume'
    | 'hazard_flood'
    | 'resource_hub'
    | 'field_hospital'
): string {

  switch (category) {
    case 'responder':
      return 'a-f-G-U-C'; // Friendly Ground Civil Support
    case 'victim':
      return 'b-r-v';     // Legacy Beacon / Rescue / Victim
    case 'victim_red':
      return 'b-r-v-m';   // Beacon / Rescue / Victim / Immediate Red
    case 'victim_yellow':
      return 'b-r-v-d';   // Beacon / Rescue / Victim / Delayed Yellow
    case 'victim_green':
      return 'b-r-v-w';   // Beacon / Rescue / Victim / Walking Wounded Green
    case 'victim_black':
      return 'b-r-v-x';   // Beacon / Rescue / Victim / Expectant Black
    case 'drone':
      return 'a-f-A-M-F'; // Friendly Air UAV
    case 'drone_quad':
      return 'a-f-A-M-F-Q'; // Friendly Air UAV Quadcopter SAR
    case 'hazard_plume':
      return 'u-d-z-c';   // User-defined Danger Zone / Chemical Plume
    case 'hazard_flood':
      return 'u-d-z-f';   // User-defined Danger Zone / Flood
    case 'danger_zone':
      return 'u-d-z';     // User-defined Danger Zone
    case 'field_hospital':
      return 'a-f-G-I-m'; // Friendly Ground Installation Medical/Hospital
    case 'resource_hub':
      return 'a-f-G-I-s'; // Friendly Ground Installation Supply
    default:
      return 'u-d-o';     // User-defined other
  }
}

export function responderToCoT(responder: { id?: string; responderId?: string; name: string; coordinates: [number, number]; status: string }): CoTEvent {
  const uid = responder.id ? `responder-${responder.id}` : (responder.responderId || 'responder-unknown');
  const now = new Date().toISOString();
  const stale = new Date(Date.now() + 300_000).toISOString();
  return {
    uid,
    type: getCoTTypeForEntity('responder'),
    how: 'm-g',
    time: now,
    start: now,
    stale,
    point: { lat: responder.coordinates[1], lon: responder.coordinates[0], hae: 0, ce: 10, le: 10 },
    callsign: responder.name,
    detail: { status: responder.status },
  };
}

export function beaconToCoT(beacon: { beaconId: string; blurredLat?: number; blurredLng?: number; coordinates?: [number, number]; distressSeverity?: string; severity?: string; payload?: string }): CoTEvent {
  const lat = beacon.coordinates ? beacon.coordinates[1] : (beacon.blurredLat || 0);
  const lon = beacon.coordinates ? beacon.coordinates[0] : (beacon.blurredLng || 0);
  const uid = beacon.beaconId.startsWith('beacon-') ? beacon.beaconId : `beacon-${beacon.beaconId}`;
  const now = new Date().toISOString();
  const stale = new Date(Date.now() + 300_000).toISOString();
  return {
    uid,
    type: getCoTTypeForEntity('victim'),
    how: 'm-g',
    time: now,
    start: now,
    stale,
    point: { lat, lon, hae: 0, ce: 100, le: 100 },
    callsign: `BEACON-${beacon.beaconId.substring(0, 4)}`,
    detail: { severity: beacon.distressSeverity || beacon.severity || 'HIGH' },
  };
}



/**
 * Serializes a CoTEvent object into a standard Cursor on Target XML string.
 */
export function serializeCoTToXml(event: CoTEvent): string {
  const ce = event.point.ce ?? 10.0;
  const le = event.point.le ?? 10.0;
  const hae = event.point.hae ?? 0.0;

  const detailEntries = event.detail
    ? Object.entries(event.detail)
        .map(([k, v]) => ` ${k}="${String(v).replace(/"/g, '&quot;')}"`)
        .join('')
    : '';

  const contactTag = event.callsign
    ? `<contact callsign="${event.callsign.replace(/"/g, '&quot;')}"/>`
    : '';

  const sensorTag = event.sensor
    ? `<sensor fov="${event.sensor.fovDegrees ?? 60.0}" range="${event.sensor.rangeMeters ?? 1000}" azimuth="${event.sensor.azimuthDegrees ?? 0.0}"/>`
    : '';

  const chatTag = event.chat
    ? `<__chat senderCallsign="${event.chat.senderCallsign.replace(/"/g, '&quot;')}" chatgrp="${event.chat.chatroomId ?? 'All'}"><chatgrp id="All"/></__chat><remarks>${event.chat.messageText.replace(/"/g, '&quot;')}</remarks>`
    : `<remarks${detailEntries}/>`;

  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<event version="2.0" uid="${event.uid}" type="${event.type}" how="${event.how}" ` +
    `time="${event.time}" start="${event.start}" stale="${event.stale}">` +
    `<point lat="${event.point.lat.toFixed(6)}" lon="${event.point.lon.toFixed(6)}" ` +
    `hae="${hae.toFixed(1)}" ce="${ce.toFixed(1)}" le="${le.toFixed(1)}"/>` +
    `<detail>${contactTag}${sensorTag}${chatTag}</detail>` +
    `</event>`
  );
}

/**
 * Lightweight deterministic XML parser for Cursor on Target (CoT) events.
 */
export function parseCoTFromXml(xml: string): CoTEvent | null {
  try {
    const eventMatch = xml.match(/<event\s+([^>]+)>/i);
    if (!eventMatch) return null;

    const eventAttrs = eventMatch[1];
    const uid = extractAttr(eventAttrs, 'uid');
    const type = extractAttr(eventAttrs, 'type');
    const how = extractAttr(eventAttrs, 'how') || 'm-g';
    const time = extractAttr(eventAttrs, 'time') || new Date().toISOString();
    const start = extractAttr(eventAttrs, 'start') || time;
    const stale = extractAttr(eventAttrs, 'stale') || new Date(Date.now() + 300_000).toISOString();

    if (!uid || !type) return null;

    const pointMatch = xml.match(/<point\s+([^>]+)\/?>/i);
    if (!pointMatch) return null;

    const pointAttrs = pointMatch[1];
    const lat = parseFloat(extractAttr(pointAttrs, 'lat') || '0');
    const lon = parseFloat(extractAttr(pointAttrs, 'lon') || '0');
    const hae = parseFloat(extractAttr(pointAttrs, 'hae') || '0');
    const ce = parseFloat(extractAttr(pointAttrs, 'ce') || '10');
    const le = parseFloat(extractAttr(pointAttrs, 'le') || '10');

    let callsign: string | undefined;
    const contactMatch = xml.match(/<contact\s+([^>]+)\/?>/i);
    if (contactMatch) {
      callsign = extractAttr(contactMatch[1], 'callsign');
    }

    let sensor: CoTSensorDetail | undefined;
    const sensorMatch = xml.match(/<sensor\s+([^>]+)\/?>/i);
    if (sensorMatch) {
      const sAttrs = sensorMatch[1];
      sensor = {
        fovDegrees: parseFloat(extractAttr(sAttrs, 'fov') || '60'),
        rangeMeters: parseFloat(extractAttr(sAttrs, 'range') || '1000'),
        azimuthDegrees: parseFloat(extractAttr(sAttrs, 'azimuth') || '0'),
      };
    }

    return {
      uid,
      type,
      how,
      time,
      start,
      stale,
      point: { lat, lon, hae, ce, le },
      callsign,
      sensor,
    };
  } catch {
    return null;
  }
}

function extractAttr(attrString: string, attrName: string): string | undefined {
  const regex = new RegExp(`${attrName}="([^"]*)"`, 'i');
  const match = attrString.match(regex);
  return match ? match[1] : undefined;
}
