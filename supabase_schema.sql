-- =====================================================================
-- SCHEMA DE BANCO DE DADOS SUPABASE (POSTGRESQL) - PETRUZ MONTAGEM DE CARGA
-- =====================================================================

-- 1. Habilitar extensões úteis
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabela de Filiais (Importadas da Service Layer do SAP Business One)
CREATE TABLE IF NOT EXISTS branches (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  cnpj VARCHAR(20),
  logo_url TEXT,
  current_doc_number INTEGER NOT NULL DEFAULT 7195,
  is_active SMALLINT NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabela de Usuários do Sistema
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(50) PRIMARY KEY DEFAULT ('usr-' || substr(md5(random()::text), 1, 8)),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'operator' CHECK (role IN ('admin', 'supervisor', 'operator')),
  is_active SMALLINT NOT NULL DEFAULT 1,
  must_change_password BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Garantir coluna must_change_password se a tabela já existir
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='must_change_password') THEN
    ALTER TABLE users ADD COLUMN must_change_password BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Usuário Administrador Padrão (grupo-ti@petruz.com / senha inicial: 1234)
INSERT INTO users (id, name, email, password_hash, role, is_active, must_change_password)
VALUES (
  'usr-grupoti01',
  'GRUPO TI - PETRUZ FRUITY',
  'grupo-ti@petruz.com',
  '$2a$10$7zBfvZ7rB2/5gX6N17nE3e0bXl4f5QJ5Q6m0ZqR3w4W7yX0.56a5u', -- Hash bcrypt para '1234'
  'admin',
  1,
  true
)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  must_change_password = true;

-- 4. Tabela de Veículos & Frotas
CREATE TABLE IF NOT EXISTS vehicles (
  id VARCHAR(50) PRIMARY KEY DEFAULT ('veh-' || substr(md5(random()::text), 1, 8)),
  plate VARCHAR(20) NOT NULL UNIQUE,
  model VARCHAR(100) NOT NULL,
  vehicle_type VARCHAR(50) NOT NULL,
  driver_name VARCHAR(150) NOT NULL,
  driver_cpf VARCHAR(20),
  driver_phone VARCHAR(30),
  carrier VARCHAR(150) NOT NULL,
  max_weight_kg NUMERIC(10, 2) NOT NULL,
  max_volume_m3 NUMERIC(10, 2) NOT NULL,
  max_pallets INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'loading', 'in_transit', 'maintenance')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tabela de Montagens de Carga (Ciclo Interno 100% Petruz Cargas)
CREATE TABLE IF NOT EXISTS load_assemblies (
  id VARCHAR(50) PRIMARY KEY,
  load_number VARCHAR(50) NOT NULL UNIQUE,
  branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL,
  doc_number INTEGER,
  vehicle_id VARCHAR(50) NOT NULL REFERENCES vehicles(id),
  status VARCHAR(20) NOT NULL DEFAULT 'closed' CHECK (status IN ('draft', 'closed', 'shipped', 'cancelled')),
  total_weight_kg NUMERIC(10, 2) NOT NULL,
  total_volume_m3 NUMERIC(10, 2) NOT NULL,
  total_pallets INTEGER NOT NULL,
  total_value NUMERIC(12, 2) NOT NULL,
  order_count INTEGER NOT NULL,
  destination_cities TEXT,
  observations TEXT,
  created_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  closed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Tabela de Itens e Pedidos Vinculados à Carga
CREATE TABLE IF NOT EXISTS load_items (
  id VARCHAR(50) PRIMARY KEY,
  load_id VARCHAR(50) NOT NULL REFERENCES load_assemblies(id) ON DELETE CASCADE,
  doc_entry INTEGER NOT NULL,
  doc_num INTEGER NOT NULL,
  card_code VARCHAR(50) NOT NULL,
  card_name VARCHAR(255) NOT NULL,
  ship_to_city VARCHAR(100) NOT NULL,
  ship_to_state VARCHAR(10) NOT NULL,
  weight_kg NUMERIC(10, 2) NOT NULL,
  volume_m3 NUMERIC(10, 2) NOT NULL,
  pallets INTEGER NOT NULL,
  doc_total NUMERIC(12, 2) NOT NULL,
  doc_date VARCHAR(20) NOT NULL,
  num_at_card VARCHAR(100),
  items_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Tabela de Logs de Auditoria & Segurança
CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(50) PRIMARY KEY DEFAULT ('log-' || substr(md5(random()::text), 1, 8)),
  user_id VARCHAR(50),
  user_name VARCHAR(150) NOT NULL,
  action VARCHAR(100) NOT NULL,
  details TEXT NOT NULL,
  ip_address VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices de Performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_load_assemblies_created_at ON load_assemblies(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_load_assemblies_branch ON load_assemblies(branch_id);
CREATE INDEX IF NOT EXISTS idx_load_items_load_id ON load_items(load_id);

-- 8. Tabela de Configurações do Sistema
CREATE TABLE IF NOT EXISTS system_settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO system_settings (key, value)
VALUES 
  ('pdf_conference_title', 'CONFERÊNCIA DE LOTES LOKFRIO'),
  ('global_doc_number', '7195'),
  ('default_branch_id', '1')
ON CONFLICT (key) DO NOTHING;

-- =====================================================================
-- 9. SEGURANÇA AVANÇADA: ROW LEVEL SECURITY (RLS) & PROTEÇÃO DE DADOS
-- =====================================================================
-- Habilitamos o RLS em todas as tabelas para bloquear acessos públicos externos não autorizados.
-- O Backend utiliza a chave privada 'service_role' (definida no backend/.env),
-- que possui acesso total às tabelas com segurança e isolamento de rede.

ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE load_assemblies ENABLE ROW LEVEL SECURITY;
ALTER TABLE load_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso Estrito: Permite apenas o Backend Autorizado (service_role)
DROP POLICY IF EXISTS "Acesso restrito ao backend service_role" ON branches;
CREATE POLICY "Acesso restrito ao backend service_role" ON branches FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso restrito ao backend service_role" ON vehicles;
CREATE POLICY "Acesso restrito ao backend service_role" ON vehicles FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso restrito ao backend service_role" ON load_assemblies;
CREATE POLICY "Acesso restrito ao backend service_role" ON load_assemblies FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso restrito ao backend service_role" ON load_items;
CREATE POLICY "Acesso restrito ao backend service_role" ON load_items FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso restrito ao backend service_role" ON users;
CREATE POLICY "Acesso restrito ao backend service_role" ON users FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso restrito ao backend service_role" ON audit_logs;
CREATE POLICY "Acesso restrito ao backend service_role" ON audit_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso restrito ao backend service_role" ON system_settings;
CREATE POLICY "Acesso restrito ao backend service_role" ON system_settings FOR ALL TO service_role USING (true) WITH CHECK (true);

