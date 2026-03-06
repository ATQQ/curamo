import { Elysia, t } from 'elysia';
import { db } from '../db';
import { articles, settings, templates } from '../db/schema';
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

    let templateContent = undefined;
    let extraPrompt = body.extraPrompt;
    
    if (body.templateId) {
      const template = await db.select().from(templates).where(eq(templates.id, body.templateId)).get();
      if (template) {
        templateContent = template.contentPattern;
        if (template.prompt) {
          extraPrompt = extraPrompt ? `${template.prompt}\n\n${extraPrompt}` : template.prompt;
        }
      }
    }

    // 若 refetchContent=true，忽略缓存内容，重新从原始 URL 抓取并更新 DB
    let contentToUse = article.content || undefined;
    if (body.refetchContent) {
      console.log(`[Summarize] Refetching content for article ${id}`);
      const freshContent = await agentService.fetchArticleContent(article.url);
      if (freshContent) {
        contentToUse = freshContent;
        await db.update(articles)
          .set({ content: freshContent })
          .where(eq(articles.id, id));
      }
    }

    const summary = await agentService.summarizeContent(
      article.url, 
      contentToUse, 
      targetLang,
      templateContent,
      extraPrompt
    );
    
    await db.update(articles)
      .set({ aiSummary: summary })
      .where(eq(articles.id, id));
      
    return { aiSummary: summary };
  }, {
    body: t.Object({
      targetLang: t.Optional(t.String()),
      templateId: t.Optional(t.String()),
      extraPrompt: t.Optional(t.String()),
      refetchContent: t.Optional(t.Boolean()),
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
