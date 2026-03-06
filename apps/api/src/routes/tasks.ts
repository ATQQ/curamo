import { Elysia, t } from 'elysia';
import { db } from '../db';
import { tasks, taskItems, articles, snapshots, templates } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
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

    // Get latest snapshot
    const latestSnapshot = await db.select()
        .from(snapshots)
        .where(eq(snapshots.taskId, id))
        .orderBy(desc(snapshots.createdAt))
        .limit(1)
        .get();
    
    return { ...task, items, latestSnapshot };
  })
  .post('/:id/generate', async ({ params: { id } }) => {
    const task = await db.select().from(tasks).where(eq(tasks.id, id)).get();
    if (!task) {
      throw new Error('Task not found');
    }

    let templateContent = "";
    let templatePrompt: string | undefined;
    if (task.templateId) {
        const template = await db.select().from(templates).where(eq(templates.id, task.templateId)).get();
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
    
    // Trigger LangChain generation
    const content = await agentService.generateDraft(id, selectedArticles, templateContent, templatePrompt);

    // Save as snapshot
    await db.insert(snapshots).values({
        taskId: id,
        content: typeof content === 'string' ? content : JSON.stringify(content),
        versionNote: 'AI Generated Draft',
    });

    // Update task status
    await db.update(tasks).set({ status: 'generated' }).where(eq(tasks.id, id));
    
    return { success: true, message: 'Generation completed', content };
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
