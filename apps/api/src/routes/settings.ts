import { Elysia, t } from 'elysia';
import { db } from '../db';
import { settings } from '../db/schema';
import { eq } from 'drizzle-orm';

export const settingsRoutes = new Elysia({ prefix: '/settings' })
  .get('/', async () => {
    return await db.select().from(settings).all();
  })
  .put('/', async ({ body }) => {
    const { key, value } = body;
    const existing = await db.select().from(settings).where(eq(settings.key, key)).get();
    
    if (existing) {
      const [updated] = await db.update(settings).set({ value }).where(eq(settings.key, key)).returning();
      return updated;
    } else {
      const [created] = await db.insert(settings).values({ key, value }).returning();
      return created;
    }
  }, {
    body: t.Object({
      key: t.String(),
      value: t.String(),
    })
  });
