-- ============================================================
-- Migration: 004_create_customers
-- Purpose  : Pseudonymous customer records. Identity is the
--            HMAC-SHA-256 of the normalised phone number.
--            NO RAW PHONE NUMBER IS EVER STORED HERE (§13).
-- ============================================================

CREATE TABLE customers (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_hash   CHAR(64)     NOT NULL,
    first_seen_at   DATE         NOT NULL,
    last_seen_at    DATE         NOT NULL,
    current_segment VARCHAR(20),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_customers_hash
        UNIQUE (customer_hash),
    CONSTRAINT chk_customers_hash_format
        CHECK (customer_hash ~ '^[0-9a-f]{64}$'),
    CONSTRAINT chk_customers_segment
        CHECK (current_segment IN ('new','repeat','occasional','at_risk','dormant')),
    CONSTRAINT chk_customers_dates
        CHECK (last_seen_at >= first_seen_at)
);

CREATE INDEX idx_customers_segment   ON customers (current_segment);
CREATE INDEX idx_customers_last_seen ON customers (last_seen_at);