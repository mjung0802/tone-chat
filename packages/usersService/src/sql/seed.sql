CREATE DATABASE users_service;

\c users_service;

CREATE TABLE
  users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    username VARCHAR(32) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
  );

INSERT INTO users (username, email, password) VALUES
  ('testuser', 'testuser@example.com', 'password123');