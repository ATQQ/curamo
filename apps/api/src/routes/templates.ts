import { Elysia, t } from 'elysia';
import { db } from '../db';
import { templates } from '../db/schema';
import { eq } from 'drizzle-orm';

export const templatesRoutes = new Elysia({ prefix: '/templates' })
  .get('/', async ({ query }) => {
    if (query?.type) {
      return await db.select().from(templates).where(eq(templates.type, query.type as 'summary' | 'curated')).all();
    }
    return await db.select().from(templates).all();
  })
  .post('/', async ({ body }) => {
    const [template] = await db.insert(templates).values({
      name: body.name,
      type: body.type || 'summary',
      contentPattern: body.contentPattern,
      prompt: body.prompt || null,
    }).returning();
    return template;
  }, {
    body: t.Object({
      name: t.String(),
      type: t.Optional(t.Union([t.Literal('summary'), t.Literal('curated')])),
      contentPattern: t.String(),
      prompt: t.Optional(t.String()),
    })
  })
  .put('/:id', async ({ params: { id }, body }) => {
    const [template] = await db.update(templates)
      .set({
        ...body,
        type: body.type as 'summary' | 'curated' | undefined,
        prompt: body.prompt === undefined ? undefined : body.prompt,
      })
      .where(eq(templates.id, id))
      .returning();
    return template;
  }, {
    body: t.Object({
      name: t.Optional(t.String()),
      type: t.Optional(t.Union([t.Literal('summary'), t.Literal('curated')])),
      contentPattern: t.Optional(t.String()),
      prompt: t.Optional(t.String()),
    })
  })
  .delete('/:id', async ({ params: { id } }) => {
    await db.delete(templates).where(eq(templates.id, id));
    return { success: true };
  });
