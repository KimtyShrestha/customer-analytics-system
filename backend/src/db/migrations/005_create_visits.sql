-- ============================================================
-- Migration: 005_create_visits
-- Purpose  : One row per invoice. Line items from the IMS export
--            are aggregated into a single visit record (§17).
-- ============================================================

CREATE TABLE visits (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_id     BIGINT        NOT NULL,
    branch_id       BIGINT        NOT NULL,
    import_batch_id BIGINT        NOT NULL,
    invoice_number  VARCHAR(60)   NOT NULL,
    visit_date      DATE          NOT NULL,
    visit_time      TIME,
    invoice_total   NUMERIC(12,2) NOT NULL,
    payment_method  VARCHAR(30),
    cashier         VARCHAR(120),
    total_quantity  INTEGER       NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_visits_customer
        FOREIGN KEY (customer_id) REFERENCES customers (id),
    CONSTRAINT fk_visits_branch
        FOREIGN KEY (branch_id) REFERENCES branches (id),
    CONSTRAINT fk_visits_import_batch
        FOREIGN KEY (import_batch_id) REFERENCES import_batches (id),
    CONSTRAINT uq_visits_invoice_branch
        UNIQUE (branch_id, invoice_number),
    CONSTRAINT chk_visits_total_nonneg
        CHECK (invoice_total >= 0),
    CONSTRAINT chk_visits_quantity_nonneg
        CHECK (total_quantity >= 0)
);

CREATE INDEX idx_visits_customer  ON visits (customer_id);
CREATE INDEX idx_visits_date      ON visits (visit_date);
CREATE INDEX idx_visits_cust_date ON visits (customer_id, visit_date DESC);