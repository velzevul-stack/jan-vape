'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { type Product, type CartItem, productAvailableStock } from '@/lib/mock-data'
import { resolveCartLinesAgainstCatalog } from '@/lib/api/catalogClient'
import { fetchTgSession } from '@/lib/tgSessionClient'

interface CartContextType {
  items: CartItem[]
  addItem: (product: Product, quantity?: number) => boolean
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => boolean
  clearCart: () => void
  syncWithCatalog: (products: Product[]) => void
  getItemQuantity: (productId: string) => number
  totalItems: number
  totalPrice: number
  isTgVerified: boolean
  maxCartQuantity: number | null
  cartLimitMessage: string | null
}

const CartContext = createContext<CartContextType | undefined>(undefined)

const CART_STORAGE_KEY = 'vapestore-cart'

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isHydrated, setIsHydrated] = useState(false)
  const [isTgVerified, setIsTgVerified] = useState(false)
  const [maxCartQuantity, setMaxCartQuantity] = useState<number | null>(null)
  const [cartLimitMessage, setCartLimitMessage] = useState<string | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem(CART_STORAGE_KEY)
    if (stored) {
      try {
        setItems(JSON.parse(stored))
      } catch {
        localStorage.removeItem(CART_STORAGE_KEY)
      }
    }
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    fetchTgSession()
      .then((info) => {
        setIsTgVerified(info.verified)
        setMaxCartQuantity(info.maxCartQuantity)
      })
      .catch(() => {
        setIsTgVerified(false)
        setMaxCartQuantity(null)
      })
  }, [])

  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
    }
  }, [items, isHydrated])

  const capQuantity = useCallback(
    (nextTotal: number): boolean => {
      if (maxCartQuantity == null || nextTotal <= maxCartQuantity) {
        setCartLimitMessage(null)
        return true
      }
      setCartLimitMessage(
        `Без подтверждённого Telegram в корзине можно не более ${maxCartQuantity} товаров.`,
      )
      return false
    },
    [maxCartQuantity],
  )

  const addItem = useCallback(
    (product: Product, quantity: number = 1) => {
      let allowed = true
      setItems((prev) => {
        const currentTotal = prev.reduce((sum, item) => sum + item.quantity, 0)
        const existing = prev.find((item) => item.product.id === product.id)
        const nextTotal = currentTotal + quantity
        if (!capQuantity(nextTotal)) {
          allowed = false
          return prev
        }
        if (existing) {
          return prev.map((item) =>
            item.product.id === product.id
              ? {
                  ...item,
                  quantity: Math.min(item.quantity + quantity, productAvailableStock(product)),
                }
              : item,
          )
        }
        return [...prev, { product, quantity }]
      })
      return allowed
    },
    [capQuantity],
  )

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => {
      const next = prev.filter((item) => item.product.id !== productId)
      setCartLimitMessage(null)
      return next
    })
  }, [])

  const updateQuantity = useCallback(
    (productId: string, quantity: number) => {
      if (quantity <= 0) {
        removeItem(productId)
        return true
      }
      let allowed = true
      setItems((prev) => {
        const currentTotal = prev.reduce((sum, item) => sum + item.quantity, 0)
        const existing = prev.find((item) => item.product.id === productId)
        const delta = quantity - (existing?.quantity ?? 0)
        const nextTotal = currentTotal + delta
        if (!capQuantity(nextTotal)) {
          allowed = false
          return prev
        }
        return prev.map((item) =>
          item.product.id === productId
            ? { ...item, quantity: Math.min(quantity, productAvailableStock(item.product)) }
            : item,
        )
      })
      return allowed
    },
    [capQuantity, removeItem],
  )

  const clearCart = useCallback(() => {
    setItems([])
    setCartLimitMessage(null)
  }, [])

  const syncWithCatalog = useCallback((products: Product[]) => {
    setItems((prev) => {
      if (prev.length === 0) return prev
      const { lines } = resolveCartLinesAgainstCatalog(prev, products)
      return lines
    })
  }, [])

  const getItemQuantity = useCallback(
    (productId: string) => {
      return items.find((item) => item.product.id === productId)?.quantity ?? 0
    },
    [items],
  )

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalPrice = items.reduce((sum, item) => sum + item.product.retailPrice * item.quantity, 0)

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        syncWithCatalog,
        getItemQuantity,
        totalItems,
        totalPrice,
        isTgVerified,
        maxCartQuantity,
        cartLimitMessage,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
