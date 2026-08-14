/**
 * Cursor on Target (CoT) XML Protocol Bridge
 * 
 * Standardized MIL-STD / ATAK / WinTAK / TAK Server / Meshtastic interoperability protocol.
 * Translates decentralized disaster response entities (beacons, responders, danger zones, drone tracks)
 * into and out of canonical Cursor on Target (CoT) XML events.
 */

export interface CoTPoint {
  lat: number;
  lon: number;
  hae?: number; // Height Above Ellipsoid (meters)
  ce?: number;  // Circular Error (meters)
  le?: number;  // Linear Error (meters)
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
  detail?: Record<string, string | number | boolean>;
}

/**
 * Maps system entity types to standard MIL-STD Cursor on Target (CoT) type codes.
 */
export function getCoTTypeForEntity(category: 'responder' | 'victim' | 'drone' | 'danger_zone' | 'resource_hub'): string {
  switch (category) {
    case 'responder':
      return 'a-f-G-U-C'; // Atom / Friendly / Ground / Unit / Combat/Civil Support
    case 'victim':
      return 'b-r-v';     // Beacon / Rescue / Victim
    case 'drone':
      return 'a-f-A-M-F'; // Atom / Friendly / Air / Military/Fleet / Fixed/Rotary Wing
    case 'danger_zone':
      return 'u-d-z';     // User-defined / Danger / Hazard Zone
    case 'resource_hub':
      return 'a-f-G-I-s'; // Atom / Friendly / Ground / Installation / Supply
    default:
      return 'u-d-o';     // User-defined other
  }
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

  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<event version="2.0" uid="${event.uid}" type="${event.type}" how="${event.how}" ` +
    `time="${event.time}" start="${event.start}" stale="${event.stale}">` +
    `<point lat="${event.point.lat.toFixed(6)}" lon="${event.point.lon.toFixed(6)}" ` +
    `hae="${hae.toFixed(1)}" ce="${ce.toFixed(1)}" le="${le.toFixed(1)}"/>` +
    `<detail>${contactTag}<remarks${detailEntries}/></detail>` +
    `</event>`
  );
}

/**
 * Lightweight deterministic XML parser for Cursor on Target (CoT) events.
 * Extracts standard event attributes, point coordinates, and details without heavy DOM dependencies.
 */
export function parseCoTFromXml(xml: string): CoTEvent | null {
  try {
    // Match event attributes
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

    // Match point tag
    const pointMatch = xml.match(/<point\s+([^>]+)\/?>/i);
    if (!pointMatch) return null;

    const pointAttrs = pointMatch[1];
    const latStr = extractAttr(pointAttrs, 'lat');
    const lonStr = extractAttr(pointAttrs, 'lon');

    if (!latStr || !lonStr) return null;

    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);
    const hae = parseFloat(extractAttr(pointAttrs, 'hae') || '0');
    const ce = parseFloat(extractAttr(pointAttrs, 'ce') || '10');
    const le = parseFloat(extractAttr(pointAttrs, 'le') || '10');

    // Match callsign
    const contactMatch = xml.match(/<contact\s+([^>]+)\/?>/i);
    const callsign = contactMatch ? extractAttr(contactMatch[1], 'callsign') : undefined;

    return {
      uid,
      type,
      how,
      time,
      start,
      stale,
      point: { lat, lon, hae, ce, le },
      callsign,
    };
  } catch {
    return null;
  }
}

function extractAttr(attrString: string, attrName: string): string | undefined {
  const regex = new RegExp(`${attrName}=["']([^"']+)["']`, 'i');
  const match = attrString.match(regex);
  return match ? match[1] : undefined;
}

/**
 * Creates a CoT event from a Responder's coordinates and ID.
 */
export function responderToCoT(responder: { id: string; name: string; coordinates: [number, number]; status?: string }): CoTEvent {
  const now = new Date();
  const staleTime = new Date(now.getTime() + 120_000); // 2 min stale

  return {
    uid: `responder-${responder.id}`,
    type: getCoTTypeForEntity('responder'),
    how: 'm-g',
    time: now.toISOString(),
    start: now.toISOString(),
    stale: staleTime.toISOString(),
    point: {
      lat: responder.coordinates[1], // lat
      lon: responder.coordinates[0], // lng
      hae: 0,
      ce: 5.0,
      le: 5.0,
    },
    callsign: responder.name,
    detail: {
      status: responder.status || 'active',
      role: 'First Responder',
    },
  };
}

/**
 * Creates a CoT event from an Emergency Beacon distress signal.
 */
export function beaconToCoT(beacon: { beaconId: string; blurredLat: number; blurredLng: number; distressSeverity: string; payload?: string }): CoTEvent {
  const now = new Date();
  const staleTime = new Date(now.getTime() + 600_000); // 10 min stale

  return {
    uid: `beacon-${beacon.beaconId}`,
    type: getCoTTypeForEntity('victim'),
    how: 'h-e',
    time: now.toISOString(),
    start: now.toISOString(),
    stale: staleTime.toISOString(),
    point: {
      lat: beacon.blurredLat,
      lon: beacon.blurredLng,
      hae: 0,
      ce: 100.0, // 100m blur circle
      le: 100.0,
    },
    callsign: `SOS-${beacon.distressSeverity}`,
    detail: {
      severity: beacon.distressSeverity,
      message: beacon.payload || 'Emergency beacon',
    },
  };
}
