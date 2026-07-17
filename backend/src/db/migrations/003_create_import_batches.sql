-- ============================================================
-- Migration: 003_create_import_batches
-- Purpose  : One row per CSV upload attempt. file_checksum
--            enforces duplicate-import prevention (§36).
-- ============================================================

CREATE TABLE import_batches (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    original_filename VARCHAR(255) NOT NULL,
    file_checksum     CHAR(64)     NOT NULL,
    imported_by       BIGINT       NOT NULL,
    branch_id         BIGINT       NOT NULL,
    status            VARCHAR(20)  NOT NULL DEFAULT 'processing',
    total_rows        INTEGER      NOT NULL DEFAULT 0,
    successful_rows   INTEGER      NOT NULL DEFAULT 0,
    rejected_rows     INTEGER      NOT NULL DEFAULT 0,
    total_invoices    INTEGER      NOT NULL DEFAULT 0,
    error_summary     JSONB,
    started_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    completed_at      TIMESTAMPTZ,

    CONSTRAINT fk_import_batches_user
        FOREIGN KEY (imported_by) REFERENCES users (id),
    CONSTRAINT fk_import_batches_branch
        FOREIGN KEY (branch_id) REFERENCES branches (id),
    CONSTRAINT uq_import_batches_checksum
        UNIQUE (file_checksum),
    CONSTRAINT chk_import_batches_status
        CHECK (status IN ('processing', 'completed', 'failed')),
    CONSTRAINT chk_import_batches_counts
        CHECK (total_rows >= 0 AND successful_rows >= 0 AND rejected_rows >= 0)
);

CREATE INDEX idx_import_batches_started ON import_batches (started_at DESC);