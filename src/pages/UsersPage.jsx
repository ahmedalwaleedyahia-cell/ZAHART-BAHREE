import { useAuth } from '../context/AuthContext.jsx'
import Modal from '../components/ui/Modal.jsx'
import Skeleton from '../components/ui/Skeleton.jsx'
import React, { useEffect, useState, useCallback } from 'react'
import { Eye, EyeOff, Trash2 } from 'lucide-react' // استيراد الأيقونات المطلوبة بالتحديد

import {
  fetchAllProfiles,
  createCashierAccount,
  deactivateUser
} from '../services/authService.js'

export default function UsersPage({ showToast }) {
  const { profile: me } = useAuth()

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false) // حالة إظهار/إخفاء كلمة المرور

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: ''
  })

  /* ───────────── SAFE LOAD ───────────── */
  const load = useCallback(async () => {
    try {
      setLoading(true)

      const res = await fetchAllProfiles()

      if (res?.error) {
        showToast(res.error, 'error')
        setUsers([])
        return
      }

      setUsers(res?.data || [])

    } catch (err) {
      console.error(err)
      showToast(err.message, 'error')
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    load()
  }, [load])

  /* ───────────── CREATE CASHIER ───────────── */
  async function handleCreate() {
    if (saving) return

    const { fullName, email, password } = form

    if (!fullName || !email || !password) {
      showToast('All fields are required', 'error')
      return
    }

    try {
      setSaving(true)

      const res = await createCashierAccount({
        fullName: fullName.trim(),
        email: email.trim(),
        password
      })

      if (res?.error) {
        showToast(res.error, 'error')
        return
      }

      showToast('Cashier account created', 'success')

      setForm({ fullName: '', email: '', password: '' })
      setModalOpen(false)
      setShowPassword(false)

      await load()

    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  /* ───────────── DEACTIVATE ───────────── */
  async function handleDeactivate(id) {
    if (!confirm('Deactivate this user?')) return

    try {
      const res = await deactivateUser(id)

      if (res?.error) {
        showToast(res.error, 'error')
        return
      }

      showToast('User deactivated', 'success')

      await load()

    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  /* ───────────── RENDER ───────────── */
  return (
    <div className="scroll-view">

      {/* HEADER */}
      <div className="page-header">
        <div>
          <div className="page-title">User Management</div>
          <div className="page-sub">Admin and cashier accounts</div>
        </div>

        {me?.role === 'admin' && (
          <button
            className="btn btn-gold"
            onClick={() => setModalOpen(true)}
          >
            + Add Cashier
          </button>
        )}
      </div>

      {/* LIST */}
      {loading ? (
        <Skeleton rows={5} />
      ) : (
        <div className="user-list">

          {users
            .filter(u => !u.is_deleted) // 🔥 مهم مع soft delete
            .map(user => (
              <div key={user.id} className="user-row">

                <div className="user-info">
                  <div className="user-name-lg">
                    {user.full_name}
                  </div>

                  <div className="user-email">
                    {user.email}
                  </div>
                </div>

                <span
                  className={`badge ${user.role === 'admin'
                    ? 'badge-gold'
                    : 'badge-blue'
                    }`}
                >
                  {user.role}
                </span>

                {!user.is_active && (
                  <span className="badge badge-red">
                    Inactive
                  </span>
                )}

                {/* ADMIN ONLY ACTIONS */}
                {me?.role === 'admin' &&
                  user.role !== 'admin' &&
                  user.id !== me?.id &&
                  user.is_active && (
                    <div className="ft-actions">
                      <button
                        className="btn-icon btn-icon-danger"
                        onClick={() => handleDeactivate(user.id)}
                        title="Soft Delete User"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
              </div>
            ))}

        </div>
      )}

      {/* MODAL */}
      {modalOpen && (
        <Modal onClose={() => { setModalOpen(false); setShowPassword(false); }}>

          <div className="modal-title">
            Create Cashier
          </div>

          <div className="form-group">
            <label>Full Name</label>
            <input
              className="input"
              value={form.fullName}
              onChange={(e) =>
                setForm({ ...form, fullName: e.target.value })
              }
            />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              className="input"
              value={form.email}
              onChange={(e) =>
                setForm({ ...form, email: e.target.value })
              }
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                className="input"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) =>
                  setForm({ ...form, password: e.target.value })
                }
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--txt3)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="modal-actions">
            <button
              className="btn btn-gold"
              disabled={saving}
              onClick={handleCreate}
            >
              {saving ? 'Creating...' : 'Create'}
            </button>

            <button
              className="btn btn-ghost"
              onClick={() => { setModalOpen(false); setShowPassword(false); }}
            >
              Cancel
            </button>
          </div>

        </Modal>
      )}

    </div>
  )
}