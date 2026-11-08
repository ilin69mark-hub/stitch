export type CategoryId =
  | "animals"
  | "portraits"
  | "nature"
  | "flowers"
  | "city"
  | "abstract"
  | "gifts"
  | "kids";

export interface Category {
  id: CategoryId;
  title: string;
  short: string;
  description: string;
}

export type SizePresetId = "5x5" | "10x5" | "10x10" | "20x20" | "30x30";

export interface SizePreset {
  id: SizePresetId;
  label: string;
  widthCm: number;
  heightCm: number;
}

export interface Kit {
  id: string;
  title: string;
  short: string;
  description: string;
  price: number;
  includes: string[];
  badge?: string;
}

export interface ExtraOption {
  id: string;
  title: string;
  description: string;
  price: number;
}

export interface Design {
  id: string;
  slug: string;
  title: string;
  categoryId: CategoryId;
  image: string;
  alt: string;
  description: string;
  paletteSize: number;
  featured?: boolean;
  availableSizes: SizePresetId[];
}

export interface Box {
  id: string;
  title: string;
  tagline: string;
  image: string;
  alt: string;
  price: number;
  compareAtPrice?: number;
  sizeLabel: string;
  composition: string[];
  terms: string;
  badge?: string;
}

export type PromoKind = "percent";

export interface Promo {
  code: string;
  kind: PromoKind;
  percent: number;
  active: boolean;
  startsAt?: string;
  endsAt?: string;
  minSubtotal: number;
  maxDiscount?: number;
  onePerCustomer: boolean;
  firstOrderOnly: boolean;
  stackable: false;
  description: string;
}

export interface DesignSelection {
  kind: "design";
  designId: string;
  widthCm: number;
  heightCm: number;
  kitId: string;
  optionIds: string[];
  quantity: number;
}

export interface CustomSelection {
  kind: "custom";
  widthCm: number;
  heightCm: number;
  kitId: string;
  optionIds: string[];
  quantity: number;
}

export interface BoxSelection {
  kind: "box";
  boxId: string;
  quantity: number;
}

export type PriceInput = DesignSelection | CustomSelection | BoxSelection;

export interface PriceBreakdown {
  kind: PriceInput["kind"];
  title: string;
  designPrice: number;
  kitPrice: number;
  optionsPrice: number;
  subtotal: number;
  quantity: number;
  itemsTotal: number;
  widthCm?: number;
  heightCm?: number;
  areaCm2?: number;
}

export interface CartItemBase {
  key: string;
  addedAt: number;
}

export type CartItemPayload =
  | {
      kind: "design";
      designId: string;
      widthCm: number;
      heightCm: number;
      kitId: string;
      optionIds: string[];
      quantity: number;
    }
  | {
      kind: "custom";
      uploadId: string;
      uploadToken: string;
      fileName: string;
      previewDataUrl?: string;
      widthCm: number;
      heightCm: number;
      kitId: string;
      optionIds: string[];
      quantity: number;
      comment?: string;
    }
  | {
      kind: "box";
      boxId: string;
      quantity: number;
    };

export type CartItem = CartItemBase & CartItemPayload;

export type NewCartItem = CartItemPayload;

export interface AppliedPromo {
  code: string;
  discount: number;
  description: string;
}

export interface OrderCustomer {
  name: string;
  email: string;
  phone?: string;
  contactMethod: string;
  deliveryMethod: string;
  comment?: string;
}

export type OrderStatus =
  | "awaiting_payment"
  | "paid"
  | "processing"
  | "shipped"
  | "cancelled"
  | "payment_failed";

export type PaymentStatus =
  | "not_configured"
  | "pending"
  | "paid"
  | "failed"
  | "cancelled";

export interface PublicOrderItem {
  kind: "design" | "custom" | "box";
  title: string;
  subtitle: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  widthCm?: number;
  heightCm?: number;
  previewUrl?: string;
}

export interface PublicOrder {
  id: string;
  number: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentProvider: string;
  subtotal: number;
  discount: number;
  total: number;
  currency: string;
  customerName: string;
  customerEmail: string;
  createdAt: string;
  promoCode: string | null;
  items: PublicOrderItem[];
  paymentConfigured: boolean;
  paymentUrl: string | null;
}
