CREATE TABLE `users` (
  `id` integer PRIMARY KEY,
  `theme` varchar(255),
  `pfp` varchar(255),
  `human` bool,
  `pseudo` varchar(255),
  `last_login` timestamp,
  `created_at` timestamp
);

CREATE TABLE `authentication` (
  `id` integer PRIMARY KEY,
  `user_id` integer,
  `email` varchar(255),
  `password` varchar(255),
  `JWT_token` varchar(255),
  `jwt_expiration_date` date,
  `jwt_deprecation` bool
);

CREATE TABLE `matches` (
  `id` integer PRIMARY KEY,
  `player_1` integer,
  `player_2` integer,
  `completed` bool DEFAULT false,
  `duration` timestamp,
  `timeout` bool,
  `tournament_id` integer,
  `created_at` timestamp
);

CREATE TABLE `goal` (
  `id` integer PRIMARY KEY,
  `match_id` integer,
  `player` integer,
  `duration` timestamp,
  `created_at` timestamp
);

CREATE TABLE `friends` (
  `id` integer PRIMARY KEY,
  `user_1` integer,
  `user_2` integer,
  `status` varchar(255),
  `created_at` timestamp
);

CREATE TABLE `messages` (
  `id` integer PRIMARY KEY,
  `sender_id` integer,
  `receiver_id` integer,
  `content` text,
  `is_read` bool DEFAULT false,
  `created_at` timestamp
);

ALTER TABLE `matches` ADD FOREIGN KEY (`player_1`) REFERENCES `users` (`id`);

ALTER TABLE `matches` ADD FOREIGN KEY (`player_2`) REFERENCES `users` (`id`);

ALTER TABLE `matches` ADD FOREIGN KEY (`id`) REFERENCES `goal` (`match_id`);

ALTER TABLE `users` ADD FOREIGN KEY (`id`) REFERENCES `goal` (`player`);

ALTER TABLE `friends` ADD FOREIGN KEY (`id`) REFERENCES `users` (`id`);

ALTER TABLE `friends` ADD FOREIGN KEY (`user_1`) REFERENCES `users` (`id`);

ALTER TABLE `friends` ADD FOREIGN KEY (`user_2`) REFERENCES `users` (`id`);

ALTER TABLE `messages` ADD FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`);

ALTER TABLE `messages` ADD FOREIGN KEY (`receiver_id`) REFERENCES `users` (`id`);
