-- =========================================================================
-- PostgreSQL / TimescaleDB DDL for Real-Time Airfare Price Index (APIx)
-- =========================================================================

-- Optional: Enable TimescaleDB extension if available
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

DROP TABLE IF EXISTS airfare_observations CASCADE;

CREATE TABLE airfare_observations (
    id BIGSERIAL,
    observation_date DATE NOT NULL,
    observation_timestamp TIMESTAMPTZ NOT NULL,
    departure_date DATE NOT NULL,
    departure_time TIME NOT NULL,
    arrival_time TIME NOT NULL,
    duration_minutes INT DEFAULT 120,

    origin VARCHAR(3) NOT NULL,
    destination VARCHAR(3) NOT NULL,
    route_code VARCHAR(7) NOT NULL,

    airline_code VARCHAR(5) NOT NULL,
    airline_name VARCHAR(50) NOT NULL,
    flight_number VARCHAR(20) NOT NULL,

    cabin VARCHAR(20) DEFAULT 'Economy',
    fare_type VARCHAR(50) DEFAULT 'Economy/basic',
    stops INT DEFAULT 0,
    is_nonstop BOOLEAN DEFAULT TRUE,

    -- Price Components in INR
    base_fare NUMERIC(10, 2) NOT NULL,
    fuel_surcharge_yq NUMERIC(10, 2) DEFAULT 0.0,
    user_development_fee_udf NUMERIC(10, 2) DEFAULT 0.0,
    passenger_service_fee_psf NUMERIC(10, 2) DEFAULT 0.0,
    gst NUMERIC(10, 2) DEFAULT 0.0,
    convenience_fee NUMERIC(10, 2) DEFAULT 0.0,
    total_taxes_fees NUMERIC(10, 2) NOT NULL,
    total_fare NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',

    advance_days INT NOT NULL,
    data_source VARCHAR(50) NOT NULL,
    availability VARCHAR(30) DEFAULT 'Available',
    created_at TIMESTAMPTZ DEFAULT NOW(),

    PRIMARY KEY (id, observation_timestamp)
);

-- Convert to hypertable partitioned by observation_timestamp (1 day chunk interval)
SELECT create_hypertable('airfare_observations', 'observation_timestamp', chunk_time_interval => INTERVAL '1 day', if_not_exists => TRUE);

-- High-performance composite indexes for CPI basket queries
CREATE INDEX idx_airfare_cpi_basket ON airfare_observations (route_code, advance_days, departure_date, observation_date);
CREATE INDEX idx_airfare_source_date ON airfare_observations (data_source, observation_date);
CREATE INDEX idx_airfare_carrier ON airfare_observations (airline_code, route_code);
