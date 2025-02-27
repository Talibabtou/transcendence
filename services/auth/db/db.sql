-- sqlite3

CREATE TABLE `auth` (
  `id` integer PRIMARY KEY,
  `username` integer,
  `email` varchar(255),
  `password` varchar
);

CREATE TABLE `jwt` (
  `id` integer PRIMARY KEY,
  `JWT_token` varchar(255),
  `jwt_expiration_date` date,
  `jwt_deprecation` bool
);