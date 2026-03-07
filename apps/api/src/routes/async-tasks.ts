import { Elysia, t } from 'elysia';
import { db } from '../db';
import { asyncTasks } from '../db/schema';
import { eq, desc, and } from 'drizzle-orm';

export const asyncTasksRoutes = new Elysia({ prefix: '/async-tasks' })
  .get('/', async ({ query }) => {
    const { type, status, limit } = query as { type?: string, status?: any, limit?: string };
    
    let conditions = [];
    if (type) conditions.push(eq(asyncTasks.type, type));
    if (status) conditions.push(eq(asyncTasks.status, status));
    
    let queryBuilder = db.select().from(asyncTasks);
    
    if (conditions.length > 0) {
      // @ts-ignore
      queryBuilder = queryBuilder.where(and(...conditions));
    }
    
    // @ts-ignore
    queryBuilder = queryBuilder.orderBy(desc(asyncTasks.createdAt));

    if (limit) {
      // @ts-ignore
      queryBuilder = queryBuilder.limit(parseInt(limit));
    }
    
    return await queryBuilder.all();
  })
  .get('/:id', async ({ params: { id } }) => {
    const task = await db.select().from(asyncTasks).where(eq(asyncTasks.id, id)).get();
    if (!task) {
      throw new Error('Task not found');
    }
    return task;
  });
