CREATE TABLE `organization_invites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`email` varchar(320) NOT NULL,
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`token` varchar(128) NOT NULL,
	`accepted` boolean NOT NULL DEFAULT false,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `organization_invites_id` PRIMARY KEY(`id`),
	CONSTRAINT `organization_invites_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`segment` enum('aesthetics_clinic','agribusiness','generic','real_estate','tech','retail','healthcare','education') NOT NULL DEFAULT 'generic',
	`logoUrl` text,
	`active` boolean NOT NULL DEFAULT true,
	`maxUsers` int NOT NULL DEFAULT 10,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organizations_id` PRIMARY KEY(`id`),
	CONSTRAINT `organizations_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
ALTER TABLE `system_labels` DROP INDEX `system_labels_labelKey_unique`;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','super_admin') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `activities` ADD `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `confidence_levels` ADD `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `deals` ADD `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `kpi_metrics` ADD `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `lead_sources` ADD `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `objections` ADD `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `operational_difficulties` ADD `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `opportunities` ADD `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `price` decimal(15,2);--> statement-breakpoint
ALTER TABLE `regions` ADD `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `sales_funnel_entries` ADD `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `strategic_actions` ADD `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `system_labels` ADD `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `organizationId` int;--> statement-breakpoint
ALTER TABLE `users` ADD `active` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `weekly_actions` ADD `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `weekly_checkins` ADD `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `weekly_plans` ADD `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `weekly_reports` ADD `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `weekly_support` ADD `organizationId` int NOT NULL;