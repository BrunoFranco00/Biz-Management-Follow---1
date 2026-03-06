CREATE TABLE `deals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`clientName` varchar(200) NOT NULL,
	`regionId` int,
	`productId` int,
	`productService` varchar(200),
	`expectedValue` decimal(15,2),
	`finalValue` decimal(15,2),
	`startDate` date NOT NULL,
	`endDate` date,
	`status` enum('prospecting','in_progress','won','lost') NOT NULL DEFAULT 'prospecting',
	`lostReason` text,
	`notes` text,
	`nextAction` text,
	`contactName` varchar(200),
	`contactPhone` varchar(30),
	`contactEmail` varchar(320),
	`priority` enum('low','medium','high') NOT NULL DEFAULT 'medium',
	`probability` int DEFAULT 50,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `deals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `system_labels` (
	`id` int AUTO_INCREMENT NOT NULL,
	`labelKey` varchar(100) NOT NULL,
	`labelValue` varchar(200) NOT NULL,
	`category` varchar(50) NOT NULL,
	`description` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `system_labels_id` PRIMARY KEY(`id`),
	CONSTRAINT `system_labels_labelKey_unique` UNIQUE(`labelKey`)
);
--> statement-breakpoint
CREATE TABLE `weekly_checkins` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`reportId` int NOT NULL,
	`performanceScore` int,
	`weekHighlight` text,
	`biggestChallenge` text,
	`nextWeekFocus` text,
	`moodLevel` enum('excellent','good','neutral','difficult','very_difficult') DEFAULT 'good',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `weekly_checkins_id` PRIMARY KEY(`id`)
);
