import{ LayoutDashboard, ShoppingCart, Users, BarChart3,  Settings, UtensilsCrossed, ClipboardList, Menu } from 'lucide-react'
export const ADMIN_NAV = [
    {
        group: 'Overview', items: [
            { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
            { id: 'analytics', label: 'Analytics', Icon: BarChart3 },
        ]
    },
    {
        group: 'Management', items: [
            { id: 'products', label: 'Products', Icon: UtensilsCrossed },
            { id: 'orders', label: 'Orders', Icon: ClipboardList },
            { id: 'users', label: 'Users', Icon: Users },
        ]
    },
    {
        group: 'System', items: [
            { id: 'settings', label: 'Settings', Icon: Settings },
        ]
    },
]

export const CASHIER_NAV = [
    {
        group: 'Cashier', items: [
            { id: 'pos', label: 'POS Terminal', Icon: ShoppingCart },
            { id: 'orders', label: 'My Orders', Icon: ClipboardList },
        ]
    },
]