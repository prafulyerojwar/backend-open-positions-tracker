// src/db.js
import pkg from 'pg';
const { Pool } = pkg;
import cfg from './config.js';

export const pool = new Pool({ connectionString: cfg.db.url });

// Main migration: creates all tables if missing
export async function migrate() {
  const client = await pool.connect();
  try {
    const sql = `
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    -- users
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('ADMIN','LEAD','MEMBER','VIEWER')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- clients
    CREATE TABLE IF NOT EXISTS clients (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name TEXT UNIQUE NOT NULL,
      industry TEXT,
      contact_details JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- optional client units mapping
    CREATE TABLE IF NOT EXISTS client_delivery_units (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      unit TEXT NOT NULL,
      UNIQUE(client_id, unit)
    );

    -- master_config: dynamic column definitions
    CREATE TABLE IF NOT EXISTS master_config (
      id SERIAL PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      label TEXT NOT NULL,
      input_type TEXT NOT NULL CHECK (input_type IN ('text','textarea','number','date','select','multiselect','checkbox')),
      options JSONB,
      required BOOLEAN NOT NULL DEFAULT false,
      is_active BOOLEAN NOT NULL DEFAULT true,
      order_index INT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- positions
    CREATE TABLE IF NOT EXISTS positions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      priority TEXT,
      type TEXT,
      client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
      opportunity_project TEXT,
      probability NUMERIC(5,2),
      estimated_start_date DATE,
      estimated_end_date DATE,
      service_line TEXT,
      practice TEXT,
      delivery_unit TEXT,
      role TEXT,
      career_level TEXT,
      location TEXT,
      skill TEXT,
      fulfillment NUMERIC(5,2),              -- will evolve to TEXT
      status TEXT,
      external_req_in_system BOOLEAN,
      create_date DATE,
      notes TEXT,
      dynamic_fields JSONB NOT NULL DEFAULT '{}',
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_positions_client ON positions(client_id);
    CREATE INDEX IF NOT EXISTS idx_positions_status ON positions(status);
    CREATE INDEX IF NOT EXISTS idx_positions_dynamic_gin ON positions USING GIN (dynamic_fields);

    -- audit logs
    CREATE TABLE IF NOT EXISTS audit_logs (
      id BIGSERIAL PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id UUID,
      action TEXT NOT NULL,
      old_value JSONB,
      new_value JSONB,
      actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- updated_at trigger
    CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END; $$ LANGUAGE plpgsql;

    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_users_updated_at') THEN
        CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
      END IF;
    END $$;

    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_clients_updated_at') THEN
        CREATE TRIGGER trg_clients_updated_at BEFORE UPDATE ON clients
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
      END IF;
    END $$;

    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_positions_updated_at') THEN
        CREATE TRIGGER trg_positions_updated_at BEFORE UPDATE ON positions
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
      END IF;
    END $$;

    -- seed admin if not exists (password: Admin@123)
    INSERT INTO users (name, email, password_hash, role)
    SELECT 'Admin', 'admin@opt.local', '$2a$10$8Itb7xS3sG9cJf2iESF3pOXyYQ1qX3uTnHHSOp6l0v7F1h1kyCwLO', 'ADMIN'
    WHERE NOT EXISTS (SELECT 1 FROM users WHERE email='admin@opt.local');
    `;
    await client.query(sql);
  } finally {
    client.release();
  }
}

// Evolution: align fulfillment + add external_req_id
export async function evolve() {
  const client = await pool.connect();
  try {
    await client.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='positions' AND column_name='fulfillment' AND data_type <> 'text'
        ) THEN
          ALTER TABLE positions ALTER COLUMN fulfillment TYPE TEXT USING fulfillment::TEXT;
        END IF;
      END $$;

      ALTER TABLE positions ADD COLUMN IF NOT EXISTS external_req_id TEXT;
      CREATE UNIQUE INDEX IF NOT EXISTS ux_positions_external_req_id ON positions(external_req_id);
    `);
  } finally {
    client.release();
  }
}