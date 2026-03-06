CREATE TABLE `grid_columns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`templateId` int NOT NULL,
	`organizationId` int NOT NULL,
	`name` varchar(200) NOT NULL,
	`columnType` enum('text','number','select','date','checkbox','formula') NOT NULL DEFAULT 'text',
	`selectOptions` text,
	`formulaType` enum('sum','average','percentage','weighted_average','weighted_sum','count','max','min','custom'),
	`formulaSourceColumns` text,
	`formulaWeightColumn` int,
	`formulaBase` varchar(100),
	`width` int DEFAULT 150,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isEditable` boolean NOT NULL DEFAULT true,
	`showInDashboard` boolean NOT NULL DEFAULT false,
	`accentColor` varchar(20),
	`unit` varchar(20),
	`required` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `grid_columns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `grid_rows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`templateId` int NOT NULL,
	`organizationId` int NOT NULL,
	`userId` int NOT NULL,
	`rowOrder` int NOT NULL DEFAULT 0,
	`data` text NOT NULL DEFAULT ('{}'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `grid_rows_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `grid_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`name` varchar(200) NOT NULL DEFAULT 'Planejamento',
	`description` text,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `grid_templates_id` PRIMARY KEY(`id`)
);
