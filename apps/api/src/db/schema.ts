import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const sources = sqliteTable('sources', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  url: text('url').notNull(),
  type: text('type', { enum: ['rss', 'manual'] }).notNull().default('rss'),
  config: text('config', { mode: 'json' }), // JSON stored as text
  lastSyncedAt: integer('last_synced_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

export const asyncTasks = sqliteTable('async_tasks', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  type: text('type').notNull(), // 'summarize', 'translate', etc.
  status: text('status', { enum: ['pending', 'processing', 'completed', 'failed'] }).default('pending'),
  payload: text('payload', { mode: 'json' }), // JSON stored as text
  result: text('result', { mode: 'json' }), // JSON stored as text
  error: text('error'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export const articles = sqliteTable('articles', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  sourceId: text('source_id').references(() => sources.id),
  title: text('title').notNull(),
  url: text('url').notNull().unique(), // Added unique constraint
  content: text('content'),
  rawContent: text('raw_content'),
  publishedAt: integer('published_at', { mode: 'timestamp' }),
  aiSummary: text('ai_summary'),
  translatedTitle: text('translated_title'),
  tags: text('tags', { mode: 'json' }),
  category: text('category'),
  status: text('status', { enum: ['unread', 'read', 'archived'] }).default('unread'),
});

export const templates = sqliteTable('templates', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  contentPattern: text('content_pattern').notNull(),
  prompt: text('prompt'),
});

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text('title').notNull(),
  templateId: text('template_id').references(() => templates.id),
  status: text('status', { enum: ['draft', 'generated', 'published'] }).default('draft'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

export const taskItems = sqliteTable('task_items', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  taskId: text('task_id').references(() => tasks.id),
  articleId: text('article_id').references(() => articles.id),
  processedContent: text('processed_content'),
  isSelected: integer('is_selected', { mode: 'boolean' }).default(false),
  sortOrder: integer('sort_order').default(0),
});

export const snapshots = sqliteTable('snapshots', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  taskId: text('task_id').references(() => tasks.id),
  content: text('content'),
  versionNote: text('version_note'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});
