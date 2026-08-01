import { useState, useEffect, useRef, useCallback } from 'react';

export type VolunteerRole = 'medic' | 'firefighter' | 'rescue' | 'logistics' | 'volunteer';
export type VolunteerStatus = 'idle' | 'moving' | 'in-zone' | 'offline';

export interface Volunteer {
  id: string;
  name: string;
  role: VolunteerRole;
  gender: 'male' | 'female';
  lat: number;
  lng: number;
  status: VolunteerStatus;
  currentZoneId: string | null;
  assignedZoneId: string | null;
  speed: number; // degrees per tick
  skills: string[];
}

export interface ZoneNeed {
  zoneId: string;
  zoneName: string;
  severity: string;
  centerLat: number;
  centerLng: number;
  requiredCount: number;
  currentCount: number;
  status: 'critical-need' | 'needs-support' | 'adequate' | 'overcrowded';
}

const ROLE_ICONS: Record<VolunteerRole, string> = {
  medic: '🏥',
  firefighter: '🚒',
  rescue: '🦺',
  logistics: '📦',
  volunteer: '🙋',
};

const ROLE_COLORS: Record<VolunteerRole, string> = {
  medic: '#f87171',
  firefighter: '#fb923c',
  rescue: '#facc15',
  logistics: '#38bdf8',
  volunteer: '#a78bfa',
};

const INITIAL_VOLUNTEERS: Volunteer[] = [
  { id: 'V-001', name: 'Sarah Chen', role: 'medic', gender: 'female', lat: 34.05, lng: -118.25, status: 'idle', currentZoneId: null, assignedZoneId: null, speed: 0.008, skills: ['First Aid', 'Triage', 'CPR'] },
  { id: 'V-002', name: 'Marcus Johnson', role: 'firefighter', gender: 'male', lat: 34.2, lng: -118.45, status: 'idle', currentZoneId: null, assignedZoneId: null, speed: 0.006, skills: ['Fire Suppression', 'Rescue', 'HAZMAT'] },
  { id: 'V-003', name: 'Priya Patel', role: 'rescue', gender: 'female', lat: 41.85, lng: -87.65, status: 'idle', currentZoneId: null, assignedZoneId: null, speed: 0.007, skills: ['Search & Rescue', 'Rope Work', 'Navigation'] },
  { id: 'V-004', name: 'James Okafor', role: 'logistics', gender: 'male', lat: 41.9, lng: -87.6, status: 'idle', currentZoneId: null, assignedZoneId: null, speed: 0.009, skills: ['Supply Chain', 'Driving', 'Inventory'] },
  { id: 'V-005', name: 'Aisha Rahman', role: 'volunteer', gender: 'female', lat: 40.72, lng: -73.93, status: 'idle', currentZoneId: null, assignedZoneId: null, speed: 0.007, skills: ['Community Outreach', 'Translation', 'First Aid'] },
  { id: 'V-006', name: 'Carlos Rivera', role: 'rescue', gender: 'male', lat: 40.75, lng: -73.88, status: 'idle', currentZoneId: null, assignedZoneId: null, speed: 0.008, skills: ['Urban Rescue', 'Medical', 'Comms'] },
  { id: 'V-007', name: 'Yuki Tanaka', role: 'medic', gender: 'female', lat: 34.12, lng: -118.32, status: 'idle', currentZoneId: null, assignedZoneId: null, speed: 0.006, skills: ['Emergency Medicine', 'Trauma', 'Pediatrics'] },
  { id: 'V-008', name: 'David Kim', role: 'firefighter', gender: 'male', lat: 34.08, lng: -118.28, status: 'idle', currentZoneId: null, assignedZoneId: null, speed: 0.007, skills: ['Wildfire', 'Aerial Support', 'Rescue'] },
];

// Zone centers and requirements
const ZONE_CONFIGS = [
  { zoneId: 'zone-la', zoneName: 'Wildfire Zone Alpha', severity: 'critical', centerLat: 34.2, centerLng: -118.4, requiredCount: 4 },
  { zoneId: 'zone-chi', zoneName: 'Flood Zone Beta', severity: 'high', centerLat: 41.9, centerLng: -87.6, requiredCount: 3 },
  { zoneId: 'zone-nyc', zoneName: 'Evacuation Zone C', severity: 'medium', centerLat: 40.75, centerLng: -73.9, requiredCount: 2 },
];

function isInsideZone(lat: number, lng: number, centerLat: number, centerLng: number, radius = 0.15): boolean {
  return Math.abs(lat - centerLat) < radius && Math.abs(lng - centerLng) < radius;
}

function moveToward(current: number, target: number, speed: number): number {
  const diff = target - current;
  if (Math.abs(diff) < speed) return target;
  return current + Math.sign(diff) * speed;
}

export function useVolunteerSim() {
  const [volunteers, setVolunteers] = useState<Volunteer[]>(INITIAL_VOLUNTEERS);
  const [zoneNeeds, setZoneNeeds] = useState<ZoneNeed[]>([]);
  const [dispatchMessages, setDispatchMessages] = useState<string[]>([]);
  const [selectedVolunteer, setSelectedVolunteer] = useState<Volunteer | null>(null);
  const tickRef = useRef(0);

  // Compute zone needs based on current volunteer positions
  const computeZoneNeeds = useCallback((vols: Volunteer[]): ZoneNeed[] => {
    return ZONE_CONFIGS.map((zc) => {
      const inZone = vols.filter(v =>
        isInsideZone(v.lat, v.lng, zc.centerLat, zc.centerLng)
      ).length;
      const ratio = inZone / zc.requiredCount;
      let status: ZoneNeed['status'];
      if (ratio === 0) status = 'critical-need';
      else if (ratio < 0.5) status = 'needs-support';
      else if (ratio <= 1.2) status = 'adequate';
      else status = 'overcrowded';
      return { ...zc, currentCount: inZone, status };
    });
  }, []);

  // Assign idle volunteers to zones that need help
  const autoDispatch = useCallback((vols: Volunteer[], needs: ZoneNeed[]): Volunteer[] => {
    const updated = vols.map(v => ({ ...v }));
    const msgs: string[] = [];

    for (const need of needs) {
      if (need.status === 'critical-need' || need.status === 'needs-support') {
        // Find idle volunteers not already assigned here
        const idle = updated.filter(v =>
          v.status === 'idle' && v.assignedZoneId !== need.zoneId
        );
        const needed = need.requiredCount - need.currentCount;
        const toSend = idle.slice(0, Math.max(0, needed));
        for (const v of toSend) {
          v.assignedZoneId = need.zoneId;
          v.status = 'moving';
          msgs.push(`📡 Dispatching ${v.name} (${v.role}) → ${need.zoneName}`);
        }
      }
      if (need.status === 'overcrowded') {
        // Suggest some leave
        const excess = updated.filter(v =>
          isInsideZone(v.lat, v.lng, need.centerLat, need.centerLng) &&
          v.role === 'volunteer'
        );
        if (excess.length > 0) {
          msgs.push(`⚠ ${need.zoneName} is overcrowded — ${excess.length} volunteer(s) should relocate`);
        }
      }
    }

    if (msgs.length > 0) {
      setDispatchMessages(prev => [...msgs, ...prev].slice(0, 10));
    }
    return updated;
  }, []);

  // Simulation tick — move volunteers toward their assigned zones
  useEffect(() => {
    const interval = setInterval(() => {
      tickRef.current += 1;

      setVolunteers(prev => {
        const needs = computeZoneNeeds(prev);

        // Auto-dispatch every 5 ticks
        let updated = tickRef.current % 5 === 0 ? autoDispatch(prev, needs) : prev.map(v => ({ ...v }));

        // Move volunteers toward assigned zones
        updated = updated.map(v => {
          if (v.status !== 'moving' || !v.assignedZoneId) return v;

          const zone = ZONE_CONFIGS.find(z => z.zoneId === v.assignedZoneId);
          if (!zone) return v;

          const newLat = moveToward(v.lat, zone.centerLat + (Math.random() - 0.5) * 0.05, v.speed);
          const newLng = moveToward(v.lng, zone.centerLng + (Math.random() - 0.5) * 0.05, v.speed);
          const arrived = isInsideZone(newLat, newLng, zone.centerLat, zone.centerLng, 0.12);

          return {
            ...v,
            lat: newLat,
            lng: newLng,
            status: arrived ? 'in-zone' : 'moving',
            currentZoneId: arrived ? v.assignedZoneId : null,
          };
        });

        // Add small random drift to idle volunteers
        updated = updated.map(v => {
          if (v.status !== 'idle') return v;
          return {
            ...v,
            lat: v.lat + (Math.random() - 0.5) * 0.002,
            lng: v.lng + (Math.random() - 0.5) * 0.002,
          };
        });

        setZoneNeeds(computeZoneNeeds(updated));
        return updated;
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [computeZoneNeeds, autoDispatch]);

  const dispatchVolunteer = useCallback((volunteerId: string, zoneId: string) => {
    setVolunteers(prev => prev.map(v => {
      if (v.id !== volunteerId) return v;
      const zone = ZONE_CONFIGS.find(z => z.zoneId === zoneId);
      if (!zone) return v;
      setDispatchMessages(p => [`📡 Manual dispatch: ${v.name} → ${zone.zoneName}`, ...p].slice(0, 10));
      return { ...v, assignedZoneId: zoneId, status: 'moving' };
    }));
  }, []);

  const recallVolunteer = useCallback((volunteerId: string) => {
    setVolunteers(prev => prev.map(v => {
      if (v.id !== volunteerId) return v;
      setDispatchMessages(p => [`↩ Recalled: ${v.name}`, ...p].slice(0, 10));
      return { ...v, assignedZoneId: null, status: 'idle' };
    }));
  }, []);

  return {
    volunteers,
    zoneNeeds,
    dispatchMessages,
    selectedVolunteer,
    setSelectedVolunteer,
    dispatchVolunteer,
    recallVolunteer,
    roleIcons: ROLE_ICONS,
    roleColors: ROLE_COLORS,
    zoneConfigs: ZONE_CONFIGS,
  };
}
