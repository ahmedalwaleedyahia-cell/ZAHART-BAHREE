-- ============================================================
-- ZAHRA.POS — Seed Data
-- Sample products for all 3 categories
-- ============================================================

-- NOTE: Run this AFTER creating the admin user through Supabase Auth
-- Replace 'YOUR_ADMIN_USER_ID' with the actual UUID from auth.users

-- ============================================================
-- SAMPLE PRODUCTS — Food
-- ============================================================

INSERT INTO public.products (name, name_ar, description, price, category_id, category_slug, emoji, is_available, sort_order) VALUES
(
  'Grilled Chicken Mandi',
  'مندي دجاج مشوي',
  'Slow-cooked aromatic rice with tender grilled chicken, served with salsa and lemon',
  38.00,
  (SELECT id FROM public.categories WHERE slug = 'food'),
  'food', '🍗', true, 1
),
(
  'Lamb Ouzi',
  'أوزي لحم',
  'Traditional Emirati slow-roasted lamb on fragrant rice with nuts',
  55.00,
  (SELECT id FROM public.categories WHERE slug = 'food'),
  'food', '🐑', true, 2
),
(
  'Mixed Grill Platter',
  'مشاوي مشكلة',
  'Assorted grilled meats — kofta, shish tawook, and lamb chops',
  72.00,
  (SELECT id FROM public.categories WHERE slug = 'food'),
  'food', '🥩', true, 3
),
(
  'Hummus & Warm Bread',
  'حمص وخبز',
  'Fresh creamy hummus with warm pita bread and olive oil drizzle',
  18.00,
  (SELECT id FROM public.categories WHERE slug = 'food'),
  'food', '🥙', true, 4
),
(
  'Chicken Machboos',
  'مجبوس دجاج',
  'Traditional Gulf spiced rice dish with chicken and dried lemon',
  42.00,
  (SELECT id FROM public.categories WHERE slug = 'food'),
  'food', '🍲', true, 5
),
(
  'Fattoush Salad',
  'فتوش',
  'Fresh Lebanese salad with crispy pita, vegetables, and sumac dressing',
  22.00,
  (SELECT id FROM public.categories WHERE slug = 'food'),
  'food', '🥗', true, 6
),
(
  'Shawarma Wrap',
  'شاورما لحم',
  'Tender marinated meat wrapped in fresh bread with garlic sauce',
  28.00,
  (SELECT id FROM public.categories WHERE slug = 'food'),
  'food', '🌯', true, 7
),
(
  'Harees',
  'هريس',
  'Slow-cooked wheat and chicken — traditional Emirati comfort dish',
  32.00,
  (SELECT id FROM public.categories WHERE slug = 'food'),
  'food', '🥣', true, 8
);

-- ============================================================
-- SAMPLE PRODUCTS — Drinks
-- ============================================================

INSERT INTO public.products (name, name_ar, description, price, category_id, category_slug, emoji, is_available, sort_order) VALUES
(
  'Karak Chai',
  'كرك',
  'Authentic spiced milk tea brewed with cardamom and saffron',
  8.00,
  (SELECT id FROM public.categories WHERE slug = 'drinks'),
  'drinks', '🍵', true, 1
),
(
  'Fresh Lemon Mint',
  'ليمون نعناع',
  'Chilled fresh-squeezed lemon juice with garden mint leaves',
  15.00,
  (SELECT id FROM public.categories WHERE slug = 'drinks'),
  'drinks', '🍋', true, 2
),
(
  'Mango Lassi',
  'لاسي مانغو',
  'Thick blended mango and yoghurt drink — sweet and refreshing',
  18.00,
  (SELECT id FROM public.categories WHERE slug = 'drinks'),
  'drinks', '🥭', true, 3
),
(
  'Arabic Coffee',
  'قهوة عربية',
  'Traditional gahwa brewed with cardamom and rose water',
  12.00,
  (SELECT id FROM public.categories WHERE slug = 'drinks'),
  'drinks', '☕', true, 4
),
(
  'Tamarind Juice',
  'عصير تمر هندي',
  'Sweet and tangy chilled tamarind drink, a Gulf classic',
  14.00,
  (SELECT id FROM public.categories WHERE slug = 'drinks'),
  'drinks', '🧃', true, 5
),
(
  'Sparkling Water',
  'مياه غازية',
  '500ml chilled premium sparkling water',
  8.00,
  (SELECT id FROM public.categories WHERE slug = 'drinks'),
  'drinks', '💧', true, 6
),
(
  'Jallab Juice',
  'جلاب',
  'Sweet grape and rose water drink with raisins and pine nuts',
  16.00,
  (SELECT id FROM public.categories WHERE slug = 'drinks'),
  'drinks', '🍇', true, 7
),
(
  'Fresh Orange Juice',
  'عصير برتقال طازج',
  'Freshly squeezed orange juice — no added sugar',
  18.00,
  (SELECT id FROM public.categories WHERE slug = 'drinks'),
  'drinks', '🍊', true, 8
);

-- ============================================================
-- SAMPLE PRODUCTS — Desserts
-- ============================================================

INSERT INTO public.products (name, name_ar, description, price, category_id, category_slug, emoji, is_available, sort_order) VALUES
(
  'Umm Ali',
  'أم علي',
  'Warm Egyptian bread pudding with cream, raisins, and nuts',
  22.00,
  (SELECT id FROM public.categories WHERE slug = 'desserts'),
  'desserts', '🥮', true, 1
),
(
  'Luqaimat',
  'لقيمات',
  'Crispy golden dumplings drizzled with date honey and sesame',
  18.00,
  (SELECT id FROM public.categories WHERE slug = 'desserts'),
  'desserts', '🍩', true, 2
),
(
  'Kunafa',
  'كنافة',
  'Crispy shredded pastry filled with cheese in sweet sugar syrup',
  25.00,
  (SELECT id FROM public.categories WHERE slug = 'desserts'),
  'desserts', '🍰', true, 3
),
(
  'Date Ice Cream',
  'آيس كريم التمر',
  'Artisan gelato made with local Khalas dates',
  20.00,
  (SELECT id FROM public.categories WHERE slug = 'desserts'),
  'desserts', '🍨', true, 4
),
(
  'Baklava',
  'بقلاوة',
  'Layers of nut-filled filo pastry soaked in rose-water syrup',
  28.00,
  (SELECT id FROM public.categories WHERE slug = 'desserts'),
  'desserts', '🧁', true, 5
),
(
  'Muhallabia',
  'محلبية',
  'Chilled rosewater milk pudding topped with crushed pistachios',
  18.00,
  (SELECT id FROM public.categories WHERE slug = 'desserts'),
  'desserts', '🍮', true, 6
),
(
  'Qatayef',
  'قطايف',
  'Stuffed pancakes filled with sweet cheese, fried and dipped in syrup',
  22.00,
  (SELECT id FROM public.categories WHERE slug = 'desserts'),
  'desserts', '🥞', true, 7
);
