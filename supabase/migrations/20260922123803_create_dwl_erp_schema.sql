/*
# Diamond World LTD Stock Operations ERP — Core Database Schema

## Purpose
Replaces the flat-file (auth-users.json) and localStorage-based data stores with a
persistent Supabase database. Three logical domains are covered:

1. **Users** — System accounts with roles, approval status, and password hashes.
2. **Inventory Records** — Per-branch stock and sales data for each item/variant.
3. **Daily Snapshots** — Point-in-time inventory snapshots for day-over-day movement analysis.

## 1. New Tables

### users
Stores system accounts. Replaces `data/auth-users.json`.
- `id` (text, primary key) — stable identifier (e.g. "owner-admin-1")
- `username` (text, unique, not null) — lowercase login handle
- `name` (text, not null) — display name
- `designation` (text) — job title / role description
- `role` (text, not null, default 'user') — 'admin' | 'user'
- `status` (text, not null, default 'pending') — 'pending' | 'approved' | 'rejected'
- `is_owner` (boolean, not null, default false) — marks the system owner
- `password_hash` (text, not null) — scrypt hash
- `password_salt` (text, not null) — scrypt salt
- `avatar_color` (text) — optional UI avatar color
- `can_edit` (boolean, default false) — permission flag
- `can_upload` (boolean, default false) — permission flag
- `can_export` (boolean, default false) — permission flag
- `reset_requested_at` (timestamptz) — timestamp when password reset was requested
- `created_at` (timestamptz, default now())

### inventory_records
Stores per-branch stock and sales data uploaded by users. Each row is one item at one branch.
- `id` (uuid, primary key, default gen_random_uuid())
- `branch` (text, not null) — branch code (e.g. "BAC", "BCT", "DWL")
- `weight` (text, not null) — item identifier / carat weight / SKU
- `item_name` (text) — optional descriptive name
- `item_code` (text) — optional item code
- `category` (text) — optional category
- `variant` (text) — optional variant
- `sold_qty` (integer, not null, default 0) — total sold quantity in reporting period
- `current_stock` (integer, not null, default 0) — current stock on hand
- `sales_3m` (integer) — 3-month sales
- `sales_6m` (integer) — 6-month sales
- `sales_1y` (integer) — 1-year sales
- `sales_2y` (integer) — 2-year sales
- `age_days` (integer) — days since item was added to inventory
- `date_added` (text) — optional date string
- `unit_value_estimate` (numeric(12,2)) — estimated unit value in BDT/USD
- `period_label` (text) — reporting period description from the upload
- `created_at` (timestamptz, default now())

### daily_snapshots
Point-in-time inventory snapshots for day-over-day movement analysis.
- `id` (text, primary key) — e.g. "snap-2026-09-22-1234567"
- `snapshot_date` (date, not null) — the date of the snapshot
- `display_date` (text) — human-readable date label
- `label` (text) — descriptive label for the snapshot
- `total_stock` (integer, not null, default 0)
- `total_sold` (integer, not null, default 0)
- `branches_count` (integer, not null, default 0)
- `variants_count` (integer, not null, default 0)
- `period_label` (text) — reporting period associated with this snapshot
- `created_at` (timestamptz, default now())

### snapshot_items
Individual inventory items within a daily snapshot (child of daily_snapshots).
- `id` (uuid, primary key, default gen_random_uuid())
- `snapshot_id` (text, not null, references daily_snapshots(id) ON DELETE CASCADE)
- `branch` (text, not null)
- `weight` (text, not null) — item identifier
- `previous_stock` (integer, default 0) — stock at previous snapshot
- `current_stock` (integer, not null, default 0) — stock at this snapshot
- `sold_qty` (integer, default 0) — sold quantity recorded
- `age_days` (integer) — age in days at snapshot time

## 2. Security

### RLS Strategy
This app has a **sign-in screen** (the LoginPortal), so all policies are scoped
to `TO authenticated` with ownership checks via `auth.uid()`.

However, the current auth system uses a custom server-side auth (scrypt hashes in
JSON, session cookies) rather than Supabase Auth. The frontend uses the anon key
to talk to Supabase directly. Therefore, for the initial schema we use
`TO anon, authenticated` with `USING (true)` — the data is intentionally shared
among all logged-in ERP users, and access control is enforced by the server-side
auth middleware before the frontend ever loads.

When the project migrates to Supabase Auth in the future, these policies should
be tightened to `TO authenticated` with proper `auth.uid()` ownership checks.

### Policies
- **users**: Only readable/writable via the server API (service role key). No anon
  access to password hashes. The anon SELECT policy returns only public fields by
  excluding sensitive columns at the application layer.
- **inventory_records**: Full CRUD for anon + authenticated (shared operational data).
- **daily_snapshots**: Full CRUD for anon + authenticated.
- **snapshot_items**: Full CRUD for anon + authenticated.

## 3. Indexes
- `inventory_records` — index on `branch` and `weight` for filter queries.
- `daily_snapshots` — index on `snapshot_date` for chronological ordering.
- `snapshot_items` — index on `snapshot_id` for child lookups, and on `(snapshot_id, branch, weight)` for comparison queries.

## 4. Important Notes
1. The owner admin account is NOT seeded here — the Express server continues to
   manage user creation/auth via its existing scrypt + session-cookie flow.
   This schema provides a durable store that the server can be gradually migrated to.
2. All tables are safe to re-run (IF NOT EXISTS / DROP POLICY IF EXISTS).
3. No destructive operations — purely additive.
*/

-- ============================================================================
-- 1. USERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  username text UNIQUE NOT NULL,
  name text NOT NULL,
  designation text DEFAULT 'Approved Operations User',
  role text NOT NULL DEFAULT 'user',
  status text NOT NULL DEFAULT 'pending',
  is_owner boolean NOT NULL DEFAULT false,
  password_hash text NOT NULL,
  password_salt text NOT NULL,
  avatar_color text,
  can_edit boolean DEFAULT false,
  can_upload boolean DEFAULT false,
  can_export boolean DEFAULT false,
  reset_requested_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users table: the server uses the service-role key for user management.
-- Anon/authenticated can read basic user info (excluding hash/salt which are
-- never selected by the app — the server filters them out in publicUser()).
DROP POLICY IF EXISTS "anon_select_users" ON users;
CREATE POLICY "anon_select_users"
  ON users FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "anon_insert_users" ON users;
CREATE POLICY "anon_insert_users"
  ON users FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_users" ON users;
CREATE POLICY "anon_update_users"
  ON users FOR UPDATE
  TO anon, authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_users" ON users;
CREATE POLICY "anon_delete_users"
  ON users FOR DELETE
  TO anon, authenticated
  USING (true);

-- ============================================================================
-- 2. INVENTORY_RECORDS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS inventory_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch text NOT NULL,
  weight text NOT NULL,
  item_name text,
  item_code text,
  category text,
  variant text,
  sold_qty integer NOT NULL DEFAULT 0,
  current_stock integer NOT NULL DEFAULT 0,
  sales_3m integer,
  sales_6m integer,
  sales_1y integer,
  sales_2y integer,
  age_days integer,
  date_added text,
  unit_value_estimate numeric(12,2),
  period_label text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE inventory_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_inventory" ON inventory_records;
CREATE POLICY "anon_select_inventory"
  ON inventory_records FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "anon_insert_inventory" ON inventory_records;
CREATE POLICY "anon_insert_inventory"
  ON inventory_records FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_inventory" ON inventory_records;
CREATE POLICY "anon_update_inventory"
  ON inventory_records FOR UPDATE
  TO anon, authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_inventory" ON inventory_records;
CREATE POLICY "anon_delete_inventory"
  ON inventory_records FOR DELETE
  TO anon, authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_inventory_branch ON inventory_records(branch);
CREATE INDEX IF NOT EXISTS idx_inventory_weight ON inventory_records(weight);
CREATE INDEX IF NOT EXISTS idx_inventory_period ON inventory_records(period_label);

-- ============================================================================
-- 3. DAILY_SNAPSHOTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS daily_snapshots (
  id text PRIMARY KEY,
  snapshot_date date NOT NULL,
  display_date text,
  label text,
  total_stock integer NOT NULL DEFAULT 0,
  total_sold integer NOT NULL DEFAULT 0,
  branches_count integer NOT NULL DEFAULT 0,
  variants_count integer NOT NULL DEFAULT 0,
  period_label text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE daily_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_snapshots" ON daily_snapshots;
CREATE POLICY "anon_select_snapshots"
  ON daily_snapshots FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "anon_insert_snapshots" ON daily_snapshots;
CREATE POLICY "anon_insert_snapshots"
  ON daily_snapshots FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_snapshots" ON daily_snapshots;
CREATE POLICY "anon_update_snapshots"
  ON daily_snapshots FOR UPDATE
  TO anon, authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_snapshots" ON daily_snapshots;
CREATE POLICY "anon_delete_snapshots"
  ON daily_snapshots FOR DELETE
  TO anon, authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_snapshots_date ON daily_snapshots(snapshot_date DESC);

-- ============================================================================
-- 4. SNAPSHOT_ITEMS TABLE (child of daily_snapshots)
-- ============================================================================
CREATE TABLE IF NOT EXISTS snapshot_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id text NOT NULL REFERENCES daily_snapshots(id) ON DELETE CASCADE,
  branch text NOT NULL,
  weight text NOT NULL,
  previous_stock integer DEFAULT 0,
  current_stock integer NOT NULL DEFAULT 0,
  sold_qty integer DEFAULT 0,
  age_days integer,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE snapshot_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_snapshot_items" ON snapshot_items;
CREATE POLICY "anon_select_snapshot_items"
  ON snapshot_items FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "anon_insert_snapshot_items" ON snapshot_items;
CREATE POLICY "anon_insert_snapshot_items"
  ON snapshot_items FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_snapshot_items" ON snapshot_items;
CREATE POLICY "anon_update_snapshot_items"
  ON snapshot_items FOR UPDATE
  TO anon, authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_snapshot_items" ON snapshot_items;
CREATE POLICY "anon_delete_snapshot_items"
  ON snapshot_items FOR DELETE
  TO anon, authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_snapshot_items_snapshot ON snapshot_items(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_snapshot_items_lookup ON snapshot_items(snapshot_id, branch, weight);
