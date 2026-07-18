import React from 'react'
import {
    DollarSign,
    Users,
    ShoppingBag,
    TrendingUp,
    TrendingDown,
    ShoppingCart,
    Wallet,
    CreditCard,
    Percent
} from 'lucide-react'

// ======================================================
// Card Configurations
// ======================================================

const CARD_CONFIGS = {
    revenue: {
        icon: DollarSign,
        cardClass: 'usc-revenue',
        iconClass: 'usc-icon-revenue',
        valClass: 'uv-gold',
    },

    salary: {
        icon: Users,
        cardClass: 'usc-salary',
        iconClass: 'usc-icon-salary',
        valClass: 'uv-blue',
    },

    expense: {
        icon: ShoppingBag,
        cardClass: 'usc-expense',
        iconClass: 'usc-icon-expense',
        valClass: 'uv-amber',
    },

    profit: {
        icon: TrendingUp,
        cardClass: 'usc-profit',
        iconClass: 'usc-icon-profit',
        valClass: 'uv-green',
    },

    loss: {
        icon: TrendingDown,
        cardClass: 'usc-loss',
        iconClass: 'usc-icon-loss',
        valClass: 'uv-red',
    },

    orders: {
        icon: ShoppingCart,
        cardClass: 'usc-orders',
        iconClass: 'usc-icon-orders',
        valClass: 'uv-green',
    },

    avg_order: {
        icon: Wallet,
        cardClass: 'usc-avg-order',
        iconClass: 'usc-icon-avg',
        valClass: 'uv-blue',
    },

    vat: {
        icon: Percent,
        cardClass: 'usc-vat',
        iconClass: 'usc-icon-vat',
        valClass: 'uv-amber',
    }
}

// ======================================================
// Component
// ======================================================

export default function UnifiedStatCards({
    cards = [],
    loading = false,
    className = ''
}) {
    return (
        <div className={`unified-stat-grid ${className}`}>
            {cards.map((card) => {
                const {
                    id,
                    label,
                    value,
                    rawValue,
                    type,
                    subtitle,
                    formula = false,
                } = card

                // Detect Profit / Loss
                let resolvedType = type

                if (
                    type === 'profit' &&
                    typeof rawValue === 'number' &&
                    rawValue < 0
                ) {
                    resolvedType = 'loss'
                }

                const config =
                    CARD_CONFIGS[resolvedType] || {
                        icon: CreditCard,
                        cardClass: 'usc-custom',
                        iconClass: 'usc-icon-custom',
                        valClass: 'uv-neutral',
                    }

                const IconComponent = config.icon

                return (
                    <div
                        key={id}
                        className={`unified-stat-card ${config.cardClass}`}
                    >
                        <div
                            className={`usc-icon-container ${config.iconClass}`}
                        >
                            <IconComponent size={16} />
                        </div>

                        <div className="usc-label">
                            {label}
                        </div>

                        {loading ? (
                            <div className="usc-skeleton-loader" />
                        ) : (
                            <div
                                className={`usc-value ${config.valClass}`}
                            >
                                {value}
                            </div>
                        )}

                        {subtitle && (
                            <div
                                className={
                                    formula
                                        ? 'usc-formula'
                                        : 'usc-subtitle'
                                }
                            >
                                {subtitle}
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}