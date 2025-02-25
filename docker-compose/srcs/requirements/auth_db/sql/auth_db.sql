-- sqlite

CREATE TABLE `auth` (  `id` integer PRIMARY KEY,  `pseudo` varchar(255),  `email` varchar(255),  `password` varchar(255));

CREATE TABLE `jwt` (  `id` integer PRIMARY KEY,    `JWT_token` varchar(255),  `jwt_expiration_date` date,  `jwt_deprecation` bool);

