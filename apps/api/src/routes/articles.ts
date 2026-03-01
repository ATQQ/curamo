import { Elysia, t } from 'elysia';
import { db } from '../db';
import { articles, settings } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { agentService } from '../agent/service';

export const articlesRoutes = new Elysia({ prefix: '/articles' })
  .post('/:id/translate', async ({ params: { id }, body }) => {
    const article = await db.select().from(articles).where(eq(articles.id, id)).get();
    if (!article) throw new Error('Article not found');

    let targetLang = body.targetLang;
    if (!targetLang) {
      const setting = await db.select().from(settings).where(eq(settings.key, 'target_language')).get();
      targetLang = setting?.value || 'Chinese';
    }
    
    const translatedTitle = await agentService.translateTitle(article.title, targetLang);
    
    // If result is just the translated text, use it.
    const result = typeof translatedTitle === 'string' ? translatedTitle : JSON.stringify(translatedTitle);

    await db.update(articles)
      .set({ translatedTitle: result })
      .where(eq(articles.id, id));
      
    return { translatedTitle: result };
  }, {
    body: t.Object({
      targetLang: t.Optional(t.String())
    })
  })
  .post('/:id/summarize', async ({ params: { id }, body }) => {
    const article = await db.select().from(articles).where(eq(articles.id, id)).get();
    if (!article) throw new Error('Article not found');

    let targetLang = body.targetLang;
    if (!targetLang) {
      const setting = await db.select().from(settings).where(eq(settings.key, 'target_language')).get();
      targetLang = setting?.value || 'Chinese';
    }

    const summary = await agentService.summarizeContent(article.url, article.content || undefined, targetLang);
    
    await db.update(articles)
      .set({ aiSummary: summary })
      .where(eq(articles.id, id));
      
    return { aiSummary: summary };
  }, {
    body: t.Object({
      targetLang: t.Optional(t.String())
    })
  })
  .get('/', async ({ query }) => {
    const { sourceId } = query as { sourceId?: string };
    
    // Basic filtering
    let queryBuilder = db.select().from(articles).orderBy(desc(articles.publishedAt));
    
    if (sourceId) {
      // @ts-ignore
      queryBuilder = db.select().from(articles).where(eq(articles.sourceId, sourceId)).orderBy(desc(articles.publishedAt));
    }
    
    return await queryBuilder.all();
  })
  .get('/:id', async ({ params: { id } }) => {
    const article = await db.select().from(articles).where(eq(articles.id, id)).get();
    if (!article) {
      throw new Error('Article not found');
    }
    return article;
  })
  .post('/', async ({ body }) => {
    // Manual article addition
    const [article] = await db.insert(articles).values({
        title: body.title,
        url: body.url || '', // URL might be empty for pasted content? But schema says notNull.
                             // Schema: url: text('url').notNull().unique()
                             // So URL is required.
                             // If user pastes content, we might generate a fake URL or hash.
        content: body.content,
        sourceId: body.sourceId,
        status: 'unread',
        publishedAt: new Date(),
    }).returning();
    return article;
  }, {
      body: t.Object({
          title: t.String(),
          url: t.String(), // Required by schema
          content: t.Optional(t.String()),
          sourceId: t.Optional(t.String()),
      })
  });
