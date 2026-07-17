-- ============================================================
-- Migration: 001_create_users
-- Purpose  : System user accounts (admin and staff).
--            Not customers - customers are pseudonymous and
--            never authenticate against this system.
-- Project  : Customer Behaviour Analytics and Segmentation System
-- ============================================================

CREATE TABLE users (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    full_name       VARCHAR(120)  NOT NULL,
    email           VARCHAR(255)  NOT NULL,
    password_hash   VARCHAR(255)  NOT NULL,
    role            VARCHAR(20)   NOT NULL,
    status          VARCHAR(20)   NOT NULL DEFAULT 'active',
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_users_email        UNIQUE (email),
    CONSTRAINT chk_users_role        CHECK (role IN ('admin', 'staff')),
    CONSTRAINT chk_users_status      CHECK (status IN ('active', 'inactive')),
    CONSTRAINT chk_users_email_shape CHECK (email = LOWER(email) AND POSITION('@' IN email) > 1)
);

CREATE INDEX idx_users_role ON users (role);