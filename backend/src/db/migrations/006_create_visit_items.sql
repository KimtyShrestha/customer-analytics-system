CREATE TABLE visit_items (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    visit_id     BIGINT        NOT NULL,
    product_name VARCHAR(255)  NOT NULL,
    quantity     INTEGER       NOT NULL,
    unit_price   NUMERIC(12,2) NOT NULL,
    line_total   NUMERIC(12,2) NOT NULL,
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_visit_items_visit
        FOREIGN KEY (visit_id) REFERENCES visits (id) ON DELETE CASCADE,
    CONSTRAINT chk_visit_items_quantity
        CHECK (quantity > 0),
    CONSTRAINT chk_visit_items_prices
        CHECK (unit_price >= 0 AND line_total >= 0)
);

CREATE INDEX idx_visit_items_visit ON visit_items (visit_id);