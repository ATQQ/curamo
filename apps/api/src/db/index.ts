import { drizzle } from 'drizzle-orm/tursodatabase/database';
import * as schema from './schema';

const db = drizzle(process.env.DB_FILE_NAME!, { schema });

export { db };
