// ============================================================
// src/utils/financeUtils.js
// Finance Module Utilities
// ============================================================

/**
 * Format a number as AED currency string
 * @param {number} val
 * @param {number} decimals
 * @returns {string}
 */
export function fmtAED(val, decimals = 2) {
  const n = Number(val ?? 0)
  return n.toLocaleString('en-AE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/**
 * Format a date string to a readable locale string
 * @param {string} dateStr
 * @returns {string}
 */
export function fmtFinanceDate(dateStr) {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('en-AE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

/**
 * Get CSS class for expense category badge
 * @param {string} category
 * @returns {string}
 */
export function expenseCatClass(category) {
  const map = {
    food_ingredients: 'cat-food',
    tables_chairs: 'cat-tables',
    furniture_equipment: 'cat-furniture',
    more_expenses: 'cat-more',
  }
  return map[category] ?? 'cat-food'
}

/**
 * Validate Emirates ID format (basic: 15 digits)
 * @param {string} id
 * @returns {boolean}
 */
export function validateEmiratesId(id) {
  if (!id) return false
  const cleaned = id.replace(/[-\s]/g, '')
  return /^\d{15}$/.test(cleaned)
}

/**
 * Format Emirates ID with dashes: 784-XXXX-XXXXXXX-X
 * @param {string} id
 * @returns {string}
 */
export function formatEmiratesId(id) {
  if (!id) return '—'
  const cleaned = id.replace(/[-\s]/g, '')
  if (cleaned.length === 15) {
    return `${cleaned.slice(0,3)}-${cleaned.slice(3,7)}-${cleaned.slice(7,14)}-${cleaned.slice(14)}`
  }
  return id
}

/**
 * Net profit color class
 * @param {number} profit
 * @returns {string}
 */
export function profitColorClass(profit) {
  if (profit > 0) return 'dv-green'
  if (profit < 0) return 'dv-red'
  return 'dv-gold'
}

/**
 * Net profit card modifier class
 * @param {number} profit
 * @returns {string}
 */
export function profitCardClass(profit) {
  if (profit > 0) return 'dfc-profit'
  if (profit < 0) return 'dfc-loss'
  return 'dfc-profit'
}
// ============================================================
// Net Profit Helpers
// ============================================================

export function calcNetProfit(revenue = 0, salaries = 0, expenses = 0) {
  return Number(revenue) - Number(salaries) - Number(expenses)
}

export function isProfitable(profit = 0) {
  return Number(profit) > 0
}

export function getExpenseSubcategoryLabel(subcat) {
  switch (subcat) {
    case 'furniture_equipment':
      return 'Furniture & Equipment';
    case 'more_expenses':
      return 'More Expenses';
    default:
      return subcat || '';
  }
}
