import { useState, useEffect, useCallback, useRef } from 'react'
import { useProducts } from '../context/ProductsContext.jsx'
import Modal from '../components/ui/Modal.jsx'
import Toggle from '../components/ui/Toggle.jsx'
import { fmtNum } from '../utils/format.js'
import Empty from '../components/ui/Empty.jsx'
import Skeleton from '../components/ui/Skeleton.jsx'
import { categoryIcons } from '../utils/categoryIcon.js'
import {
  Package,
  Coffee,
  UtensilsCrossed,
  IceCream2,
  ShoppingBasket,
  Image,
  Camera,
  Search,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

export default function ProductsPage({ showToast }) {
  const { products, categories, loading, addProduct, editProduct, removeProduct, toggleAvailability, uploadImage } = useProducts()
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)

  // Collapse control states for the cards
  const [drinksCardOpen, setDrinksCardOpen] = useState(true)
  const [dessertsCardOpen, setDessertsCardOpen] = useState(true)

  const emptyForm = {
    name: '', name_ar: '', description: '', price: '',
    category_id: '', category_slug: 'food',
    image_url: '', is_available: true,
    inventory_enabled: false,
    pieces_per_packet: '',
    number_of_packets: '',
    current_stock: 0,
    stock_unit: 'gram',
    current_weight: '',
    minimum_stock: ''
  }
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    const draft = localStorage.getItem('productDraft')
    if (draft) {
      try {
        setForm(JSON.parse(draft))
      } catch (e) {
        localStorage.removeItem('productDraft')
      }
    }
  }, [])

  useEffect(() => {
    if (modalOpen) {
      localStorage.setItem('productDraft', JSON.stringify(form))
    }
  }, [form, modalOpen])

  // Automatic Drink Stock Calculation Rule
  useEffect(() => {
    if (form.category_slug === 'drinks') {
      const p = parseInt(form.pieces_per_packet, 10) || 0
      const n = parseInt(form.number_of_packets, 10) || 0
      setForm(f => ({ ...f, current_stock: p * n }))
    }
  }, [form.pieces_per_packet, form.number_of_packets, form.category_slug])

  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [uploadingImg, setUploadingImg] = useState(false)
  const fileInputRef = useRef(null)

  function openAdd() {
    localStorage.removeItem('productDraft')
    setForm({
      ...emptyForm,
      category_id: categories[0]?.id || '',
      category_slug: categories[0]?.slug || 'food'
    })
    setEditingId(null)
    setImageFile(null)
    setImagePreview('') 
    setModalOpen(true)
  }

  function openEdit(p) {
    setForm({
      name: p.name, name_ar: p.name_ar || '', description: p.description || '',
      price: p.price, category_id: p.category_id, category_slug: p.category_slug,
      image_url: p.image_url || '', is_available: p.is_available,
      inventory_enabled: p.inventory_enabled || false,
      pieces_per_packet: p.pieces_per_packet ?? '',
      number_of_packets: p.number_of_packets ?? '',
      current_stock: p.current_stock ?? 0,
      stock_unit: p.stock_unit || 'gram',
      current_weight: p.current_weight ?? '',
      minimum_stock: p.minimum_stock ?? ''
    })
    setEditingId(p.id); setImageFile(null); setImagePreview(p.image_url || ''); setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false); setImageFile(null); setImagePreview('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function onCatChange(e) {
    const cat = categories.find(c => c.id === e.target.value)
    setForm(f => ({ ...f, category_id: e.target.value, category_slug: cat?.slug || 'food' }))
  }

  function onFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) { showToast('Only JPG, PNG or WEBP allowed', 'error'); return }
    if (file.size > 5 * 1024 * 1024) { showToast('Image must be under 5 MB', 'error'); return }
    setImageFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setImagePreview(reader.result)
    reader.readAsDataURL(file)
  }

  async function handleSave() {
    if (!form.name.trim()) { showToast('Product name is required', 'error'); return }
    if (!form.price || isNaN(+form.price)) { showToast('Valid price required', 'error'); return }
    if (!form.category_id) { showToast('Select a category', 'error'); return }
    setSaving(true)

    let imageUrl = form.image_url || null
    if (imageFile) {
      setUploadingImg(true)
      const tempId = editingId || `temp_${Date.now()}`
      const { url, error: imgErr } = await uploadImage(imageFile, tempId)
      setUploadingImg(false)
      if (imgErr) { showToast(`Image upload failed: ${imgErr}`, 'error'); setSaving(false); return }
      imageUrl = url
    }

    const payload = { ...form, price: parseFloat(form.price), image_url: imageUrl }
    const res = editingId ? await editProduct(editingId, payload) : await addProduct(payload)
    setSaving(false)
    if (res.error) { showToast(res.error, 'error'); return }
    showToast(editingId ? 'Product updated!' : 'Product added!', 'success')
    localStorage.removeItem('productDraft')
    closeModal()
  }

  async function handleDelete(id) {
    if (!confirm('Delete this product? This cannot be undone.')) return
    const { error } = await removeProduct(id)
    error ? showToast(error, 'error') : showToast('Product deleted', 'info')
  }

  async function handleToggle(id, val) {
    const { error } = await toggleAvailability(id, val)
    error ? showToast(error, 'error') : showToast(val ? 'Product enabled' : 'Product disabled', 'info')
  }

  const filtered = products.filter(p =>
    (!catFilter || p.category_slug === catFilter) &&
    (!search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.name_ar && p.name_ar.includes(search))
    )
  )

  return (
    <div className="scroll-view">
      <div className="page-header">
        <div>
          <div className="page-title">Product Management</div>
          <div className="page-sub">Changes sync instantly to the POS on all devices</div>
        </div>
        <button className="btn btn-gold" onClick={openAdd}>＋ Add Product</button>
      </div>

      <div className="filter-row" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <div className="search-wrapper" style={{ flex: 1 }}>
          <Search size={18} className="search-icon" />
          <input
            className="search-input"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '44px' }}
          />
          {search && (
            <button className="search-clear-btn" onClick={() => setSearch('')} type="button">✕</button>
          )}
        </div>
        <select className="select" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          <option value="">All Categories</option>
          <option value="food">Food</option>
          <option value="drinks">Drinks</option>
          <option value="desserts">Desserts</option>
        </select>
        <span className="product-count">{filtered.length} product{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {loading ? <Skeleton rows={6} /> :
        filtered.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', width: '100%', display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
            <Empty
              icon={<ShoppingBasket size={34} />}
              text="No products found"
              sub={products.length === 0 ? 'Add your first product to get started' : 'Try a different search or category'}
            />
          </div>
        ) : (
          <div className="product-grid-mgmt">
            {filtered.map(p => (
              <div key={p.id} className="mgmt-card">
                <div className="mgmt-img">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="mgmt-img-photo" onError={e => e.target.classList.add('img-error')} />
                  ) : (
                    <div className="img-placeholder" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Image size={42} color="var(--txt3)" strokeWidth={1.8} />
                    </div>
                  )}
                  {!p.is_available && <div className="unavail-badge">Unavailable</div>}
                </div>
                <div className="mgmt-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                  <div className="mgmt-cat" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
                    {(() => {
                      const Icon = categoryIcons[p.category?.icon] || categoryIcons[p.category_slug] || Package
                      return <Icon size={14} />
                    })()}
                    <span>{p.category?.name || p.category_slug}</span>
                  </div>
                  <div className="mgmt-name" style={{ display: 'flex', flexDirection: 'column', gap: '3px', textAlign: 'center', width: '100%' }}>
                    <span className="arabic-title" dir="rtl" style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--txt)', display: 'block' }}>
                      {p.name_ar ? p.name_ar : p.name}
                    </span>
                    {p.name_ar && (
                      <span className="english-sub" style={{ fontSize: '0.75rem', color: 'var(--txt3)', textTransform: 'capitalize', display: 'block', fontWeight: '400' }}>
                        {p.name}
                      </span>
                    )}
                  </div>

                  {p.description && (
                    <div className="mgmt-desc" dir={p.name_ar ? 'rtl' : 'ltr'} style={{ fontSize: '0.8rem', color: 'var(--txt2)', textAlign: 'center', marginTop: '2px', width: '100%' }}>
                      {p.description}
                    </div>
                  )}

                  <div className="mgmt-price" style={{ width: '100%', textAlign: 'center' }}>AED {fmtNum(p.price)}</div>
                  <div className="mgmt-actions" style={{ width: '100%', justifyContent: 'center', gap: '8px' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}>Edit</button>
                    <Toggle checked={p.is_available} onChange={v => handleToggle(p.id, v)} />
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id)} style={{ marginLeft: p.name_ar ? '0' : 'auto' }}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      {modalOpen && (
        <Modal onClose={closeModal}>
          <div className="modal-title">{editingId ? 'Edit Product' : 'New Product'}</div>

          <div className="img-upload-zone" onClick={() => fileInputRef.current?.click()}>
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" className="img-upload-preview" />
            ) : (
              <div className="img-upload-placeholder">
                <Camera size={40} strokeWidth={1.6} color="var(--txt3)" />
                <span className="img-upload-text">Click to upload image</span>
                <span className="img-upload-sub">JPG · PNG · WEBP · max 5 MB</span>
              </div>
            )}
            {imagePreview && <div className="img-upload-overlay"><span>Change image</span></div>}
          </div>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" style={{ display: 'none' }} onChange={onFileChange} />
          {imageFile && (
            <div className="img-upload-name">{imageFile.name} ({(imageFile.size / 1024).toFixed(0)} KB)</div>
          )}

          <div className="form-grid-2" style={{ marginTop: 16 }}>
            <div className="form-group">
              <label className="form-label">Name (English)*</label>
              <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Grilled Chicken" />
            </div>
            <div className="form-group">
              <label className="form-label">Arabic Name</label>
              <input className="input" value={form.name_ar} onChange={e => setForm(f => ({ ...f, name_ar: e.target.value }))} placeholder="دجاج مشوي" dir="rtl" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Price (AED)*</label>
            <input className="input" type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="0.00" min="0" step="0.01" />
          </div>
          <div className="form-group">
            <label className="form-label">Category*</label>
            <select className="select" value={form.category_id} onChange={onCatChange} style={{ width: '100%' }}>
              <option value="" disabled>Select category...</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <input className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Short product description..." />
          </div>
          <div className="form-check">
            <Toggle checked={form.is_available} onChange={v => setForm(f => ({ ...f, is_available: v }))} />
            <span>Available for ordering</span>
          </div>

          {/* 📦 DRINKS INVENTORY SECTION */}
          {form.category_slug === 'drinks' && (
            <div className="card" style={{ marginBottom: 16, padding: 14 }}>
              <div
                className="card-header"
                style={{ marginBottom: drinksCardOpen ? 12 : 0, cursor: 'pointer' }}
                onClick={() => setDrinksCardOpen(!drinksCardOpen)}
              >
                <span className="card-title">📦 Inventory Management</span>
                {drinksCardOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
              {drinksCardOpen && (
                <div>
                  <div className="form-check">
                    <Toggle checked={form.inventory_enabled} onChange={v => setForm(f => ({ ...f, inventory_enabled: v }))} />
                    <span>Enable Inventory Tracking</span>
                  </div>
                  {form.inventory_enabled && (
                    <div className="form-grid-2">
                      <div className="form-group">
                        <label className="form-label">Pieces Per Packet</label>
                        <input className="input" type="number" value={form.pieces_per_packet} onChange={e => setForm(f => ({ ...f, pieces_per_packet: e.target.value }))} placeholder="e.g. 6" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Number Of Packets</label>
                        <input className="input" type="number" value={form.number_of_packets} onChange={e => setForm(f => ({ ...f, number_of_packets: e.target.value }))} placeholder="e.g. 10" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Minimum Stock Limit</label>
                        <input className="input" type="number" value={form.minimum_stock} onChange={e => setForm(f => ({ ...f, minimum_stock: e.target.value }))} placeholder="e.g. 5" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Current Stock (Read Only)</label>
                        <input className="input" type="number" value={form.current_stock} readOnly style={{ background: 'var(--surf3)', color: 'var(--txt2)' }} />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 🍰 DESSERTS INVENTORY SECTION */}
          {form.category_slug === 'desserts' && (
            <div className="card" style={{ marginBottom: 16, padding: 14 }}>
              <div
                className="card-header"
                style={{ marginBottom: dessertsCardOpen ? 12 : 0, cursor: 'pointer' }}
                onClick={() => setDessertsCardOpen(!dessertsCardOpen)}
              >
                <span className="card-title">🍰 Weight Inventory</span>
                {dessertsCardOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
              {dessertsCardOpen && (
                <div>
                  <div className="form-check">
                    <Toggle checked={form.inventory_enabled} onChange={v => setForm(f => ({ ...f, inventory_enabled: v }))} />
                    <span>Enable Inventory</span>
                  </div>
                  {form.inventory_enabled && (
                    <div className="form-grid-2">
                      <div className="form-group">
                        <label className="form-label">Stock Unit</label>
                        <select className="select" value={form.stock_unit} onChange={e => setForm(f => ({ ...f, stock_unit: e.target.value }))} style={{ width: '100%' }}>
                          <option value="gram">Gram</option>
                          <option value="kilogram">Kilogram</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Current Weight</label>
                        <input className="input" type="number" step="0.01" value={form.current_weight} onChange={e => setForm(f => ({ ...f, current_weight: e.target.value }))} placeholder="0.00" />
                      </div>
                      <div className="form-group" style={{ gridColumn: 'span 2' }}>
                        <label className="form-label">Minimum Stock (Weight)</label>
                        <input className="input" type="number" value={form.minimum_stock} onChange={e => setForm(f => ({ ...f, minimum_stock: e.target.value }))} placeholder="e.g. 500" />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="modal-actions">
            <button className="btn btn-gold" onClick={handleSave} disabled={saving || uploadingImg}>
              {uploadingImg ? 'Uploading image...' : saving ? 'Saving...' : 'Save Product'}
            </button>
            <button className="btn btn-ghost" onClick={closeModal}>Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  )
}