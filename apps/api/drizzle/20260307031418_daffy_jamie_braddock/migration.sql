CREATE TABLE `async_tasks` (
	`id` text PRIMARY KEY,
	`type` text NOT NULL,
	`status` text DEFAULT 'pending',
	`payload` text,
	`result` text,
	`error` text,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY,
	`value` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `articles` ADD `translated_title` text;--> statement-breakpoint
ALTER TABLE `templates` ADD `prompt` text;