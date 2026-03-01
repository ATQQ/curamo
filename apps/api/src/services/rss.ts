import Parser from 'rss-parser';
import { db } from '../db';
import { articles, sources } from '../db/schema';
import { sql, eq } from 'drizzle-orm';

const parser = new Parser();

export async function syncSource(source: any) {
    try {
        console.log(`Starting sync for source: ${source.name}`);
        if (source.type === 'rss') {
            const feed = await parser.parseURL(source.url);
            console.log(`Fetched ${feed.items.length} items from ${source.name}`);
            
            let newCount = 0;
            for (const item of feed.items) {
                if (!item.link || !item.title) continue;

                // Simple check to avoid duplicates if unique constraint fails or just rely on it
                // Using onConflictDoNothing
                try {
                    const result = await db.insert(articles).values({
                        sourceId: source.id,
                        title: item.title,
                        url: item.link,
                        content: item.content || item.contentSnippet || '',
                        publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
                        status: 'unread'
                    }).onConflictDoNothing().returning();
                    
                    if (result.length > 0) {
                        newCount++;
                    }
                } catch (e) {
                    console.error(`Failed to insert article ${item.title}:`, e);
                }
            }
            
            // Update lastSyncedAt
            await db.update(sources)
                .set({ lastSyncedAt: new Date() })
                .where(eq(sources.id, source.id));

            console.log(`Synced ${source.name}: ${newCount} new articles.`);
            return { success: true, newArticles: newCount };
        }
        return { success: false, message: 'Unsupported source type' };
    } catch (err) {
        console.error(`Error syncing source ${source.name}:`, err);
        throw err;
    }
}
