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

  // P2P / CRDT sync
  CRDT_UPDATE: 'crdt:update',
  PEER_OFFER: 'peer:offer',
  PEER_ANSWER: 'peer:answer',
  PEER_ICE: 'peer:ice',
  PEER_JOINED: 'peer:joined',
  PEER_LEFT: 'peer:left',

  // System
  ALERT: 'alert',
} as const;

export const RESOURCE_CATEGORIES = ['food', 'medical', 'personnel', 'equipment'] as const;

export const ZONE_SEVERITY = ['low', 'medium', 'high', 'critical'] as const;
