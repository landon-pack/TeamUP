ALTER TABLE `users` ADD `first_name` text;
--> statement-breakpoint
ALTER TABLE `users` ADD `last_name` text;
--> statement-breakpoint
UPDATE `users`
SET
  `first_name` = trim(substr(`name`, 1, instr(`name` || ' ', ' ') - 1)),
  `last_name` = trim(substr(`name`, instr(`name` || ' ', ' ') + 1))
WHERE `name` IS NOT NULL AND length(trim(`name`)) > 0;
