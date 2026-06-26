/**
 * Location types for host proximity tracking
 */

export interface HostLocation {
  id: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  name?: string;
  address?: string;
  scheduleId?: number;
  trainingDates?: string[]; // ISO date strings for scheduled training days
}

export type ProximityStatus = 'near' | 'far' | 'unknown';

export interface LocationState {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: number;
  proximityStatus: ProximityStatus;
  nearestHostId: string | null;
  distanceToNearestMeters: number | null;
}
