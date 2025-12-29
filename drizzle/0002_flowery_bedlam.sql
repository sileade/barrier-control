CREATE TABLE `blacklist` (
	`id` int AUTO_INCREMENT NOT NULL,
	`licensePlate` varchar(20) NOT NULL,
	`reason` text,
	`severity` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
	`ownerName` varchar(255),
	`vehicleModel` varchar(100),
	`vehicleColor` varchar(50),
	`isActive` boolean NOT NULL DEFAULT true,
	`notifyOnDetection` boolean NOT NULL DEFAULT true,
	`attemptCount` int NOT NULL DEFAULT 0,
	`lastAttempt` timestamp,
	`addedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`expiresAt` timestamp,
	CONSTRAINT `blacklist_id` PRIMARY KEY(`id`),
	CONSTRAINT `blacklist_licensePlate_unique` UNIQUE(`licensePlate`)
);
