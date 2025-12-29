CREATE TABLE `notificationHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` enum('unknown_vehicle','blacklist_detected','manual_open','unauthorized_access','daily_summary','quiet_hours_summary') NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`licensePlate` varchar(20),
	`photoUrl` text,
	`severity` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
	`channel` enum('email','telegram','both') NOT NULL DEFAULT 'email',
	`status` enum('sent','failed','pending') NOT NULL DEFAULT 'pending',
	`errorMessage` text,
	`retryCount` int NOT NULL DEFAULT 0,
	`lastRetryAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`sentAt` timestamp,
	CONSTRAINT `notificationHistory_id` PRIMARY KEY(`id`)
);
