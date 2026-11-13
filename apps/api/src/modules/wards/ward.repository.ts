import { AppDataSource } from '../../config/database.js';
import { Ward } from '../../database/entities/Ward.js';

export async function findActiveWard(): Promise<Ward | null> {
  return AppDataSource.getRepository(Ward).findOne({
    where: { isActive: true },
    order: { createdAt: 'ASC' },
  });
}

export async function findAllWards(): Promise<Ward[]> {
  return AppDataSource.getRepository(Ward).find({
    order: { name: 'ASC' },
  });
}

export async function findWardById(id: string): Promise<Ward | null> {
  return AppDataSource.getRepository(Ward).findOne({
    where: { id },
  });
}

export async function findWardByCode(code: string): Promise<Ward | null> {
  return AppDataSource.getRepository(Ward).findOne({
    where: { code },
  });
}

export async function countRegisteredBedsByWard(wardId: string): Promise<number> {
  const rows = (await AppDataSource.query(
    `SELECT COUNT(*)::int AS count FROM "beds" WHERE ward_id = $1;`,
    [wardId],
  )) as Array<{ count: number }>;
  return Number(rows[0]?.count ?? 0);
}

export async function countActiveAllocationsByWard(
  wardId: string,
  manager = AppDataSource.manager,
): Promise<number> {
  const rows = (await manager.query(
    `SELECT COUNT(*)::int AS count 
     FROM "bed_allocation_history" bah 
     INNER JOIN "beds" b ON b.id = bah.bed_id 
     WHERE b.ward_id = $1 AND bah.released_at IS NULL;`,
    [wardId],
  )) as Array<{ count: number }>;
  return Number(rows[0]?.count ?? 0);
}
