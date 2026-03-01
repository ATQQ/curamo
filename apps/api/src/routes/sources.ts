import { Elysia, t } from 'elysia';
import { db } from '../db';
import { sources, articles } from '../db/schema';
import { eq } from 'drizzle-orm';
import { syncSource } from '../services/rss';

export const sourcesRoutes = new Elysia({ prefix: '/sources' })
  .get('/', async () => {
    return await db.select().from(sources).all();
  })
  .post('/', async ({ body }) => {
    const [newSource] = await db.insert(sources).values(body).returning();
    return newSource;
  }, {
    body: t.Object({
      name: t.String(),
      url: t.String(),
      type: t.Optional(t.Union([t.Literal('rss'), t.Literal('manual')])),
      config: t.Optional(t.Object({})), // Accept any JSON object
    })
  })
  .delete('/:id', async ({ params: { id } }) => {
    // Delete associated articles first
    await db.delete(articles).where(eq(articles.sourceId, id));
    
    // Delete the source
    const result = await db.delete(sources).where(eq(sources.id, id)).returning();
    
    if (!result.length) {
      throw new Error('Source not found');
    }
    
    return { success: true, message: 'Source deleted' };
  })
  .post('/:id/sync', async ({ params: { id } }) => {
    const source = await db.select().from(sources).where(eq(sources.id, id)).get();
    if (!source) {
      throw new Error('Source not found');
    }
    
    // Asynchronously sync
    syncSource(source).catch(err => console.error(err));
    
    return { success: true, message: 'Sync started' };
  });
