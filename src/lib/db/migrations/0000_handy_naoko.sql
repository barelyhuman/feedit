CREATE TABLE `bookmarks` (
	`feed_id` text NOT NULL,
	`item_id` text NOT NULL,
	PRIMARY KEY(`feed_id`, `item_id`),
	FOREIGN KEY (`feed_id`) REFERENCES `feeds`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `feed_items` (
	`id` text PRIMARY KEY NOT NULL,
	`feed_id` text NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`link` text DEFAULT '' NOT NULL,
	`published` text,
	`unread` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`feed_id`) REFERENCES `feeds`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `feeds` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`feed_url` text NOT NULL,
	`link` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `feeds_feed_url_unique` ON `feeds` (`feed_url`);