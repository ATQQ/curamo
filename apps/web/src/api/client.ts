import { treaty } from '@elysiajs/eden'
import type { App } from '../../../api/src'

// Temporary workaround until we setup proper type sharing
const client = treaty<App>('http://localhost:3000')

export default client
