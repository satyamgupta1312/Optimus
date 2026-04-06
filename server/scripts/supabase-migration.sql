-- Optimus → Supabase Schema (5 tables, no activity_log)
-- Run this in Supabase Dashboard → SQL Editor

-- 1. Canvas Widgets
CREATE TABLE IF NOT EXISTS canvas_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  widget_id TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  slug TEXT DEFAULT '',
  env TEXT NOT NULL DEFAULT 'PROD',
  title TEXT DEFAULT '',
  title_hi TEXT DEFAULT '',
  status TEXT DEFAULT 'DRAFT',
  sort_order INTEGER DEFAULT 0,
  pnc JSONB DEFAULT '{}',
  config JSONB DEFAULT '{}',
  products JSONB DEFAULT '[]',
  author TEXT DEFAULT '',
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_canvas_widgets_env ON canvas_widgets(env);
CREATE INDEX idx_canvas_widgets_status ON canvas_widgets(status);
CREATE INDEX idx_canvas_widgets_type ON canvas_widgets(type);

-- 2. Widget Versions (id synced with submissions.id via slug)
CREATE TABLE IF NOT EXISTS widget_versions (
  id INTEGER PRIMARY KEY,
  widget_id TEXT NOT NULL,
  widget_slug TEXT DEFAULT '',
  env TEXT DEFAULT 'PROD',
  version INTEGER NOT NULL,
  snapshot JSONB DEFAULT '{}',
  changed_by TEXT DEFAULT '',
  change_log TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(widget_id, version)
);

CREATE INDEX idx_widget_versions_widget ON widget_versions(widget_id);
CREATE INDEX idx_widget_versions_slug ON widget_versions(widget_slug);

-- 3. Submissions (with history — no separate activity_log)
CREATE SEQUENCE IF NOT EXISTS request_id_seq START 1;

CREATE TABLE IF NOT EXISTS submissions (
  id SERIAL PRIMARY KEY,
  request_id INTEGER NOT NULL,
  widget_id TEXT,
  widget_type TEXT DEFAULT '',
  slug TEXT DEFAULT '',
  title TEXT DEFAULT '',
  title_hi TEXT DEFAULT '',
  item_titles_hi JSONB DEFAULT '[]',
  request_status TEXT DEFAULT 'PENDING',
  env TEXT NOT NULL DEFAULT 'PROD',
  products_count INTEGER DEFAULT 0,
  pnc JSONB DEFAULT '{}',
  config JSONB DEFAULT '{}',
  hierarchy JSONB DEFAULT '{}',
  rejection_reason TEXT DEFAULT '',
  header_widgets JSONB DEFAULT '{}',
  request_type TEXT DEFAULT 'Homepage Update',
  sort_order INTEGER DEFAULT 0,
  result TEXT DEFAULT '',
  error_msg TEXT DEFAULT '',
  history JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(request_id, widget_id)
);

CREATE INDEX idx_submissions_request ON submissions(request_id);
CREATE INDEX idx_submissions_status ON submissions(request_status);
CREATE INDEX idx_submissions_env ON submissions(env);
CREATE INDEX idx_submissions_created ON submissions(created_at DESC);

-- 4. User Roles (SERIAL id: 1, 2, 3, 4...)
CREATE TABLE IF NOT EXISTS user_roles (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT DEFAULT '',
  role TEXT NOT NULL DEFAULT 'CHECKER',
  env TEXT NOT NULL DEFAULT 'PROD',
  is_active BOOLEAN DEFAULT true,
  added_at TIMESTAMPTZ DEFAULT now(),
  added_by TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(email, env)
);

CREATE INDEX idx_user_roles_email ON user_roles(email);

-- 5. Locations
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  env TEXT NOT NULL DEFAULT 'PROD',
  level_tag TEXT DEFAULT '',
  level_property TEXT DEFAULT '',
  slug_suffix TEXT DEFAULT '',
  label TEXT DEFAULT '',
  type TEXT DEFAULT '',
  is_default BOOLEAN DEFAULT false,
  is_enabled BOOLEAN DEFAULT true,
  is_custom BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(key, env)
);

CREATE INDEX idx_locations_env ON locations(env);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_canvas_widgets_updated BEFORE UPDATE ON canvas_widgets FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_submissions_updated BEFORE UPDATE ON submissions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_user_roles_updated BEFORE UPDATE ON user_roles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_locations_updated BEFORE UPDATE ON locations FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RPC function for request_id sequence
CREATE OR REPLACE FUNCTION nextval_request_id()
RETURNS INTEGER AS $$
BEGIN
  RETURN nextval('request_id_seq');
END;
$$ LANGUAGE plpgsql;
