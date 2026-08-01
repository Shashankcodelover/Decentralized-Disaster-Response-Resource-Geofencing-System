import 'dotenv/config';
import { connectDB } from './db';
import { DangerZoneModel } from './models/DangerZone';
import { ResourceHubModel } from './models/ResourceHub';
import logger from './logger';

async function seed() {
  await connectDB();

  await DangerZoneModel.deleteMany({});
  await ResourceHubModel.deleteMany({});

  await DangerZoneModel.insertMany([
    {
      name: 'Wildfire Zone Alpha',
      description: 'Active wildfire spreading northeast',
      severity: 'critical',
      active: true,
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-118.5, 34.1], [-118.3, 34.1], [-118.3, 34.3],
          [-118.5, 34.3], [-118.5, 34.1],
        ]],
      },
    },
    {
      name: 'Flood Zone Beta',
      description: 'Flash flood warning in valley',
      severity: 'high',
      active: true,
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-87.7, 41.8], [-87.5, 41.8], [-87.5, 42.0],
          [-87.7, 42.0], [-87.7, 41.8],
        ]],
      },
    },
    {
      name: 'Evacuation Zone C',
      description: 'Mandatory evacuation order',
      severity: 'medium',
      active: true,
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-73.95, 40.7], [-73.85, 40.7], [-73.85, 40.8],
          [-73.95, 40.8], [-73.95, 40.7],
        ]],
      },
    },
  ]);

  await ResourceHubModel.insertMany([
    {
      name: 'LA Emergency Depot',
      capacity: 500,
      location: { type: 'Point', coordinates: [-118.25, 34.05] },
      resources: [
        { category: 'food', name: 'MRE Packs', quantity: 2000, unit: 'units' },
        { category: 'medical', name: 'First Aid Kits', quantity: 150, unit: 'kits' },
      ],
    },
    {
      name: 'Chicago Relief Center',
      capacity: 300,
      location: { type: 'Point', coordinates: [-87.63, 41.88] },
      resources: [
        { category: 'personnel', name: 'Volunteers', quantity: 80, unit: 'people' },
        { category: 'equipment', name: 'Generators', quantity: 12, unit: 'units' },
      ],
    },
    {
      name: 'NYC Coordination Hub',
      capacity: 800,
      location: { type: 'Point', coordinates: [-74.0, 40.71] },
      resources: [
        { category: 'medical', name: 'Ventilators', quantity: 25, unit: 'units' },
        { category: 'food', name: 'Water Bottles', quantity: 10000, unit: 'bottles' },
      ],
    },
  ]);

  logger.info('✅ Seeded 3 danger zones and 3 resource hubs');
  process.exit(0);
}

seed().catch((e) => { logger.error({ err: e }, 'Seed failed'); process.exit(1); });
