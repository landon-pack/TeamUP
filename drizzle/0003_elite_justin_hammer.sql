CREATE TABLE `availability` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`project_id` text NOT NULL,
	`start_at` text NOT NULL,
	`end_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `availability_slot` ON `availability` (`project_id`,`user_id`,`start_at`);--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`user_id` text NOT NULL,
	`created_at` text NOT NULL,
	`lock_id` text,
	`locked_until` integer DEFAULT 0 NOT NULL,
	`legacy_imported` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `conversation_project_user` ON `conversations` (`project_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `group_members` (
	`group_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	PRIMARY KEY(`group_id`, `user_id`),
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `group_members_user` ON `group_members` (`user_id`);--> statement-breakpoint
CREATE TABLE `groups` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ai_messaging` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation_id` text NOT NULL,
	`role` text NOT NULL,
	`contents` text NOT NULL,
	`created_at` text NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `message_conversation_position` ON `ai_messaging` (`conversation_id`,`position`);--> statement-breakpoint
CREATE TABLE `milestones` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`due_date` text NOT NULL,
	`status` text DEFAULT 'todo' NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `milestone_project_id` ON `milestones` (`project_id`,`id`);--> statement-breakpoint
CREATE TABLE `settings` (
	`user_id` text PRIMARY KEY NOT NULL,
	`language` text DEFAULT 'en' NOT NULL,
	`time_zone` text DEFAULT 'UTC' NOT NULL,
	`notifications` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`assigned_user_id` text,
	`milestone_id` text,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`due_date` text NOT NULL,
	`status` text DEFAULT 'todo' NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assigned_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`,`milestone_id`) REFERENCES `milestones`(`project_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `task_project` ON `tasks` (`project_id`);--> statement-breakpoint
CREATE INDEX `task_assignee` ON `tasks` (`assigned_user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`auth_id` text,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`address` text,
	`phone` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_auth` ON `users` (`auth_id`);--> statement-breakpoint
ALTER TABLE `files` ADD `uploaded_by` text REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `files` ADD `storage_key` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `group_id` text REFERENCES groups(id);--> statement-breakpoint
ALTER TABLE `projects` ADD `title` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `description` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `course` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `deadline` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `reminder_hours` integer DEFAULT 24 NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `normalized` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `write_token` text;