import { Elysia } from 'elysia';
import { sourcesRoutes } from './sources';
import { articlesRoutes } from './articles';
import { tasksRoutes } from './tasks';
import { settingsRoutes } from './settings';

export const routes = new Elysia()
  .use(sourcesRoutes)
  .use(articlesRoutes)
  .use(tasksRoutes)
  .use(settingsRoutes);
