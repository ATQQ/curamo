ALTER TABLE `sources` ADD `last_synced_at` integer;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_articles` (
	`id` text PRIMARY KEY,
	`source_id` text,
	`title` text NOT NULL,
	`url` text NOT NULL UNIQUE,
	`content` text,
	`raw_content` text,
	`published_at` integer,
	`ai_summary` text,
	`tags` text,
	`category` text,
	`status` text DEFAULT 'unread',
	CONSTRAINT `articles_source_id_sources_id_fk` FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`)
);
--> statement-breakpoint
INSERT INTO `__new_articles`(`id`, `source_id`, `title`, `url`, `content`, `raw_content`, `published_at`, `ai_summary`, `tags`, `category`, `status`) SELECT `id`, `source_id`, `title`, `url`, `content`, `raw_content`, `published_at`, `ai_summary`, `tags`, `category`, `status` FROM `articles`;--> statement-breakpoint
DROP TABLE `articles`;--> statement-breakpoint
ALTER TABLE `__new_articles` RENAME TO `articles`;--> statement-breakpoint
PRAGMA foreign_keys=ON;