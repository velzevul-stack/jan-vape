import type { ProductCategory } from '@/lib/mock-data'

export interface CategoryFilterRules {
  showTaste: boolean
  showStrength: boolean
  showSpecification: boolean
  strengthLabel: string
}

const RULES: Record<ProductCategory, CategoryFilterRules> = {
  liquid: {
    showTaste: true,
    showStrength: true,
    showSpecification: true,
    strengthLabel: 'Крепость (mg)',
  },
  disposable: {
    showTaste: true,
    showStrength: true,
    showSpecification: true,
    strengthLabel: 'Крепость (mg)',
  },
  vape: {
    showTaste: false,
    showStrength: false,
    showSpecification: true,
    strengthLabel: 'Крепость',
  },
  snus: {
    showTaste: false,
    showStrength: true,
    showSpecification: false,
    strengthLabel: 'Крепость',
  },
  consumable: {
    showTaste: false,
    showStrength: false,
    showSpecification: true,
    strengthLabel: 'Крепость',
  },
}

export function getFilterRules(category: ProductCategory): CategoryFilterRules {
  return RULES[category]
}

export function mergeFilterRules(categories: readonly ProductCategory[]): CategoryFilterRules {
  if (categories.length === 0) {
    return {
      showTaste: false,
      showStrength: false,
      showSpecification: false,
      strengthLabel: 'Крепость',
    }
  }
  let showTaste = false
  let showStrength = false
  let showSpecification = false
  let strengthLabel = 'Крепость'
  let hasMg = false
  for (const c of categories) {
    const r = RULES[c]
    if (r.showTaste) showTaste = true
    if (r.showStrength) showStrength = true
    if (r.showSpecification) showSpecification = true
    if (r.strengthLabel.includes('mg')) {
      hasMg = true
      strengthLabel = r.strengthLabel
    } else if (!hasMg) {
      strengthLabel = r.strengthLabel
    }
  }
  return { showTaste, showStrength, showSpecification, strengthLabel }
}

export function slugifyForAnchor(value: string): string {
  return value
    .toString()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9а-я]+/giu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}
