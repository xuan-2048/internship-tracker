CREATE TABLE `applications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_id` text NOT NULL,
	`company` text NOT NULL,
	`role` text NOT NULL,
	`url` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'saved' NOT NULL,
	`applied_date` text DEFAULT '' NOT NULL,
	`deadline` text DEFAULT '' NOT NULL,
	`next_step` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`next_step_due_date` text DEFAULT '' NOT NULL,
	`next_step_done` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `applications_owner_idx` ON `applications` (`owner_id`);