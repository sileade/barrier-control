CREATE TABLE `pendingNotifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` enum('unknown_vehicle','blacklist_detected','manual_open','unauthorized_access') NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`licensePlate` varchar(20),
	`photoUrl` text,
	`severity` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
	`isSent` boolean NOT NULL DEFAULT false,
	`sentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pendingNotifications_id` PRIMARY KEY(`id`)
);
