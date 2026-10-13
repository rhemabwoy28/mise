export type Page = 'Overview' | 'Inventory' | 'Point of sale' | 'Purchases' | 'Invoices' | 'Reports'

export type Product = {
  id: string
  name: string
  category: string
  unit: string
  onHand: number
  reorderAt: number
  unitCost: number
  supplier: string
  sku: string
  expiry?: string
}

export type RecipeLine = { productId: string; quantity: number }
export type MenuItem = {
  id: string
  name: string
  category: string
  price: number
  emoji: string
  description: string
  recipe: RecipeLine[]
}

export type StockMovement = {
  id: string
  productId: string
  delta: number
  reason: string
  reference: string
  at: string
}

export type PurchaseOrder = {
  id: string
  supplier: string
  createdAt: string
  expectedAt: string
  status: 'Ordered' | 'Received'
  items: { productId: string; quantity: number; unitCost: number }[]
}

export type Invoice = {
  id: string
  customer: string
  createdAt: string
  status: 'Paid' | 'Due'
  payment: 'Cash' | 'Card' | 'Mobile money' | 'Bank transfer'
  lines: { name: string; quantity: number; unitPrice: number }[]
  subtotal: number
  tax: number
  total: number
}

export type AppData = {
  products: Product[]
  movements: StockMovement[]
  purchaseOrders: PurchaseOrder[]
  invoices: Invoice[]
}
