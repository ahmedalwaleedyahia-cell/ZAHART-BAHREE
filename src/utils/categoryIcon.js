import {
    UtensilsCrossed,
    CupSoda,
    Cake,
    Package
} from 'lucide-react'

export const categoryIcons = {
    // المفاتيح بالإنجليزية (slug)
    food: UtensilsCrossed,
    drinks: CupSoda,
    desserts: Cake,

    // المفاتيح بالعربية (name)
    'وجبات': UtensilsCrossed,
    'المأكولات': UtensilsCrossed,
    'مشروبات': CupSoda,
    'المشروبات': CupSoda,
    'حلويات': Cake,
    'الحلويات': Cake,

    // أسماء الأيقونات المباشرة
    UtensilsCrossed,
    CupSoda,
    Cake,

    // الأيقونة الافتراضية
    default: Package
}

// دالة مساعدة للحصول على الأيقونة بأمان
export function getCategoryIcon(category) {
    if (!category) return categoryIcons.default

    const key = typeof category === 'string'
        ? category
        : (category.slug || category.icon || category.name)

    return categoryIcons[key] || categoryIcons.default
}