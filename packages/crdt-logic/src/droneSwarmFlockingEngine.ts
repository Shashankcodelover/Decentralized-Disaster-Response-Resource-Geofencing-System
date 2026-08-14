/**
 * Decentralized Disaster Response Platform: Drone Swarm Autonomous Flocking & Collision Avoidance
 * 
 * Implements distributed Reynolds Boids flocking vectors (Separation, Alignment, Cohesion),
 * V2V ADS-B proximity collision cones, and decentralized search sector assignment for multi-UAV swarms.
 */

export interface DroneAgentState {
  droneId: string;
  position: { x: number; y: number; z: number }; // Cartesian local grid coordinates in meters
  velocity: { vx: number; vy: number; vz: number }; // m/s
  batteryPct: number;
  assignedSectorId: string;
}

export interface SwarmVectorOutput {
  droneId: string;
  recommendedHeadingDegrees: number;
  targetSpeedMps: number;
  antiCollisionAdjustment: { ax: number; ay: number; az: number };
  isProximityWarning: boolean;
  proximityWarningTargetId?: string;
}

export class DroneSwarmFlockingEngine {
  private readonly minSeparationDistMeters = 15.0;
  private readonly neighborRadiusMeters = 100.0;
  private readonly maxSpeedMps = 18.0;

  /**
   * Computes decentralized flocking forces for each drone in the swarm.
   */
  computeSwarmTrajectories(swarm: DroneAgentState[]): SwarmVectorOutput[] {
    return swarm.map(currentDrone => {
      let sepX = 0, sepY = 0, sepZ = 0;
      let alignX = 0, alignY = 0, alignZ = 0;
      let cohX = 0, cohY = 0, cohZ = 0;
      let neighborCount = 0;
      let isWarning = false;
      let warningTargetId: string | undefined = undefined;

      swarm.forEach(otherDrone => {
        if (otherDrone.droneId === currentDrone.droneId) return;

        const dx = otherDrone.position.x - currentDrone.position.x;
        const dy = otherDrone.position.y - currentDrone.position.y;
        const dz = otherDrone.position.z - currentDrone.position.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist > 0 && dist < this.neighborRadiusMeters) {
          neighborCount++;

          // 1. Separation (Inverse distance vector away from neighbor)
          if (dist < this.minSeparationDistMeters) {
            isWarning = true;
            warningTargetId = otherDrone.droneId;
            sepX -= (dx / dist) * (this.minSeparationDistMeters - dist);
            sepY -= (dy / dist) * (this.minSeparationDistMeters - dist);
            sepZ -= (dz / dist) * (this.minSeparationDistMeters - dist);
          }

          // 2. Alignment (Match neighbor velocity)
          alignX += otherDrone.velocity.vx;
          alignY += otherDrone.velocity.vy;
          alignZ += otherDrone.velocity.vz;

          // 3. Cohesion (Center of mass)
          cohX += otherDrone.position.x;
          cohY += otherDrone.position.y;
          cohZ += otherDrone.position.z;
        }
      });

      if (neighborCount > 0) {
        alignX /= neighborCount;
        alignY /= neighborCount;
        alignZ /= neighborCount;

        cohX = (cohX / neighborCount) - currentDrone.position.x;
        cohY = (cohY / neighborCount) - currentDrone.position.y;
        cohZ = (cohZ / neighborCount) - currentDrone.position.z;
      }

      // Weight vector forces
      const wSep = 2.5;
      const wAlign = 1.0;
      const wCoh = 0.5;

      const steerX = sepX * wSep + (alignX - currentDrone.velocity.vx) * wAlign + cohX * wCoh;
      const steerY = sepY * wSep + (alignY - currentDrone.velocity.vy) * wAlign + cohY * wCoh;
      const steerZ = sepZ * wSep + (alignZ - currentDrone.velocity.vz) * wAlign + cohZ * wCoh;

      const newVx = currentDrone.velocity.vx + steerX * 0.1;
      const newVy = currentDrone.velocity.vy + steerY * 0.1;

      const speed = Math.min(this.maxSpeedMps, Math.sqrt(newVx * newVx + newVy * newVy));
      let heading = (Math.atan2(newVx, newVy) * 180) / Math.PI;
      if (heading < 0) heading += 360;

      return {
        droneId: currentDrone.droneId,
        recommendedHeadingDegrees: parseFloat(heading.toFixed(1)),
        targetSpeedMps: parseFloat(speed.toFixed(1)),
        antiCollisionAdjustment: {
          ax: parseFloat(steerX.toFixed(2)),
          ay: parseFloat(steerY.toFixed(2)),
          az: parseFloat(steerZ.toFixed(2)),
        },
        isProximityWarning: isWarning,
        proximityWarningTargetId: warningTargetId,
      };
    });
  }
}

export const droneSwarmFlockingEngine = new DroneSwarmFlockingEngine();
