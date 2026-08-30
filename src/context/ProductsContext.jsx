import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import {
  fetchProducts,
  fetchCategories,
  fetchProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductAvailability,
  subscribeToProducts,
  uploadProductImage,
} from '../services/productService.js'

const ProductsContext = createContext(null)

export function ProductsProvider({ children }) {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const channelRef = useRef(null)

  // ── Initial load ─────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true)
    setError(null)

    const [prodResult, catResult] = await Promise.all([
      fetchProducts(),
      fetchCategories(),
    ])

    if (prodResult?.error) {
      setError(prodResult.error)
      console.error('Products load error:', prodResult.error)
    } else if (prodResult?.data) {
      setProducts(prodResult.data)
    }

    if (catResult?.error) {
      console.error('Categories load error:', catResult.error)
    } else if (catResult?.data) {
      setCategories(catResult.data)
    }

    setLoading(false)
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  // ── Realtime — re-fetch full product on changes ────────
  useEffect(() => {
    channelRef.current = subscribeToProducts({
      onInsert: async (raw) => {
        if (!raw?.id) return
        const { data } = await fetchProduct(raw.id)
        if (!data) return
        setProducts(prev => {
          if (prev.find(p => p.id === data.id)) return prev
          return [...prev, data].sort((a, b) =>
            (a.sort_order ?? 0) - (b.sort_order ?? 0) || (a.name || '').localeCompare(b.name || '')
          )
        })
      },
      onUpdate: async (raw) => {
        if (!raw?.id) return
        const { data } = await fetchProduct(raw.id)
        if (!data) return
        setProducts(prev => prev.map(p => p.id === data.id ? data : p))
      },
      onDelete: (raw) => {
        if (!raw?.id) return
        setProducts(prev => prev.filter(p => p.id !== raw.id))
      },
    })

    return () => {
      channelRef.current?.unsubscribe()
    }
  }, [])

  // ── Actions ───────────────────────────────────────────────
  const addProduct = useCallback(async (productData) => {
    const { data, error } = await createProduct(productData)
    if (error) return { data: null, error }
    return { data, error: null }
  }, [])

  const editProduct = useCallback(async (id, updates) => {
    const { data, error } = await updateProduct(id, updates)
    if (error) return { data: null, error }
    if (data) setProducts(prev => prev.map(p => p.id === id ? data : p))
    return { data, error: null }
  }, [])

  const removeProduct = useCallback(async (id) => {
    const { error } = await deleteProduct(id)
    if (error) return { error }
    setProducts(prev => prev.filter(p => p.id !== id))
    return { error: null }
  }, [])

  const toggleAvailability = useCallback(async (id, isAvailable) => {
    const { data, error } = await toggleProductAvailability(id, isAvailable)
    if (error) return { error }
    if (data) setProducts(prev => prev.map(p => p.id === id ? data : p))
    return { error: null }
  }, [])

  const uploadImage = useCallback((file, productId) => {
    return uploadProductImage(file, productId)
  }, [])

  // ── Derived ───────────────────────────────────────────────
  const availableProducts = products.filter(p => p.is_available)

  const getByCategory = useCallback((slug) => {
    if (!slug || slug === 'all') return products
    return products.filter(p => p.category_slug === slug)
  }, [products])

  const value = {
    products,
    availableProducts,
    categories,
    loading,
    error,
    addProduct,
    editProduct,
    removeProduct,
    toggleAvailability,
    uploadImage,
    getByCategory,
    reload: loadAll,
  }

  return <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>
}

export function useProducts() {
  const ctx = useContext(ProductsContext)
  if (!ctx) throw new Error('useProducts must be used inside <ProductsProvider>')
  return ctx
}