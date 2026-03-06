CREATE TABLE `activities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reportId` int NOT NULL,
	`userId` int NOT NULL,
	`activityType` enum('calls','emails','whatsapp','in_person_visits','meetings_scheduled') NOT NULL,
	`target` int DEFAULT 0,
	`realized` int DEFAULT 0,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `confidence_levels` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reportId` int NOT NULL,
	`userId` int NOT NULL,
	`level` enum('very_confident','confident','moderately_confident','low_confidence','worried') NOT NULL,
	`reason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `confidence_levels_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `kpi_metrics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reportId` int NOT NULL,
	`userId` int NOT NULL,
	`metricName` varchar(100) NOT NULL,
	`target` decimal(15,2),
	`realized` decimal(15,2),
	`unit` varchar(20) DEFAULT 'number',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `kpi_metrics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lead_sources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reportId` int NOT NULL,
	`userId` int NOT NULL,
	`source` enum('referral','active_prospecting','inbound','networking','other') NOT NULL,
	`quantity` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `lead_sources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `objections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reportId` int NOT NULL,
	`userId` int NOT NULL,
	`objectionText` text NOT NULL,
	`frequency` int DEFAULT 1,
	`responseUsed` text,
	`worked` boolean,
	`needsHelp` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `objections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `operational_difficulties` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reportId` int NOT NULL,
	`userId` int NOT NULL,
	`difficultyType` enum('crm_issues','lack_of_materials','technical_doubts','contact_difficulties','schedule_issues','lack_of_support','other') NOT NULL,
	`description` text,
	`suggestedSolution` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `operational_difficulties_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `opportunities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`clientName` varchar(200) NOT NULL,
	`value` decimal(15,2),
	`productService` varchar(200),
	`stage` enum('prospecting','qualification','presentation','negotiation','closing','won','lost') NOT NULL DEFAULT 'prospecting',
	`probability` int DEFAULT 0,
	`forecastDate` date,
	`nextAction` text,
	`notes` text,
	`regionId` int,
	`productId` int,
	`status` enum('active','won','lost') NOT NULL DEFAULT 'active',
	`lostReason` enum('price_too_high','bought_from_competitor','wrong_timing','no_budget','no_response','other'),
	`lostReasonDetail` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `opportunities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`description` text,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `products_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `regions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`code` varchar(10),
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `regions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sales_funnel_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reportId` int NOT NULL,
	`userId` int NOT NULL,
	`stage` enum('prospecting','qualification','presentation','negotiation','closing') NOT NULL,
	`quantity` int DEFAULT 0,
	`totalValue` decimal(15,2) DEFAULT '0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sales_funnel_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `strategic_actions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`actionName` varchar(300) NOT NULL,
	`startDate` date,
	`description` text,
	`completed` boolean NOT NULL DEFAULT false,
	`resultYtd` text,
	`difficulty` text,
	`accelerationTips` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `strategic_actions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `weekly_actions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reportId` int NOT NULL,
	`userId` int NOT NULL,
	`priority` int DEFAULT 1,
	`actionDescription` text NOT NULL,
	`deadline` date,
	`status` enum('pending','in_progress','done','cancelled') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `weekly_actions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `weekly_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reportId` int NOT NULL,
	`userId` int NOT NULL,
	`metricName` varchar(100) NOT NULL,
	`target` decimal(15,2),
	`howToAchieve` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `weekly_plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `weekly_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`weekStart` date NOT NULL,
	`weekEnd` date NOT NULL,
	`highlights` text,
	`challenges` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `weekly_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `weekly_support` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reportId` int NOT NULL,
	`userId` int NOT NULL,
	`supportType` enum('client_meeting','complex_negotiation','proposal_review','strategy_discussion','training','other') NOT NULL,
	`details` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `weekly_support_id` PRIMARY KEY(`id`)
);
