-- ============================================================
-- Migration: 002_create_branches
-- Purpose  : Store location. Single-store case study; one row
--            seeded. Retained for structural clarity (§5).
-- ============================================================

CREATE TABLE branches (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    branch_name VARCHAR(120) NOT NULL,
    location    VARCHAR(255),
    status      VARCHAR(20)  NOT NULL DEFAULT 'active',
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_branches_name   UNIQUE (branch_name),
    CONSTRAINT chk_branches_status CHECK (status IN ('active', 'inactive'))
);

-- Seed the single case-study store
INSERT INTO branches (branch_name, location)
VALUES ('Main Store', 'Kathmandu Valley');

-- Verify: must return 1 row, id = 1, status = 'active'
SELECT * FROM branches;