// ============================================================
// src/services/productService.js
// Product CRUD + image upload + realtime subscriptions
// ============================================================

import { supabase, TABLES, BUCKETS } from '../supabase/supabase.js'

// ── Shared select string — keeps joined data consistent ──────
const PRODUCT_SELECT = `
  id, name, name_ar, description, description_ar,
  price, category_id, category_slug, emoji, image_url,
  is_available, is_featured, sort_order,
  created_at, updated_at,
  inventory_enabled, pieces_per_packet, number_of_packets, current_stock,
  stock_unit, current_weight, minimum_stock,
  category:categories(id, name, name_ar, slug, emoji, icon)
`

// ============================================================
// FETCH ALL PRODUCTS
// ============================================================

export async function fetchProducts({ categorySlug = null, availableOnly = false } = {}) {
  let query = supabase
    .from(TABLES.PRODUCTS)
    .select(PRODUCT_SELECT)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (categorySlug) query = query.eq('category_slug', categorySlug)
  if (availableOnly) query = query.eq('is_available', true)

  const { data, error } = await query
  if (error) return { data: [], error: error.message }
  return { data, error: null }
}

// ============================================================
// FETCH SINGLE PRODUCT
// ============================================================

export async function fetchProduct(id) {
  const { data, error } = await supabase
    .from(TABLES.PRODUCTS)
    .select(PRODUCT_SELECT)
    .eq('id', id)
    .single()

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

// ============================================================
// CREATE PRODUCT
// ============================================================

export async function createProduct(productData) {
  const { data: { user } } = await supabase.auth.getUser()

  const payload = {
    name: productData.name.trim(),
    name_ar: productData.name_ar?.trim() || null,
    description: productData.description?.trim() || null,
    description_ar: productData.description_ar?.trim() || null,
    price: parseFloat(productData.price),
    category_id: productData.category_id,
    category_slug: productData.category_slug,
    emoji: productData.emoji || '🍽️',
    image_url: productData.image_url || null,
    is_available: productData.is_available ?? true,
    is_featured: productData.is_featured ?? false,
    sort_order: productData.sort_order ?? 0,
    created_by: user?.id,
    updated_by: user?.id,
    inventory_enabled: productData.inventory_enabled ?? false,
    pieces_per_packet: productData.pieces_per_packet ? parseInt(productData.pieces_per_packet, 10) : 0,
    number_of_packets: productData.number_of_packets ? parseInt(productData.number_of_packets, 10) : 0,
    current_stock: productData.current_stock ? parseInt(productData.current_stock, 10) : 0,
    stock_unit: productData.stock_unit || 'gram',
    current_weight: productData.current_weight ? parseFloat(productData.current_weight) : 0.0,
    minimum_stock: productData.minimum_stock ? parseFloat(productData.minimum_stock) : 0.0,
  }

  const { data, error } = await supabase
    .from(TABLES.PRODUCTS)
    .insert(payload)
    .select(PRODUCT_SELECT)
    .single()

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

// ============================================================
// UPDATE PRODUCT
// ============================================================

export async function updateProduct(id, updates) {
  const { data: { user } } = await supabase.auth.getUser()

  const payload = { ...updates, updated_by: user?.id, updated_at: new Date().toISOString() }
  delete payload.id
  delete payload.category  // never write the joined relation back

  const { data, error } = await supabase
    .from(TABLES.PRODUCTS)
    .update(payload)
    .eq('id', id)
    .select(PRODUCT_SELECT)
    .single()

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

// ============================================================
// TOGGLE AVAILABILITY
// ============================================================

export async function toggleProductAvailability(id, isAvailable) {
  return updateProduct(id, { is_available: isAvailable })
}

// ============================================================
// DELETE PRODUCT
// ============================================================

export async function deleteProduct(id) {
  // Clean up storage image first
  const { data: product } = await fetchProduct(id)
  if (product?.image_url) {
    try {
      // Extract just the file name from the full public URL
      const segments = product.image_url.split('/')
      const fileName = segments[segments.length - 1].split('?')[0]
      await supabase.storage.from(BUCKETS.PRODUCT_IMAGES).remove([fileName])
    } catch (_) { /* non-fatal — proceed with DB delete */ }
  }

  const { error } = await supabase
    .from(TABLES.PRODUCTS)
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }
  return { error: null }
}

// ============================================================
// UPLOAD PRODUCT IMAGE
// ============================================================

export async function uploadProductImage(file, productId) {
  // Validate file type
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (!allowed.includes(file.type)) {
    return { url: null, error: 'Only JPG, PNG, and WEBP images are allowed.' }
  }

  // Max 5 MB
  if (file.size > 5 * 1024 * 1024) {
    return { url: null, error: 'Image must be smaller than 5 MB.' }
  }

  const ext = file.name.split('.').pop().toLowerCase()
  const fileName = `product_${productId || 'new'}_${Date.now()}.${ext}`

  const { error: uploadErr } = await supabase.storage
    .from(BUCKETS.PRODUCT_IMAGES)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type,
    })

  if (uploadErr) return { url: null, error: uploadErr.message }

  const { data: { publicUrl } } = supabase.storage
    .from(BUCKETS.PRODUCT_IMAGES)
    .getPublicUrl(fileName)

  return { url: publicUrl, error: null }
}

// ============================================================
// FETCH CATEGORIES
// ============================================================

export async function fetchCategories() {
  const { data, error } = await supabase
    .from(TABLES.CATEGORIES)
    .select('id, name, name_ar, slug, emoji, icon, sort_order')
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('fetchCategories error:', error)
    return { data: [], error: error.message }
  }
  return { data: data || [], error: null }
}

// ============================================================
// REALTIME SUBSCRIPTION
// ============================================================

export function subscribeToProducts({ onInsert, onUpdate, onDelete } = {}) {
  const channel = supabase
    .channel(`products-realtime-${Date.now()}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: TABLES.PRODUCTS },
      (payload) => onInsert?.(payload.new)
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: TABLES.PRODUCTS },
      (payload) => onUpdate?.(payload.new)
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: TABLES.PRODUCTS },
      (payload) => onDelete?.(payload.old)
    )
    .subscribe()

  return channel
}