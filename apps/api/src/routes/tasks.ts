import { Elysia, t } from 'elysia';
import { db } from '../db';
import { tasks, taskItems, articles, snapshots, templates } from '../db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { agentService } from '../agent/service';

export const tasksRoutes = new Elysia({ prefix: '/tasks' })
  .get('/', async () => {
    return await db.select().from(tasks).all();
  })
  .post('/', async ({ body }) => {
    const [newTask] = await db.insert(tasks).values({
      title: body.title,
      templateId: body.templateId,
      status: 'draft',
    }).returning();
    
    // If articleIds provided, create task items
    if (body.articleIds && body.articleIds.length > 0) {
      const items = body.articleIds.map(articleId => ({
        taskId: newTask.id,
        articleId: articleId,
        isSelected: true, // Default to selected when manually added
      }));
      
      await db.insert(taskItems).values(items);
    }
    
    return newTask;
  }, {
    body: t.Object({
      title: t.String(),
      templateId: t.Optional(t.String()),
      articleIds: t.Optional(t.Array(t.String())),
    })
  })
  .get('/:id', async ({ params: { id } }) => {
    const task = await db.select().from(tasks).where(eq(tasks.id, id)).get();
    if (!task) {
      throw new Error('Task not found');
    }
    
    // Get items
    const items = await db.select({
      id: taskItems.id,
      processedContent: taskItems.processedContent,
      isSelected: taskItems.isSelected,
      sortOrder: taskItems.sortOrder,
      article: articles,
    })
    .from(taskItems)
    .leftJoin(articles, eq(taskItems.articleId, articles.id))
    .where(eq(taskItems.taskId, id))
    .all();

    // Get all snapshots ordered by creation time (desc)
    const allSnapshots = await db.select()
        .from(snapshots)
        .where(eq(snapshots.taskId, id))
        .orderBy(desc(snapshots.createdAt))
        .all();
    
    return { ...task, items, snapshots: allSnapshots };
  })
  .post('/:id/generate', async ({ params: { id }, body }) => {
    const task = await db.select().from(tasks).where(eq(tasks.id, id)).get();
    if (!task) {
      throw new Error('Task not found');
    }

    let templateContent = "";
    let templatePrompt: string | undefined;
    
    // Use provided templateId or fallback to task's templateId
    const templateIdToUse = body.templateId || task.templateId;

    if (templateIdToUse) {
        const template = await db.select().from(templates).where(eq(templates.id, templateIdToUse)).get();
        if (template) {
            templateContent = template.contentPattern;
            templatePrompt = template.prompt ?? undefined;
        }
    }
    
    // Get selected articles
    const items = await db.select({
        article: articles
    })
    .from(taskItems)
    .innerJoin(articles, eq(taskItems.articleId, articles.id))
    .where(eq(taskItems.taskId, id))
    .all();

    const selectedArticles = items.map(i => i.article);

    console.log(`Generating draft for task ${id} with ${selectedArticles.length} articles`);
    
    // Trigger LangChain generation with extra prompt
    const content = await agentService.generateDraft(id, selectedArticles, templateContent, templatePrompt, body.extraPrompt);

    // Save as snapshot
    await db.insert(snapshots).values({
        taskId: id,
        content: typeof content === 'string' ? content : JSON.stringify(content),
        versionNote: body.extraPrompt ? `AI Generated with extra prompt: ${body.extraPrompt}` : 'AI Generated Draft',
    });

    // Update task status
    await db.update(tasks).set({ status: 'generated' }).where(eq(tasks.id, id));
    
    return { success: true, message: 'Generation completed', content };
  }, {
    body: t.Object({
      templateId: t.Optional(t.String()),
      extraPrompt: t.Optional(t.String()),
    })
  })
  .post('/:id/articles', async ({ params: { id }, body }) => {
    const task = await db.select().from(tasks).where(eq(tasks.id, id)).get();
    if (!task) {
      throw new Error('Task not found');
    }

    if (body.articleIds && body.articleIds.length > 0) {
      // Check for existing items to avoid duplicates
      const existingItems = await db.select()
        .from(taskItems)
        .where(eq(taskItems.taskId, id))
        .all();
      
      const existingArticleIds = new Set(existingItems.map(item => item.articleId));
      
      const newItems = body.articleIds
        .filter(aid => !existingArticleIds.has(aid))
        .map(articleId => ({
          taskId: id,
          articleId: articleId,
          isSelected: true,
        }));
      
      if (newItems.length > 0) {
        await db.insert(taskItems).values(newItems);
      }
    }
    
    return { success: true };
  }, {
    body: t.Object({
      articleIds: t.Array(t.String()),
    })
  })
  .delete('/:id/articles/:articleId', async ({ params: { id, articleId } }) => {
    await db.delete(taskItems)
      .where(and(eq(taskItems.taskId, id), eq(taskItems.articleId, articleId)));
    return { success: true };
  })
  .post('/:id/refine', async ({ params: { id }, body }) => {
    // AI Refine: Takes current content + instruction -> new content
    const task = await db.select().from(tasks).where(eq(tasks.id, id)).get();
    if (!task) {
      throw new Error('Task not found');
    }

    console.log(`Refining content for task ${id}`);
    
    // Call agent service to refine content
    const newContent = await agentService.refineContent(body.content, body.instruction);

    // Save as snapshot
    await db.insert(snapshots).values({
        taskId: id,
        content: typeof newContent === 'string' ? newContent : JSON.stringify(newContent),
        versionNote: `AI Refined: ${body.instruction}`,
    });

    return { success: true, content: newContent };
  }, {
    body: t.Object({
      content: t.String(),
      instruction: t.String(),
    })
  })
  .put('/:id/content', async ({ params: { id }, body }) => {
    // Update task content (create a new snapshot)
    const [newSnapshot] = await db.insert(snapshots).values({
      taskId: id,
      content: body.content,
      versionNote: body.note || 'Manual save',
    }).returning();
    
    return newSnapshot;
  }, {
    body: t.Object({
      content: t.String(),
      note: t.Optional(t.String()),
    })
  });
