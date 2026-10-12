CREATE TABLE `file_cleanup` (
	`storage_key` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `settings` ADD `tutorial_seen` integer DEFAULT 0 NOT NULL;