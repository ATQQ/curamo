CREATE TABLE `articles` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text,
	`title` text NOT NULL,
	`url` text NOT NULL,
	`content` text,
	`raw_content` text,
	`published_at` integer,
	`ai_summary` text,
	`tags` text,
	`category` text,
	`status` text DEFAULT 'unread',
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text,
	`content` text,
	`version_note` text,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sources` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`url` text NOT NULL,
	`type` text DEFAULT 'rss' NOT NULL,
	`config` text,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `task_items` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text,
	`article_id` text,
	`processed_content` text,
	`is_selected` integer DEFAULT false,
	`sort_order` integer DEFAULT 0,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`template_id` text,
	`status` text DEFAULT 'draft',
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`template_id`) REFERENCES `templates`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `templates` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`content_pattern` text NOT NULL
);
