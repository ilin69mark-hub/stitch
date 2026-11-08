"use client";

import * as React from "react";
import { calculatePrice, evaluatePromo, type PromoEvaluation } from "@/lib/pricing";
import { MAX_QUANTITY } from "@/config/pricing";
import type {
  CartItem,
  NewCartItem,
  PriceBreakdown,
  PriceInput,
} from "@/types";

const STORAGE_KEY = "stezhok-cart-v1";

interface CartContextValue {
  items: CartItem[];
  hydrated: boolean;
  isOpen: boolean;
  lines: Array<{ item: CartItem; breakdown: PriceBreakdown }>;
  itemsTotal: number;
  discount: number;
  total: number;
  promo: PromoEvaluation | null;
  promoCode: string | null;
  openCart: () => void;
  closeCart: () => void;
  addItem: (item: NewCartItem) => void;
  updateItem: (key: string, item: NewCartItem) => void;
  removeItem: (key: string) => void;
  setQuantity: (key: string, quantity: number) => void;
  clearCart: () => void;
  setPromoCode: (code: string | null) => void;
}

const CartContext = React.createContext<CartContextValue | null>(null);

function toPriceInput(item: CartItem): PriceInput {
  if (item.kind === "box") {
    return { kind: "box", boxId: item.boxId, quantity: item.quantity };
  }
  if (item.kind === "custom") {
    return {
      kind: "custom",
      widthCm: item.widthCm,
      heightCm: item.heightCm,
      kitId: item.kitId,
      optionIds: item.optionIds,
      quantity: item.quantity,
    };
  }
  return {
    kind: "design",
    designId: item.designId,
    widthCm: item.widthCm,
    heightCm: item.heightCm,
    kitId: item.kitId,
    optionIds: item.optionIds,
    quantity: item.quantity,
  };
}

export function priceInputFor(item: CartItem): PriceInput {
  return toPriceInput(item);
}

function signature(item: NewCartItem): string {
  if (item.kind === "box") return `box:${item.boxId}`;
  const options = [...new Set(item.optionIds)].sort().join(",");
  if (item.kind === "custom") {
    return `custom:${item.uploadId}:${item.widthCm}x${item.heightCm}:${item.kitId}:${options}`;
  }
  return `design:${item.designId}:${item.widthCm}x${item.heightCm}:${item.kitId}:${options}`;
}

function isStoredItem(value: unknown): value is CartItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<CartItem>;
  if (typeof item.key !== "string" || typeof item.addedAt !== "number") {
    return false;
  }
  if (item.kind === "box") {
    return typeof item.boxId === "string" && typeof item.quantity === "number";
  }
  if (item.kind === "custom") {
    return (
      typeof item.uploadId === "string" &&
      typeof item.uploadToken === "string" &&
      typeof item.fileName === "string" &&
      typeof item.widthCm === "number" &&
      typeof item.heightCm === "number" &&
      typeof item.kitId === "string" &&
      Array.isArray(item.optionIds) &&
      typeof item.quantity === "number"
    );
  }
  if (item.kind === "design") {
    return (
      typeof item.designId === "string" &&
      typeof item.widthCm === "number" &&
      typeof item.heightCm === "number" &&
      typeof item.kitId === "string" &&
      Array.isArray(item.optionIds) &&
      typeof item.quantity === "number"
    );
  }
  return false;
}

function isValidItem(item: CartItem): boolean {
  try {
    calculatePrice(toPriceInput(item));
    return true;
  } catch {
    return false;
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<CartItem[]>([]);
  const [promoCode, setPromoCodeState] = React.useState<string | null>(null);
  const [hydrated, setHydrated] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as {
            items?: unknown;
            promoCode?: unknown;
          };
          if (Array.isArray(parsed.items)) {
            setItems(
              parsed.items
                .filter(isStoredItem)
                .filter(isValidItem)
                .slice(0, 50),
            );
          }
          if (typeof parsed.promoCode === "string") {
            setPromoCodeState(parsed.promoCode);
          }
        }
      } catch {
        // A corrupted cart must not break the storefront.
      } finally {
        setHydrated(true);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ items, promoCode }),
      );
    } catch {
      // Storage may be unavailable or full; the cart still works in memory.
    }
  }, [items, promoCode, hydrated]);

  const addItem = React.useCallback((item: NewCartItem) => {
    setItems((current) => {
      const sig = signature(item);
      const index = current.findIndex((entry) => signature(entry) === sig);
      if (index >= 0) {
        const existing = current[index]!;
        const next = [...current];
        next[index] = {
          ...existing,
          quantity: Math.min(
            MAX_QUANTITY,
            existing.quantity + item.quantity,
          ),
        };
        return next;
      }
      return [
        ...current,
        {
          ...item,
          key: crypto.randomUUID(),
          addedAt: Date.now(),
        } as CartItem,
      ];
    });
    setIsOpen(true);
  }, []);

  const updateItem = React.useCallback(
    (key: string, item: NewCartItem) => {
      setItems((current) =>
        current.map((entry) =>
          entry.key === key
            ? ({ ...item, key: entry.key, addedAt: entry.addedAt } as CartItem)
            : entry,
        ),
      );
    },
    [],
  );

  const removeItem = React.useCallback((key: string) => {
    setItems((current) => current.filter((entry) => entry.key !== key));
  }, []);

  const setQuantity = React.useCallback((key: string, quantity: number) => {
    setItems((current) =>
      current.map((entry) =>
        entry.key === key
          ? {
              ...entry,
              quantity: Math.max(1, Math.min(MAX_QUANTITY, quantity)),
            }
          : entry,
      ),
    );
  }, []);

  const clearCart = React.useCallback(() => {
    setItems([]);
    setPromoCodeState(null);
  }, []);

  const setPromoCode = React.useCallback((code: string | null) => {
    setPromoCodeState(code ? code.trim().toUpperCase() : null);
  }, []);

  const lines = React.useMemo(() => {
    return items.flatMap((item) => {
      try {
        return [{ item, breakdown: calculatePrice(toPriceInput(item)) }];
      } catch {
        return [];
      }
    });
  }, [items]);

  const itemsTotal = React.useMemo(
    () => lines.reduce((sum, line) => sum + line.breakdown.itemsTotal, 0),
    [lines],
  );

  const promo = React.useMemo(
    () => (promoCode ? evaluatePromo(promoCode, itemsTotal) : null),
    [promoCode, itemsTotal],
  );

  const discount = promo?.valid ? promo.discount : 0;

  const value: CartContextValue = {
    items,
    hydrated,
    isOpen,
    lines,
    itemsTotal,
    discount,
    total: Math.max(0, itemsTotal - discount),
    promo,
    promoCode,
    openCart: () => setIsOpen(true),
    closeCart: () => setIsOpen(false),
    addItem,
    updateItem,
    removeItem,
    setQuantity,
    clearCart,
    setPromoCode,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = React.useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
}
