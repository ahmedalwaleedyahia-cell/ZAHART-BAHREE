// ============================================================
// src/services/financeService.js
// Finance Module — Salaries + Expenses + Profit Calculation
// ============================================================

import { supabase } from '../supabase/supabase.js'

// ── Table names ──────────────────────────────────────────────
export const FINANCE_TABLES = {
  SALARIES: 'finance_salaries',
  EXPENSES: 'finance_expenses',
  SALARY_PAYMENTS: 'salary_payments', // Connected to Supabase Table
}

export const FINANCE_VIEWS = {
  SUMMARY: 'v_finance_summary',
}

// ── EXPENSE_CATEGORIES (كائن للتحققات الشرطية داخل المكونات) ──
export const EXPENSE_CATEGORIES = {
  FOOD: 'food_ingredients',
  FURNITURE: 'furniture_equipment',
}

export const EXPENSE_SUBCATEGORIES = {
  FURNITURE_EQUIPMENT: 'furniture_equipment',
  MORE_EXPENSES: 'more_expenses',
}

// ── EXPENSE_CATEGORIES_LIST (مصفوفة لعمل .map() داخل القوائم والصفحات) ──
export const EXPENSE_CATEGORIES_LIST = [
  {
    value: 'food_ingredients',
    label: 'Food & Ingredients',
    labelAr: 'مواد غذائية',
    emoji: '🥩',
    group: 'A',
  },
  {
    value: 'furniture_equipment',
    label: 'Furniture & Equipment',
    labelAr: 'أثاث ومعدات',
    emoji: '🪞',
    group: 'B',
  },
  {
    value: '...more_expenses',
    label: '...More Expenses',
    labelAr: 'مصروفات أخرى',
    emoji: '🍳',
    group: 'B',
  },
]

// ============================================================
// SALARY OPERATIONS
// ============================================================

export async function fetchSalaries() {
  const { data, error } = await supabase
    .from(FINANCE_TABLES.SALARIES)
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return { data: [], error: error.message }
  return { data, error: null }
}

export async function createSalary(payload) {
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from(FINANCE_TABLES.SALARIES)
    .insert({
      employee_name: payload.employee_name,
      emirates_id: payload.emirates_id,
      monthly_salary: Number(payload.monthly_salary),
      job_title: payload.job_title || null,
      notes: payload.notes || null,
      is_active: true,
      created_by: user?.id,
    })
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

export async function updateSalary(id, payload) {
  const { data, error } = await supabase
    .from(FINANCE_TABLES.SALARIES)
    .update({
      employee_name: payload.employee_name,
      emirates_id: payload.emirates_id,
      monthly_salary: Number(payload.monthly_salary),
      job_title: payload.job_title || null,
      notes: payload.notes || null,
      is_active: payload.is_active ?? true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

export async function deleteSalary(id) {
  const { error } = await supabase
    .from(FINANCE_TABLES.SALARIES)
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }
  return { error: null }
}

export async function fetchTotalSalaries() {
  const { data, error } = await supabase
    .from(FINANCE_TABLES.SALARIES)
    .select('monthly_salary')
    .eq('is_active', true)

  if (error) return { total: 0, error: error.message }
  const total = (data || []).reduce((sum, r) => sum + Number(r.monthly_salary || 0), 0)
  return { total, error: null }
}

// ============================================================
// SALARY PAYMENTS OPERATIONS (SUPABASE CONNECTED)
// ============================================================

export async function fetchSalaryPayments() {
  const { data, error } = await supabase
    .from(FINANCE_TABLES.SALARY_PAYMENTS)
    .select('*')
    .order('payment_date', { ascending: false })

  if (error) return { data: [], error: error.message }
  return { data, error: null }
}

export async function createSalaryPayment(payload) {
  const { data, error } = await supabase
    .from(FINANCE_TABLES.SALARY_PAYMENTS)
    .insert({
      employee_id: payload.employee_id,
      employee_name: payload.employee_name,
      job_title: payload.job_title,
      amount: Number(payload.amount),
      payment_date: payload.payment_date,
      notes: payload.notes || null,
    })
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

export async function flushSalaryPayments() {
  const { error } = await supabase
    .from(FINANCE_TABLES.SALARY_PAYMENTS)
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000') // Deletes all rows safely

  if (error) return { error: error.message }
  return { error: null }
}

// ============================================================
// EXPENSE OPERATIONS
// ============================================================

export async function fetchExpenses(category = null) {
  let query = supabase
    .from(FINANCE_TABLES.EXPENSES)
    .select('*')
    .order('created_at', { ascending: false })

  if (category) query = query.eq('category', category)

  const { data, error } = await query
  if (error) return { data: [], error: error.message }
  return { data, error: null }
}

export async function createExpense(payload) {
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from(FINANCE_TABLES.EXPENSES)
    .insert({
      item_name: payload.item_name,
      invoice_number: payload.invoice_number || null,
      cost: Number(payload.cost),
      category: payload.category,
      subcategory: payload.subcategory || null,
      expense_date: payload.expense_date || new Date().toISOString().split('T')[0],
      notes: payload.notes || null,
      created_by: user?.id,
    })
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

export async function updateExpense(id, payload) {
  const { data, error } = await supabase
    .from(FINANCE_TABLES.EXPENSES)
    .update({
      item_name: payload.item_name,
      invoice_number: payload.invoice_number || null,
      cost: Number(payload.cost),
      category: payload.category,
      subcategory: payload.subcategory || null,
      expense_date: payload.expense_date,
      notes: payload.notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

export async function deleteExpense(id) {
  const { error } = await supabase
    .from(FINANCE_TABLES.EXPENSES)
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }
  return { error: null }
}

export async function fetchTotalExpenses() {
  const { data, error } = await supabase
    .from(FINANCE_TABLES.EXPENSES)
    .select('cost')

  if (error) return { total: 0, error: error.message }
  const total = (data || []).reduce((sum, r) => sum + Number(r.cost || 0), 0)
  return { total, error: null }
}

// ============================================================
// FINANCE SUMMARY (Net Profit)
// ============================================================

export async function fetchFinanceSummary() {
  const { data, error } = await supabase
    .from(FINANCE_VIEWS.SUMMARY)
    .select('*')
    .maybeSingle()

  if (!error && data) {
    return {
      totalSalaries: Number(data.total_salaries ?? data.totalSalaries ?? 0),
      salariesPaid: Number(data.salaries_paid ?? data.salariesPaid ?? 0),
      totalExpenses: Number(data.total_expenses ?? data.totalExpenses ?? 0),
      totalRevenue: Number(data.total_revenue ?? data.totalRevenue ?? 0),
      vatCollected: Number(data.vat_collected ?? data.vatCollected ?? 0),
      netProfit: Number(data.net_profit ?? data.netProfit ?? 0),
      data: {
        totalSalaries: Number(data.total_salaries ?? data.totalSalaries ?? 0),
        salariesPaid: Number(data.salaries_paid ?? data.salariesPaid ?? 0),
        totalExpenses: Number(data.total_expenses ?? data.totalExpenses ?? 0),
        total_revenue: Number(data.total_revenue ?? data.totalRevenue ?? 0),
        total_salaries: Number(data.total_salaries ?? data.totalSalaries ?? 0),
        salaries_paid: Number(data.salaries_paid ?? data.salariesPaid ?? 0),
        total_expenses: Number(data.total_expenses ?? data.totalExpenses ?? 0),
        vat_collected: Number(data.vat_collected ?? data.vatCollected ?? 0),
        net_profit: Number(data.net_profit ?? data.netProfit ?? 0),
      },
      error: null
    }
  }

  const [revenueRes, salariesRes, paymentsRes, expensesRes] = await Promise.all([
    supabase
      .from('orders')
      .select('total_amount, vat_amount')
      .eq('status', 'completed'),
    supabase
      .from(FINANCE_TABLES.SALARIES)
      .select('monthly_salary')
      .eq('is_active', true),
    supabase
      .from(FINANCE_TABLES.SALARY_PAYMENTS)
      .select('amount'),
    supabase
      .from(FINANCE_TABLES.EXPENSES)
      .select('cost'),
  ])

  const total_revenue = (revenueRes.data || [])
    .reduce((s, o) => s + Number(o.total_amount || 0), 0)
  const vat_collected = (revenueRes.data || [])
    .reduce((s, o) => s + Number(o.vat_amount || 0), 0)
  const total_salaries = (salariesRes.data || []).reduce((s, r) => s + Number(r.monthly_salary || 0), 0)
  const salaries_paid = (paymentsRes.data || []).reduce((s, p) => s + Number(p.amount || 0), 0)
  const total_expenses = (expensesRes.data || []).reduce((s, e) => s + Number(e.cost || 0), 0)
  const net_profit = total_revenue - salaries_paid - total_expenses - vat_collected

  return {
    totalSalaries: total_salaries,
    salariesPaid: salaries_paid,
    totalExpenses: total_expenses,
    totalRevenue: total_revenue,
    vatCollected: vat_collected,
    netProfit: net_profit,
    data: {
      total_revenue,
      total_salaries,
      salaries_paid,
      total_expenses,
      vat_collected,
      net_profit,
      totalSalaries: total_salaries,
      salariesPaid: salaries_paid,
      totalExpenses: total_expenses,
    },
    error: null,
  }
}

// ============================================================
// EXPENSE CATEGORY HELPERS
// ============================================================

export function getCategoryMeta(value) {
  return EXPENSE_CATEGORIES_LIST.find(c => c.value === value) || {
    value,
    label: value,
    emoji: '📦',
    group: 'B',
  }
}