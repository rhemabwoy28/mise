import type { AppData, MenuItem, Product } from './types'

export const CURRENCY = 'GHS'
export const TAX_RATE = 0.0

const expiryIn = (days: number) => {
  const date = new Date()
  date.setDate(date.getDate() + days)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export const initialProducts: Product[] = [
  { id: 'rice', name: 'Jasmine rice', category: 'Grains & dry goods', unit: 'kg', onHand: 18.4, reorderAt: 8, unitCost: 24, supplier: 'Adom Foods', sku: 'GR-001', expiry: expiryIn(66) },
  { id: 'chicken', name: 'Chicken breast', category: 'Meat & poultry', unit: 'kg', onHand: 9.2, reorderAt: 6, unitCost: 78, supplier: 'Prime Poultry Co.', sku: 'MP-014', expiry: expiryIn(8) },
  { id: 'tomato', name: 'Fresh tomatoes', category: 'Produce', unit: 'kg', onHand: 5.1, reorderAt: 7, unitCost: 18, supplier: 'Makola Fresh', sku: 'PR-008', expiry: expiryIn(3) },
  { id: 'onion', name: 'Red onions', category: 'Produce', unit: 'kg', onHand: 8.5, reorderAt: 4, unitCost: 15, supplier: 'Makola Fresh', sku: 'PR-011', expiry: expiryIn(9) },
  { id: 'oil', name: 'Sunflower oil', category: 'Grains & dry goods', unit: 'L', onHand: 11.8, reorderAt: 5, unitCost: 38, supplier: 'Adom Foods', sku: 'GR-025', expiry: expiryIn(139) },
  { id: 'beans', name: 'Black-eyed beans', category: 'Grains & dry goods', unit: 'kg', onHand: 4.6, reorderAt: 5, unitCost: 31, supplier: 'Adom Foods', sku: 'GR-017', expiry: expiryIn(91) },
  { id: 'sobolo', name: 'Dried hibiscus', category: 'Grains & dry goods', unit: 'kg', onHand: 2.8, reorderAt: 1.5, unitCost: 64, supplier: 'Kofi’s Pantry', sku: 'GR-042', expiry: expiryIn(181) },
  { id: 'sugar', name: 'Granulated sugar', category: 'Grains & dry goods', unit: 'kg', onHand: 7.3, reorderAt: 3, unitCost: 22, supplier: 'Adom Foods', sku: 'GR-004', expiry: expiryIn(248) },
  { id: 'bowl', name: 'Kraft takeaway bowl', category: 'Packaging', unit: 'pcs', onHand: 34, reorderAt: 40, unitCost: 2.1, supplier: 'Packright Ghana', sku: 'PK-003' },
  { id: 'egg', name: 'Free-range eggs', category: 'Dairy & eggs', unit: 'pcs', onHand: 48, reorderAt: 24, unitCost: 3.5, supplier: 'Prime Poultry Co.', sku: 'DE-002', expiry: expiryIn(5) },
  { id: 'milk', name: 'Fresh whole milk', category: 'Dairy & eggs', unit: 'L', onHand: 7.5, reorderAt: 6, unitCost: 32, supplier: 'Akua Dairy', sku: 'DE-009', expiry: expiryIn(3) },
  { id: 'flour', name: 'Bread flour', category: 'Grains & dry goods', unit: 'kg', onHand: 12.3, reorderAt: 5, unitCost: 19, supplier: 'Adom Foods', sku: 'GR-031', expiry: expiryIn(300) },
]

export const menuItems: MenuItem[] = [
  { id: 'jollof', name: 'Jollof bowl', category: 'Bowls', price: 78, emoji: '🍲', description: 'Smoky tomato rice, house slaw', recipe: [{ productId: 'rice', quantity: 0.18 }, { productId: 'tomato', quantity: 0.1 }, { productId: 'onion', quantity: 0.04 }, { productId: 'oil', quantity: 0.025 }, { productId: 'bowl', quantity: 1 }] },
  { id: 'chicken-plate', name: 'Grilled chicken plate', category: 'Mains', price: 115, emoji: '🍗', description: 'Charred chicken, jollof, greens', recipe: [{ productId: 'chicken', quantity: 0.22 }, { productId: 'rice', quantity: 0.15 }, { productId: 'tomato', quantity: 0.035 }, { productId: 'oil', quantity: 0.02 }, { productId: 'bowl', quantity: 1 }] },
  { id: 'waakye', name: 'Waakye bowl', category: 'Bowls', price: 72, emoji: '🥘', description: 'Rice & beans, shito, fresh tomato', recipe: [{ productId: 'rice', quantity: 0.12 }, { productId: 'beans', quantity: 0.12 }, { productId: 'tomato', quantity: 0.04 }, { productId: 'onion', quantity: 0.025 }, { productId: 'bowl', quantity: 1 }] },
  { id: 'sobolo-drink', name: 'Chilled sobolo', category: 'Drinks', price: 18, emoji: '🧃', description: 'Hibiscus, ginger, a little spice', recipe: [{ productId: 'sobolo', quantity: 0.018 }, { productId: 'sugar', quantity: 0.025 }] },
  { id: 'egg-sandwich', name: 'Market egg sandwich', category: 'Mains', price: 48, emoji: '🥪', description: 'Soft eggs, herbs, toasted bread', recipe: [{ productId: 'egg', quantity: 2 }, { productId: 'flour', quantity: 0.08 }] },
  { id: 'iced-coffee', name: 'Iced coffee', category: 'Drinks', price: 32, emoji: '🧋', description: 'Cold brew with fresh milk', recipe: [{ productId: 'milk', quantity: 0.16 }] },
]

const dateAt = (dayOffset: number, hour: number) => {
  const date = new Date()
  date.setDate(date.getDate() + dayOffset)
  date.setHours(hour, 0, 0, 0)
  return date.toISOString()
}

export const initialData: AppData = {
  products: initialProducts,
  movements: [
    { id: 'm-01', productId: 'rice', delta: 12, reason: 'Received stock', reference: 'PO-1042', at: dateAt(0, 9) },
    { id: 'm-02', productId: 'chicken', delta: -0.66, reason: 'POS sale', reference: 'INV-2084', at: dateAt(0, 8) },
    { id: 'm-03', productId: 'tomato', delta: -1.2, reason: 'Stock adjustment', reference: 'Count #31', at: dateAt(-1, 17) },
    { id: 'm-04', productId: 'bowl', delta: -8, reason: 'POS sale', reference: 'INV-2083', at: dateAt(-1, 16) },
    { id: 'm-05', productId: 'beans', delta: 5, reason: 'Received stock', reference: 'PO-1039', at: dateAt(-1, 10) },
  ],
  purchaseOrders: [
    { id: 'PO-1042', supplier: 'Adom Foods', createdAt: dateAt(0, 9), expectedAt: dateAt(2, 9), status: 'Ordered', items: [{ productId: 'rice', quantity: 12, unitCost: 24 }, { productId: 'oil', quantity: 6, unitCost: 38 }] },
    { id: 'PO-1041', supplier: 'Prime Poultry Co.', createdAt: dateAt(-1, 11), expectedAt: dateAt(0, 12), status: 'Received', items: [{ productId: 'chicken', quantity: 8, unitCost: 78 }, { productId: 'egg', quantity: 24, unitCost: 3.5 }] },
    { id: 'PO-1040', supplier: 'Makola Fresh', createdAt: dateAt(-2, 8), expectedAt: dateAt(-1, 10), status: 'Received', items: [{ productId: 'tomato', quantity: 5, unitCost: 18 }, { productId: 'onion', quantity: 3, unitCost: 15 }] },
  ],
  invoices: [
    { id: 'INV-2084', customer: 'Ama Osei', createdAt: dateAt(0, 8), status: 'Paid', payment: 'Mobile money', lines: [{ name: 'Grilled chicken plate', quantity: 2, unitPrice: 115 }, { name: 'Chilled sobolo', quantity: 1, unitPrice: 18 }], subtotal: 248, tax: 0, total: 248 },
    { id: 'INV-2083', customer: 'Kwame Mensah', createdAt: dateAt(-1, 16), status: 'Paid', payment: 'Cash', lines: [{ name: 'Jollof bowl', quantity: 3, unitPrice: 78 }, { name: 'Iced coffee', quantity: 2, unitPrice: 32 }], subtotal: 298, tax: 0, total: 298 },
    { id: 'INV-2082', customer: 'Walk-in customer', createdAt: dateAt(-1, 12), status: 'Due', payment: 'Bank transfer', lines: [{ name: 'Waakye bowl', quantity: 4, unitPrice: 72 }], subtotal: 288, tax: 0, total: 288 },
    { id: 'INV-2081', customer: 'Esi Boateng', createdAt: dateAt(-2, 19), status: 'Paid', payment: 'Card', lines: [{ name: 'Market egg sandwich', quantity: 2, unitPrice: 48 }, { name: 'Chilled sobolo', quantity: 2, unitPrice: 18 }], subtotal: 132, tax: 0, total: 132 },
    { id: 'INV-2080', customer: 'Walk-in customer', createdAt: dateAt(-2, 14), status: 'Paid', payment: 'Cash', lines: [{ name: 'Jollof bowl', quantity: 2, unitPrice: 78 }], subtotal: 156, tax: 0, total: 156 },
  ],
}
