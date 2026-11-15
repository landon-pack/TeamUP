ALTER TABLE `account_activity` ADD `stretch_seen` text DEFAULT '' NOT NULL;
--> statement-breakpoint
UPDATE `account_activity` SET `stretch_seen` = `last_seen` WHERE `stretch_seen` = '';
