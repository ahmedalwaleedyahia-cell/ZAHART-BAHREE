// ============================================================
// src/services/financeService.js
// ============================================================

import { supabase } from '../supabase/supabase.js'

// ── Table names ──────────────────────────────────────────────
export const FINANCE_TABLES = {
  SALARIES: 'finance_salaries',
  EXPENSES: 'finance_expenses',
  SALARY_PAYMENTS: 'salary_payments',
}

export const FINANCE_VIEWS = {
  SUMMARY: 'v_finance_summary',
}

export const EXPENSE_CATEGORIES = {
  FOOD: 'food_ingredients',
  FURNITURE: 'furniture_equipment',
}

export const EXPENSE_SUBCATEGORIES = {
  FURNITURE_EQUIPMENT: 'furniture_equipment',
  MORE_EXPENSES: 'more_expenses',
}

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
// SALARY PAYMENTS OPERATIONS
// ============================================================

export async function fetchSalaryPayments(options = {}) {
  let query = supabase
    .from(FINANCE_TABLES.SALARY_PAYMENTS)
    .select('*')
    .order('payment_date', { ascending: false })

  if (options.dateFrom) query = query.gte('payment_date', options.dateFrom)
  if (options.dateTo) query = query.lte('payment_date', options.dateTo)

  const { data, error } = await query
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
    .neq('id', '00000000-0000-0000-0000-000000000000')

  if (error) return { error: error.message }
  return { error: null }
}

// ============================================================
// EXPENSE OPERATIONS
// ============================================================

export async function fetchExpenses(category = null, options = {}) {
  let query = supabase
    .from(FINANCE_TABLES.EXPENSES)
    .select('*')
    .order('created_at', { ascending: false })

  if (category) query = query.eq('category', category)
  if (options.dateFrom) query = query.gte('expense_date', options.dateFrom)
  if (options.dateTo) query = query.lte('expense_date', options.dateTo)

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

export async function fetchTotalExpenses(options = {}) {
  let query = supabase
    .from(FINANCE_TABLES.EXPENSES)
    .select('cost')

  if (options.dateFrom) query = query.gte('expense_date', options.dateFrom)
  if (options.dateTo) query = query.lte('expense_date', options.dateTo)

  const { data, error } = await query
  if (error) return { total: 0, error: error.message }
  const total = (data || []).reduce((sum, r) => sum + Number(r.cost || 0), 0)
  return { total, error: null }
}

// ============================================================
// FINANCE SUMMARY (Filtered Net Profit Calculation)
// ============================================================

export async function fetchFinanceSummary({ dateFrom, dateTo } = {}) {
  try {
    let ordersQuery = supabase
      .from('orders')
      .select('id, total_amount, payment_method, status, vat_amount, created_at')
      .neq('status', 'cancelled')

    let expensesQuery = supabase
      .from('expenses')
      .select('id, amount, expense_date')

    let salariesQuery = supabase
      .from('salary_payments')
      .select('id, amount, payment_date')

    if (dateFrom) {
      const fromIso = `${dateFrom}T00:00:00.000Z`
      ordersQuery = ordersQuery.gte('created_at', fromIso)
      expensesQuery = expensesQuery.gte('expense_date', dateFrom)
      salariesQuery = salariesQuery.gte('payment_date', dateFrom)
    }

    if (dateTo) {
      const toIso = `${dateTo}T23:59:59.999Z`
      ordersQuery = ordersQuery.lte('created_at', toIso)
      expensesQuery = expensesQuery.lte('expense_date', dateTo)
      salariesQuery = salariesQuery.lte('payment_date', dateTo)
    }

    const [ordersRes, expensesRes, salariesRes] = await Promise.all([
      ordersQuery,
      expensesQuery,
      salariesQuery
    ])

    if (ordersRes.error) throw ordersRes.error
    if (expensesRes.error) throw expensesRes.error
    if (salariesRes.error) throw salariesRes.error

    const orders = ordersRes.data || []
    const expenses = expensesRes.data || []
    const salaries = salariesRes.data || []

    let total_revenue = 0
    let cash_sales = 0
    let visa_sales = 0
    let vat_collected = 0

    orders.forEach(order => {
      const amount = Number(order.total_amount) || 0
      const vat = Number(order.vat_amount) || 0
      const method = (order.payment_method || '').toLowerCase().trim()

      total_revenue += amount
      vat_collected += vat

      if (method === 'cash') {
        cash_sales += amount
      } else if (method === 'visa' || method === 'card' || method === 'mastercard') {
        visa_sales += amount
      }
    })

    const total_expenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
    const salaries_paid = salaries.reduce((sum, s) => sum + (Number(s.amount) || 0), 0)

    // حساب صافي الربح: (إجمالي المبيعات - ضريبة القيمة المضافة) - المصروفات - الرواتب المدفوعة فعلياً
    const net_profit = (total_revenue - vat_collected) - total_expenses - salaries_paid

    return {
      total_revenue,
      cash_sales,
      visa_sales,
      vat_collected,
      total_expenses,
      salaries_paid,
      net_profit,
      orders_count: orders.length
    }
  } catch (error) {
    console.error('Error in fetchFinanceSummary:', error)
    throw error
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