// SETTINGS VIEW
// ─────────────────────────────────────────────────────────────
import { useEffect, useState } from "react"
import { Settings, User, Lock } from 'lucide-react'
import { useSettings } from '../context/SettingsContext.jsx'
import { useOrders } from '../context/OrdersContext.jsx'
function SettingRow({ label, sub, children }) {
    return (
        <div className="setting-row">
            <div>
                <div className="setting-label">{label}</div>
                <div className="setting-sub">{sub}</div>
            </div>
            {children}
        </div>
    )
}
export default function SettingsPage({ showToast }) {
    const { settings, save } = useSettings()
    const { setVatRate } = useOrders()
    const [form, setForm] = useState({})
    const [saving, setSaving] = useState(false)

    useEffect(() => { if (settings) setForm(settings) }, [settings])

    async function handleSave() {
        setSaving(true)
        const updatedVatRate = form.vat_rate !== '' ? parseFloat(form.vat_rate) : 0;
        const payload = { ...form, vat_rate: updatedVatRate };
        const { error } = await save(payload)
        setSaving(false)
        if (error) { showToast(error, 'error'); return }
        showToast('Settings saved!', 'success')
        setVatRate(updatedVatRate)
    }

    const field = k => ({
        value: form[k] || '',
        onChange: e => setForm(f => ({ ...f, [k]: e.target.value })),
    })

    return (
        <div className="scroll-view">
            <div className="card settings-card">
                <div className="page-title" style={{ marginBottom: 6 }}>Restaurant Settings</div>
                <div className="page-sub" style={{ marginBottom: 24 }}>Changes are saved to your Supabase database</div>

                <SettingRow label="Restaurant Name" sub="Shown on receipts and reports">
                    <input className="input input-sm" {...field('name')} />
                </SettingRow>
                <SettingRow label="اسم المطعم" sub="Arabic name for bilingual receipts">
                    <input className="input input-sm" {...field('name_ar')} dir="rtl" />
                </SettingRow>
                <SettingRow label="VAT Rate (%)" sub="UAE standard VAT is 5%">
                    <input className="input" type="number" min="0" max="100" {...field('vat_rate')} style={{ width: 90 }} />
                </SettingRow>
                <SettingRow label="Currency" sub="UAE Dirham — fixed">
                    <span className="badge badge-gold">AED ﺩ.ﺇ</span>
                </SettingRow>
                <SettingRow label="Phone" sub="Displayed on receipts">
                    <input className="input input-sm" {...field('phone')} />
                </SettingRow>
                <SettingRow label="TRN" sub="Tax Registration Number">
                    <input className="input input-sm" {...field('trn')} />
                </SettingRow>
                <SettingRow label="Receipt Footer" sub="Thank-you message on receipts">
                    <input className="input" {...field('receipt_footer')} style={{ width: 280 }} />
                </SettingRow>

                <div style={{ marginTop: 24 }}>
                    <button className="btn btn-gold" onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving…' : 'Save Settings'}
                    </button>
                </div>
            </div>
        </div>
    )
}