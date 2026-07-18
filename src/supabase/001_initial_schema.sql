-- ============================================================
-- ZAHRA.POS — Complete Database Schema
-- Supabase PostgreSQL Migration
-- Restaurant POS System · Abu Dhabi, UAE
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('admin', 'cashier');
CREATE TYPE product_category AS ENUM ('food', 'drinks', 'desserts');
CREATE TYPE payment_method AS ENUM ('cash', 'visa');
CREATE TYPE order_status AS ENUM ('pending', 'completed', 'cancelled', 'refunded');

-- ============================================================
-- TABLE: profiles
-- Extends Supabase auth.users
-- ============================================================

CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL,
  role          user_role NOT NULL DEFAULT 'cashier',
  avatar_url    TEXT,
  phone         TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.profiles IS 'User profiles extending Supabase auth — admin and cashier roles';

-- ============================================================
-- TABLE: restaurant_settings
-- ============================================================

CREATE TABLE public.restaurant_settings (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             TEXT NOT NULL DEFAULT 'Zahrat Bahary Cafeteria',
  name_ar          TEXT NOT NULL DEFAULT 'مطعم زهرة',
  address          TEXT NOT NULL DEFAULT 'Abu Dhabi, United Arab Emirates',
  phone            TEXT DEFAULT '+971 2 555 0100',
  trn              TEXT DEFAULT '100234567890003',
  vat_rate         NUMERIC(5,2) NOT NULL DEFAULT 5.00,
  currency         TEXT NOT NULL DEFAULT 'AED',
  receipt_footer   TEXT DEFAULT 'شكراً لزيارتكم! • Thank you for dining with us',
  logo_url         TEXT,
  theme            TEXT DEFAULT 'dark',
  language         TEXT DEFAULT 'en',
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by       UUID REFERENCES auth.users(id)
);

-- Insert default settings row
INSERT INTO public.restaurant_settings (id) VALUES ('00000000-0000-0000-0000-000000000001');

COMMENT ON TABLE public.restaurant_settings IS 'Single-row restaurant configuration table';

-- ============================================================
-- TABLE: categories
-- ============================================================

CREATE TABLE public.categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  name_ar     TEXT NOT NULL,
  slug        product_category NOT NULL UNIQUE,
  emoji       TEXT NOT NULL DEFAULT '🍽️',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed the 3 required categories
INSERT INTO public.categories (name, name_ar, slug, icon, sort_order) VALUES
  ('Food',     'طعام',    'food',     'UtensilsCrossed', 1),
  ('Drinks',   'مشروبات', 'drinks',   'Coffee',          2),
  ('Desserts', 'حلويات',  'desserts', 'Cake',            3);

COMMENT ON TABLE public.categories IS 'Product categories — Food, Drinks, Desserts';

-- ============================================================
-- TABLE: products
-- ============================================================

CREATE TABLE public.products (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT NOT NULL,
  name_ar      TEXT,
  description  TEXT,
  description_ar TEXT,
  price        NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  category_id  UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  category_slug product_category NOT NULL,
  emoji        TEXT NOT NULL DEFAULT '🍽️',
  image_url    TEXT,
  is_available BOOLEAN NOT NULL DEFAULT true,
  is_featured  BOOLEAN NOT NULL DEFAULT false,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  sku          TEXT UNIQUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by   UUID REFERENCES auth.users(id),
  updated_by   UUID REFERENCES auth.users(id)
);

-- Indexes for product queries
CREATE INDEX idx_products_category ON public.products(category_slug);
CREATE INDEX idx_products_available ON public.products(is_available);
CREATE INDEX idx_products_name ON public.products USING gin(to_tsvector('english', name));

COMMENT ON TABLE public.products IS 'Restaurant menu products with full multilingual support';

-- ============================================================
-- TABLE: orders
-- ============================================================

CREATE TABLE public.orders (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number    BIGINT NOT NULL UNIQUE,
  status          order_status NOT NULL DEFAULT 'completed',
  cashier_id      UUID REFERENCES auth.users(id),
  cashier_name    TEXT NOT NULL,
  payment_method  payment_method NOT NULL DEFAULT 'cash',
  subtotal        NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_pct    NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (discount_pct >= 0 AND discount_pct <= 100),
  discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  vat_rate        NUMERIC(5,2) NOT NULL DEFAULT 5,
  vat_amount      NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_amount    NUMERIC(10,2) NOT NULL DEFAULT 0,
  cash_given      NUMERIC(10,2),
  change_amount   NUMERIC(10,2),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for order queries
CREATE INDEX idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX idx_orders_cashier ON public.orders(cashier_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_payment ON public.orders(payment_method);
CREATE INDEX idx_orders_number ON public.orders(order_number DESC);
CREATE INDEX idx_orders_date_range ON public.orders(created_at, status);

COMMENT ON TABLE public.orders IS 'Customer orders with full financial breakdown';

-- ============================================================
-- TABLE: order_items
-- ============================================================

CREATE TABLE public.order_items (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id     UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id   UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_emoji TEXT NOT NULL DEFAULT '🍽️',
  unit_price   NUMERIC(10,2) NOT NULL,
  quantity     INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  line_total   NUMERIC(10,2) NOT NULL,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_items_order ON public.order_items(order_id);
CREATE INDEX idx_order_items_product ON public.order_items(product_id);

COMMENT ON TABLE public.order_items IS 'Line items belonging to each order';

-- ============================================================
-- SEQUENCE: order_number
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS order_number_seq START WITH 1000 INCREMENT BY 1;

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_settings_updated_at
  BEFORE UPDATE ON public.restaurant_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'cashier')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-assign order number
CREATE OR REPLACE FUNCTION public.assign_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL THEN
    NEW.order_number = nextval('order_number_seq');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_assign_order_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.assign_order_number();

-- ============================================================
-- VIEWS
-- ============================================================

-- Daily sales summary
CREATE OR REPLACE VIEW public.v_daily_sales AS
SELECT
  DATE(created_at AT TIME ZONE 'Asia/Dubai') AS sale_date,
  COUNT(*) AS order_count,
  SUM(subtotal) AS subtotal,
  SUM(discount_amount) AS total_discount,
  SUM(vat_amount) AS total_vat,
  SUM(total_amount) AS total_revenue,
  AVG(total_amount) AS avg_order_value,
  COUNT(*) FILTER (WHERE payment_method = 'cash') AS cash_orders,
  COUNT(*) FILTER (WHERE payment_method = 'visa') AS visa_orders,
  SUM(total_amount) FILTER (WHERE payment_method = 'cash') AS cash_revenue,
  SUM(total_amount) FILTER (WHERE payment_method = 'visa') AS visa_revenue
FROM public.orders
WHERE status = 'completed'
GROUP BY DATE(created_at AT TIME ZONE 'Asia/Dubai')
ORDER BY sale_date DESC;

-- Best selling products
CREATE OR REPLACE VIEW public.v_best_sellers AS
SELECT
  oi.product_id,
  oi.product_name,
  oi.product_emoji,
  SUM(oi.quantity) AS total_qty,
  SUM(oi.line_total) AS total_revenue,
  COUNT(DISTINCT oi.order_id) AS order_count
FROM public.order_items oi
JOIN public.orders o ON o.id = oi.order_id
WHERE o.status = 'completed'
GROUP BY oi.product_id, oi.product_name, oi.product_emoji
ORDER BY total_qty DESC;

-- Hourly sales (today)
CREATE OR REPLACE VIEW public.v_hourly_sales AS
SELECT
  EXTRACT(HOUR FROM created_at AT TIME ZONE 'Asia/Dubai') AS hour,
  COUNT(*) AS order_count,
  SUM(total_amount) AS revenue
FROM public.orders
WHERE
  status = 'completed'
  AND DATE(created_at AT TIME ZONE 'Asia/Dubai') = CURRENT_DATE
GROUP BY EXTRACT(HOUR FROM created_at AT TIME ZONE 'Asia/Dubai')
ORDER BY hour;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_settings ENABLE ROW LEVEL SECURITY;

-- Helper function to get the current user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ---- PROFILES ----
-- Users can read their own profile; admins can read all
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "profiles_select_admin" ON public.profiles
  FOR SELECT USING (public.get_user_role() = 'admin');

-- Users can update their own profile; admins can update any
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "profiles_update_admin" ON public.profiles
  FOR UPDATE USING (public.get_user_role() = 'admin');

-- Only admins can insert new profiles
CREATE POLICY "profiles_insert_admin" ON public.profiles
  FOR INSERT WITH CHECK (public.get_user_role() = 'admin');

-- Only admins can delete profiles
CREATE POLICY "profiles_delete_admin" ON public.profiles
  FOR DELETE USING (public.get_user_role() = 'admin');

-- ---- PRODUCTS ----
-- All authenticated users can view available products
CREATE POLICY "products_select_authenticated" ON public.products
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only admins can insert products
CREATE POLICY "products_insert_admin" ON public.products
  FOR INSERT WITH CHECK (public.get_user_role() = 'admin');

-- Only admins can update products
CREATE POLICY "products_update_admin" ON public.products
  FOR UPDATE USING (public.get_user_role() = 'admin');

-- Only admins can delete products
CREATE POLICY "products_delete_admin" ON public.products
  FOR DELETE USING (public.get_user_role() = 'admin');

-- ---- CATEGORIES ----
CREATE POLICY "categories_select_authenticated" ON public.categories
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "categories_modify_admin" ON public.categories
  FOR ALL USING (public.get_user_role() = 'admin');

-- ---- ORDERS ----
-- Admins see all orders; cashiers see only their own
CREATE POLICY "orders_select_admin" ON public.orders
  FOR SELECT USING (public.get_user_role() = 'admin');

CREATE POLICY "orders_select_own" ON public.orders
  FOR SELECT USING (cashier_id = auth.uid());

-- Any authenticated user can create orders
CREATE POLICY "orders_insert_authenticated" ON public.orders
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Only admins can update/delete orders
CREATE POLICY "orders_update_admin" ON public.orders
  FOR UPDATE USING (public.get_user_role() = 'admin');

CREATE POLICY "orders_delete_admin" ON public.orders
  FOR DELETE USING (public.get_user_role() = 'admin');

-- ---- ORDER ITEMS ----
CREATE POLICY "order_items_select_admin" ON public.order_items
  FOR SELECT USING (public.get_user_role() = 'admin');

CREATE POLICY "order_items_select_own" ON public.order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id AND o.cashier_id = auth.uid()
    )
  );

CREATE POLICY "order_items_insert_authenticated" ON public.order_items
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "order_items_delete_admin" ON public.order_items
  FOR DELETE USING (public.get_user_role() = 'admin');

-- ---- RESTAURANT SETTINGS ----
CREATE POLICY "settings_select_authenticated" ON public.restaurant_settings
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "settings_modify_admin" ON public.restaurant_settings
  FOR ALL USING (public.get_user_role() = 'admin');

-- ============================================================
-- REALTIME PUBLICATIONS
-- ============================================================

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.restaurant_settings;
