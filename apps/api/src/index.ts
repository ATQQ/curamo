import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { swagger } from '@elysiajs/swagger'
import { routes } from './routes'

const app = new Elysia()
  .use(cors())
  .use(swagger())
  .use(routes)
  .get('/', () => 'Hello Curamo API')
  .listen(3000)

console.log(
  `🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`
)

export type App = typeof app
