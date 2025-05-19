CREATE TABLE IF NOT EXISTS users (
	id TEXT PRIMARY KEY DEFAULT (
			lower(hex(randomblob(4))) || '-' || 
			lower(hex(randomblob(2))) || '-' || 
			lower(hex(randomblob(2))) || '-' || 
			lower(hex(randomblob(2))) || '-' || 
			lower(hex(randomblob(6)))
	), -- Standard UUID format
	role VARCHAR(5) NOT NULL,
	username VARCHAR(20) NOT NULL UNIQUE,
	email VARCHAR(255) NOT NULL UNIQUE,
	password VARCHAR(255) NOT NULL,
	two_factor_enabled BOOLEAN NOT NULL DEFAULT 0,
	two_factor_secret TEXT,
	verified BOOLEAN NOT NULL DEFAULT 0,
	last_ip VARCHAR(255),
	last_login DATETIME NULL,
	updated_at DATETIME NULL,
	created_at DATETIME DEFAULT CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO users (role, username, password, email, created_at)
	VALUES ("admin", "ia", "ia", "ia@ia.com", CURRENT_TIMESTAMP);
