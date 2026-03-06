import { Elysia, t } from 'elysia';
import { db } from '../db';
import { templates } from '../db/schema';
import { eq } from 'drizzle-orm';

export const templatesRoutes = new Elysia({ prefix: '/templates' })
  .get('/', async () => {
    return await db.select().from(templates).all();
  })
  .post('/', async ({ body }) => {
    const [template] = await db.insert(templates).values({
      name: body.name,
      contentPattern: body.contentPattern,
      prompt: body.prompt || null,
    }).returning();
    return template;
  }, {
    body: t.Object({
      name: t.String(),
      contentPattern: t.String(),
      prompt: t.Optional(t.String()),
    })
  })
  .put('/:id', async ({ params: { id }, body }) => {
    const [template] = await db.update(templates)
      .set({
        ...body,
        prompt: body.prompt === undefined ? undefined : body.prompt,
      })
      .where(eq(templates.id, id))
      .returning();
    return template;
  }, {
    body: t.Object({
      name: t.Optional(t.String()),
      contentPattern: t.Optional(t.String()),
      prompt: t.Optional(t.String()),
    })
  })
  .delete('/:id', async ({ params: { id } }) => {
    await db.delete(templates).where(eq(templates.id, id));
    return { success: true };
  });
