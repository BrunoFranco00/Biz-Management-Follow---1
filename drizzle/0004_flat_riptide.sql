CREATE TABLE `org_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orgUserId` int NOT NULL,
	`organizationId` int NOT NULL,
	`token` varchar(255) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `org_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `org_sessions_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `org_users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`slot` int NOT NULL,
	`username` varchar(50) NOT NULL,
	`passwordHash` varchar(255) NOT NULL,
	`displayName` varchar(100),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp,
	CONSTRAINT `org_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `org_users_username_unique` UNIQUE(`username`)
);
