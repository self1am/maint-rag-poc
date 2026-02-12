CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS sites (
    site_id TEXT PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS equipment (
    equipment_uid TEXT PRIMARY KEY,
    site_id TEXT NOT NULL REFERENCES sites(site_id),
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS employees (
    employee_id TEXT PRIMARY KEY,
    site_id TEXT NOT NULL REFERENCES sites(site_id),
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS employee_certs (
    employee_id TEXT NOT NULL REFERENCES employees(employee_id),
    cert TEXT NOT NULL,
    PRIMARY KEY (employee_id, cert)
);

CREATE TABLE IF NOT EXISTS maintenance_schedule (
    schedule_id SERIAL PRIMARY KEY,
    site_id TEXT NOT NULL REFERENCES sites(site_id),
    equipment_uid TEXT NOT NULL REFERENCES equipment(equipment_uid),
    next_date DATE NOT NULL,
    required_certs TEXT[] DEFAULT '{}',
    est_duration_min INTEGER DEFAULT 60
);

CREATE INDEX IF NOT EXISTS idx_maintenance_schedule_site_date
    ON maintenance_schedule (site_id, next_date);

CREATE TABLE IF NOT EXISTS inventory (
    inventory_id SERIAL PRIMARY KEY,
    site_id TEXT NOT NULL REFERENCES sites(site_id),
    part_id TEXT NOT NULL,
    part_name TEXT,
    qty INTEGER NOT NULL DEFAULT 0,
    reorder_level INTEGER DEFAULT 0,
    UNIQUE (site_id, part_id)
);

CREATE TABLE IF NOT EXISTS work_orders (
    work_order_id SERIAL PRIMARY KEY,
    site_id TEXT NOT NULL REFERENCES sites(site_id),
    equipment_uid TEXT NOT NULL REFERENCES equipment(equipment_uid),
    job_type TEXT NOT NULL,
    planned_start TIMESTAMPTZ,
    planned_end TIMESTAMPTZ,
    required_certs TEXT[] DEFAULT '{}',
    employee_id TEXT REFERENCES employees(employee_id),
    status TEXT NOT NULL DEFAULT 'PENDING_APPROVAL',
    created_by TEXT NOT NULL,
    approved_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_work_orders_site_status
    ON work_orders (site_id, status);

CREATE TABLE IF NOT EXISTS assignments (
    assignment_id SERIAL PRIMARY KEY,
    work_order_id INTEGER NOT NULL REFERENCES work_orders(work_order_id),
    employee_id TEXT NOT NULL REFERENCES employees(employee_id),
    start_ts TIMESTAMPTZ NOT NULL,
    end_ts TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_assignments_employee_time
    ON assignments (employee_id, start_ts, end_ts);

CREATE TABLE IF NOT EXISTS doc_chunks (
    chunk_id SERIAL PRIMARY KEY,
    doc_id TEXT NOT NULL,
    doc_type TEXT NOT NULL,
    site_id TEXT,
    equipment_uid TEXT,
    source_name TEXT NOT NULL,
    section TEXT,
    content TEXT NOT NULL,
    embedding vector(384) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doc_chunks_meta
    ON doc_chunks (doc_type, site_id, equipment_uid);

CREATE INDEX IF NOT EXISTS idx_doc_chunks_embedding
    ON doc_chunks USING ivfflat (embedding vector_cosine_ops);
