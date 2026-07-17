CREATE TABLE segmentation_settings (
    id                         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    repeat_frequency_threshold INTEGER NOT NULL DEFAULT 2,
    new_customer_days          INTEGER NOT NULL DEFAULT 90,
    at_risk_days_threshold     INTEGER NOT NULL DEFAULT 120,
    dormant_days_threshold     INTEGER NOT NULL DEFAULT 180,
    updated_by                 BIGINT,
    updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_segmentation_user
        FOREIGN KEY (updated_by) REFERENCES users (id),
    CONSTRAINT chk_segmentation_repeat
        CHECK (repeat_frequency_threshold >= 2),
    CONSTRAINT chk_segmentation_ordering
        CHECK (at_risk_days_threshold < dormant_days_threshold),
    CONSTRAINT chk_segmentation_singleton
        CHECK (id = 1)
);

INSERT INTO segmentation_settings DEFAULT VALUES;