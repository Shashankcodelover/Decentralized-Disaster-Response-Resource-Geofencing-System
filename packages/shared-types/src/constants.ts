export const SOCKET_EVENTS = {
  // Geofencing
  ZONE_ENTER: 'zone:enter',
  ZONE_EXIT: 'zone:exit',
  ZONE_UPDATED: 'zone:updated',
  ZONE_CREATED: 'zone:created',

  // Resources
  RESOURCE_UPDATED: 'resource:updated',
  RESOURCE_CREATED: 'resource:created',
  RESOURCE_DELETED: 'resource:deleted',
  RESOURCE_TRANSFER: 'resource:transfer',
  RESOURCE_DEPLETED: 'resource:depleted',

  // P2P / CRDT sync
  CRDT_UPDATE: 'crdt:update',
  PEER_OFFER: 'peer:offer',
  PEER_ANSWER: 'peer:answer',
  PEER_ICE: 'peer:ice',
  PEER_JOINED: 'peer:joined',
  PEER_LEFT: 'peer:left',

  // Emergency SOS
  SOS_BEACON: 'sos:beacon',
  SOS_ACKNOWLEDGED: 'sos:acknowledged',
  SOS_RESOLVED: 'sos:resolved',

  // Communications
  COMMS_MESSAGE: 'comms:message',
  COMMS_BROADCAST: 'comms:broadcast',

  // Incident Timeline
  TIMELINE_EVENT: 'timeline:event',

  // System
  ALERT: 'alert',
  LOCATION_BROADCAST: 'responder:location:broadcast',
} as const;

export const RESOURCE_CATEGORIES = ['food', 'medical', 'personnel', 'equipment'] as const;

export const ZONE_SEVERITY = ['low', 'medium', 'high', 'critical'] as const;
