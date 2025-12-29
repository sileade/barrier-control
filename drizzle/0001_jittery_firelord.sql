CREATE TABLE `barrierActions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`action` enum('open','close','error') NOT NULL,
	`triggeredBy` enum('auto','manual','api') NOT NULL,
	`userId` int,
	`passageId` int,
	`success` boolean NOT NULL DEFAULT true,
	`errorMessage` text,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `barrierActions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `medicalRecords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`licensePlate` varchar(20) NOT NULL,
	`driverName` varchar(255) NOT NULL,
	`driverPhone` varchar(50),
	`medicalStatus` enum('valid','expired','suspended','unknown') NOT NULL DEFAULT 'unknown',
	`expirationDate` timestamp,
	`lastCheckDate` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `medicalRecords_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `passages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`licensePlate` varchar(20) NOT NULL,
	`photoUrl` text,
	`recognizedPlate` varchar(20),
	`confidence` int,
	`isAllowed` boolean NOT NULL DEFAULT false,
	`wasManualOpen` boolean NOT NULL DEFAULT false,
	`barrierOpened` boolean NOT NULL DEFAULT false,
	`vehicleId` int,
	`openedBy` int,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	`notes` text,
	CONSTRAINT `passages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(100) NOT NULL,
	`value` text,
	`description` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `settings_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `vehicles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`licensePlate` varchar(20) NOT NULL,
	`ownerName` varchar(255),
	`ownerPhone` varchar(50),
	`vehicleModel` varchar(100),
	`vehicleColor` varchar(50),
	`notes` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	CONSTRAINT `vehicles_id` PRIMARY KEY(`id`),
	CONSTRAINT `vehicles_licensePlate_unique` UNIQUE(`licensePlate`)
);
