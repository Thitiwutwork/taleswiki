-- =========================================================================
-- 🏃‍♂️ Tales Runner Item Wiki - Supabase Database Schema
-- Run this script in Supabase Dashboard -> SQL Editor -> New Query -> Run
-- =========================================================================

-- 1. Enable pg_trgm extension for super-fast Thai/English text searching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Create items table
CREATE TABLE IF NOT EXISTS public.items (
  id BIGINT PRIMARY KEY,
  name TEXT NOT NULL,
  category_id INT DEFAULT 0,
  character_id INT DEFAULT 0,
  character_name TEXT,
  position_id INT DEFAULT 0,
  position_name TEXT,
  item_kind INT DEFAULT 0,
  level_req INT DEFAULT 0,
  game_money INT DEFAULT 0,
  cash INT DEFAULT 0,
  description TEXT,
  stats JSONB DEFAULT '[]'::jsonb,
  obtain_methods JSONB DEFAULT '[]'::jsonb,
  obtain_sources JSONB DEFAULT '[]'::jsonb,
  icon_file TEXT,
  icon_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create High-Performance Indexes
CREATE INDEX IF NOT EXISTS idx_items_position ON public.items(position_id);
CREATE INDEX IF NOT EXISTS idx_items_character ON public.items(character_id);
CREATE INDEX IF NOT EXISTS idx_items_category ON public.items(category_id);
CREATE INDEX IF NOT EXISTS idx_items_name_trgm ON public.items USING gin (name gin_trgm_ops);

-- 4. Enable Row Level Security (RLS) and allow public read access
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow Public Read Access" ON public.items;
CREATE POLICY "Allow Public Read Access" ON public.items
  FOR SELECT
  USING (true);

-- 5. Helpful Comment
COMMENT ON TABLE public.items IS 'Tales Runner Items Wiki Database with 107k+ items & rich obtain sources';
