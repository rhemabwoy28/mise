import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  ArrowDownRight, ArrowRight, ArrowUpRight, BarChart3, Bell, CalendarDays,
  Check, CheckCircle2, ChevronDown, ChevronRight, CircleAlert, Clock3,
  Download, FileText, LayoutDashboard, Minus, MoreHorizontal, Package,
  Plus, Printer, Search, ShoppingBag, ShoppingCart, Sparkles, Trash2,
  TrendingUp, Truck, Utensils, Wallet, X, type LucideIcon,
} from 'lucide-react'
import { CURRENCY, initialData, menuItems, TAX_RATE } from './data'
import type { AppData, Invoice, Page, Product, PurchaseOrder } from './types'

const navItems: { label: Page; icon: LucideIcon }[] = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'Inventory', icon: Package },
  { label: 'Point of sale', icon: ShoppingCart },
  { label: 'Purchases', icon: Truck },
  { label: 'Invoices', icon: FileText },
  { label: 'Reports', icon: BarChart3 },
]

const money = (amount: number) => new Intl.NumberFormat('en-GH', { style: 'currency', currency: CURRENCY, maximumFractionDigits: 2 }).format(amount)
const quantity = (n: number) => new Intl.NumberFormat('en-GH', { maximumFractionDigits: 2 }).format(n)
const dateLabel = (value: string) => new Intl.DateTimeFormat('en-GH', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value))
const timeLabel = (value: string) => new Intl.DateTimeFormat('en-GH', { hour: 'numeric', minute: '2-digit' }).format(new Date(value))
const idFor = (prefix: string) => `${prefix}-${crypto.randomUUID()}`
const statusFor = (product: Product) => product.onHand <= product.reorderAt ? 'Low stock' : 'In stock'
const nextNumber = (records: { id: string }[], prefix: string) => Math.max(0, ...records.map((record) => Number(record.id.replace(`${prefix}-`, '')) || 0)) + 1

function getCartShortage(cart: Record<string, number>, products: Product[]) {
  const required = new Map<string, number>()
  Object.entries(cart).forEach(([menuId, count]) => {
    const item = menuItems.find((menuItem) => menuItem.id === menuId)
    item?.recipe.forEach((line) => required.set(line.productId, (required.get(line.productId) || 0) + line.quantity * count))
  })
  return [...required].find(([productId, total]) => {
    const product = products.find((item) => item.id === productId)
    return !product || product.onHand < total
  })?.[0]
}

function loadData(): { data: AppData; warning: string } {
  let saved: string | null = null
  try {
    saved = localStorage.getItem('mise-demo-data')
    if (!saved) return { data: initialData, warning: '' }
    const parsed: unknown = JSON.parse(saved)
    if (!parsed || typeof parsed !== 'object' || !Array.isArray((parsed as AppData).products) || !Array.isArray((parsed as AppData).movements) || !Array.isArray((parsed as AppData).purchaseOrders) || !Array.isArray((parsed as AppData).invoices)) throw new Error('Saved Mise data has an invalid shape')
    return { data: parsed as AppData, warning: '' }
  } catch {
    if (saved) {
      try {
        localStorage.setItem('mise-demo-data-recovery', saved)
      } catch {
        // Keep loading the sample workspace if the browser cannot make a recovery copy.
      }
      return { data: initialData, warning: 'Saved data could not be read. A recovery copy was kept in this browser; sample data is loaded.' }
    }
    return { data: initialData, warning: 'Browser storage is unavailable. Changes may not survive a page refresh.' }
  }
}

function App() {
  const [loaded] = useState(loadData)
  const [data, setData] = useState<AppData>(loaded.data)
  const [page, setPage] = useState<Page>('Overview')
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState(loaded.warning)
  const searchInput = useRef<HTMLInputElement>(null)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [purchaseOpen, setPurchaseOpen] = useState(false)
  const [invoiceOpen, setInvoiceOpen] = useState<Invoice | null>(null)
  const [cart, setCart] = useState<Record<string, number>>({})
  const [customer, setCustomer] = useState('Walk-in customer')
  const [payment, setPayment] = useState<Invoice['payment']>('Mobile money')
  const [category, setCategory] = useState('All items')
  const nextInvoiceNumber = useRef(nextNumber(data.invoices, 'INV'))
  const nextPurchaseNumber = useRef(nextNumber(data.purchaseOrders, 'PO'))
  const checkoutInProgress = useRef(false)

  useEffect(() => {
    if (Object.keys(cart).length === 0) checkoutInProgress.current = false
  }, [cart])

  useEffect(() => {
    try {
      localStorage.setItem('mise-demo-data', JSON.stringify(data))
    } catch {
      setToast('Could not save to this browser. Export your records before closing the page.')
    }
  }, [data])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 2800)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchInput.current?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const lowStock = useMemo(() => data.products.filter((product) => product.onHand <= product.reorderAt), [data.products])
  const stockValue = useMemo(() => data.products.reduce((sum, product) => sum + product.onHand * product.unitCost, 0), [data.products])
  const paidInvoices = data.invoices.filter((invoice) => invoice.status === 'Paid')
  const salesToday = paidInvoices.filter((invoice) => new Date(invoice.createdAt).toDateString() === new Date().toDateString()).reduce((sum, invoice) => sum + invoice.total, 0)
  const filteredProducts = data.products.filter((product) => {
    const matchesSearch = `${product.name} ${product.sku} ${product.category}`.toLowerCase().includes(search.toLowerCase())
    return matchesSearch && (category === 'All items' || product.category === category)
  })

  const setInventoryCount = (productId: string, nextCount: number, reason: string) => {
    const product = data.products.find((item) => item.id === productId)
    if (!product || !Number.isFinite(nextCount) || nextCount < 0) return
    const delta = nextCount - product.onHand
    if (delta === 0) {
      setEditingProduct(null)
      return
    }
    setData((previous) => ({
      ...previous,
      products: previous.products.map((item) => item.id === productId ? { ...item, onHand: nextCount } : item),
      movements: [{ id: idFor('MOV'), productId, delta, reason, reference: 'Manual count', at: new Date().toISOString() }, ...previous.movements],
    }))
    setEditingProduct(null)
    setToast('Stock count updated')
  }

  const createPurchase = (items: { productId: string; quantity: number }[], supplier: string, expectedAt: string) => {
    const deliveryDate = new Date(`${expectedAt}T12:00:00`)
    const usedProducts = new Set<string>()
    const orderItems: PurchaseOrder['items'] = []
    for (const line of items) {
      const product = data.products.find((item) => item.id === line.productId)
      if (!product || !Number.isFinite(line.quantity) || line.quantity <= 0 || usedProducts.has(line.productId)) return
      usedProducts.add(line.productId)
      orderItems.push({ productId: product.id, quantity: line.quantity, unitCost: product.unitCost })
    }
    if (!supplier.trim() || !items.length || Number.isNaN(deliveryDate.getTime())) return
    const orderNumber = `PO-${nextPurchaseNumber.current++}`
    const order: PurchaseOrder = {
      id: orderNumber,
      supplier: supplier.trim(),
      createdAt: new Date().toISOString(),
      expectedAt: deliveryDate.toISOString(),
      status: 'Ordered',
      items: orderItems,
    }
    setData((previous) => ({ ...previous, purchaseOrders: [order, ...previous.purchaseOrders] }))
    setPurchaseOpen(false)
    setToast(`${orderNumber} created with ${order.items.length} ${order.items.length === 1 ? 'item' : 'items'}`)
  }

  const createProduct = (product: Omit<Product, 'id'>) => {
    const id = idFor('item').toLowerCase()
    setData((previous) => ({
      ...previous,
      products: [{ ...product, id }, ...previous.products],
      movements: product.onHand > 0 ? [{ id: idFor('MOV'), productId: id, delta: product.onHand, reason: 'Opening balance', reference: 'Item setup', at: new Date().toISOString() }, ...previous.movements] : previous.movements,
    }))
    setEditingProduct(null)
    setToast(`${product.name} added to inventory`)
  }

  const receivePurchase = (order: PurchaseOrder) => {
    if (order.status === 'Received') return
    setData((previous) => {
      const currentOrder = previous.purchaseOrders.find((item) => item.id === order.id)
      if (!currentOrder || currentOrder.status === 'Received') return previous
      const receivedAt = new Date().toISOString()
      return {
        ...previous,
        products: previous.products.map((product) => {
          const item = currentOrder.items.find((line) => line.productId === product.id)
          return item ? { ...product, onHand: product.onHand + item.quantity } : product
        }),
        purchaseOrders: previous.purchaseOrders.map((item) => item.id === order.id ? { ...item, status: 'Received', receivedAt } : item),
        movements: [...currentOrder.items.map((line) => ({ id: idFor('MOV'), productId: line.productId, delta: line.quantity, reason: 'Purchase received', reference: order.id, at: receivedAt })), ...previous.movements],
      }
    })
    setToast(`${order.id} received and stock updated`)
  }

  const markInvoicePaid = (invoiceId: string) => {
    setData((previous) => ({ ...previous, invoices: previous.invoices.map((invoice) => invoice.id === invoiceId ? { ...invoice, status: 'Paid' } : invoice) }))
    setInvoiceOpen((previous) => previous?.id === invoiceId ? { ...previous, status: 'Paid' } : previous)
    setToast(`${invoiceId} marked as paid`)
  }

  const addToCart = (menuId: string) => {
    const menuItem = menuItems.find((item) => item.id === menuId)
    if (!menuItem) return
    const requestedCart = { ...cart, [menuId]: (cart[menuId] || 0) + 1 }
    const shortageId = getCartShortage(requestedCart, data.products)
    if (shortageId) {
      const shortageName = data.products.find((item) => item.id === shortageId)?.name || 'an ingredient'
      setToast(`Not enough ${shortageName} for that order`)
      return
    }
    setCart(requestedCart)
  }

  const changeCartQuantity = (menuId: string, next: number) => {
    setCart((previous) => {
      const updated = { ...previous }
      if (next <= 0) delete updated[menuId]
      else updated[menuId] = next
      return updated
    })
  }

  const checkout = () => {
    if (checkoutInProgress.current) return
    const lines = Object.entries(cart).map(([menuId, count]) => {
      const menuItem = menuItems.find((item) => item.id === menuId)!
      return { menuItem, count }
    })
    if (!lines.length) {
      setToast('Add an item to the sale first')
      return
    }
    const shortageId = getCartShortage(cart, data.products)
    if (shortageId) {
      const name = data.products.find((product) => product.id === shortageId)?.name || 'stock'
      setToast(`Not enough ${name} to complete this sale`)
      return
    }
    checkoutInProgress.current = true
    const required = new Map<string, number>()
    lines.forEach(({ menuItem, count }) => menuItem.recipe.forEach((line) => required.set(line.productId, (required.get(line.productId) || 0) + line.quantity * count)))
    const subtotal = lines.reduce((sum, line) => sum + line.menuItem.price * line.count, 0)
    const tax = subtotal * TAX_RATE
    const invoice: Invoice = {
      id: `INV-${nextInvoiceNumber.current++}`,
      customer: customer.trim() || 'Walk-in customer',
      createdAt: new Date().toISOString(),
      status: 'Paid',
      payment,
      lines: lines.map(({ menuItem, count }) => ({ name: menuItem.name, quantity: count, unitPrice: menuItem.price })),
      subtotal,
      tax,
      total: subtotal + tax,
    }
    const movements = [...required.entries()].map(([productId, used]) => ({ id: idFor('MOV'), productId, delta: -used, reason: 'POS sale', reference: invoice.id, at: invoice.createdAt }))
    setData((previous) => ({
      ...previous,
      products: previous.products.map((product) => required.has(product.id) ? { ...product, onHand: product.onHand - (required.get(product.id) || 0) } : product),
      movements: [...movements, ...previous.movements],
      invoices: [invoice, ...previous.invoices],
    }))
    setCart({})
    setCustomer('Walk-in customer')
    setInvoiceOpen(invoice)
    setToast('Sale completed — recipe ingredients deducted from stock')
  }

  const exportInventory = () => {
    const rows = [['SKU', 'Product', 'Category', 'On hand', 'Unit', 'Reorder at', 'Unit cost', 'Supplier'], ...data.products.map((item) => [item.sku, item.name, item.category, item.onHand, item.unit, item.reorderAt, item.unitCost, item.supplier])]
    const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'mise-inventory.csv'
    link.click()
    URL.revokeObjectURL(url)
    setToast('Inventory CSV downloaded')
  }

  const printInvoice = (invoice: Invoice) => {
    const lines = invoice.lines.map((line) => `<tr><td>${escapeHtml(line.name)}</td><td>${escapeHtml(String(line.quantity))}</td><td>${money(line.unitPrice)}</td><td>${money(line.quantity * line.unitPrice)}</td></tr>`).join('')
    const popup = window.open('', '_blank', 'width=720,height=840')
    if (!popup) {
      setToast('Allow pop-ups to print this invoice')
      return
    }
    popup.opener = null
    popup.document.write(`<!doctype html><html><head><title>${escapeHtml(invoice.id)}</title><style>body{font:15px Arial,sans-serif;color:#17221d;max-width:720px;margin:48px auto;padding:0 28px}header{display:flex;justify-content:space-between;border-bottom:1px solid #ddd;padding-bottom:24px}h1{font-size:28px;margin:0 0 5px}.muted{color:#68736d}table{width:100%;border-collapse:collapse;margin:32px 0}th,td{text-align:left;padding:12px 8px;border-bottom:1px solid #e8eae7}th:last-child,td:last-child{text-align:right}.totals{margin-left:auto;width:240px}.totals p{display:flex;justify-content:space-between}.total{font-size:20px;font-weight:bold;border-top:1px solid #ddd;padding-top:12px}</style></head><body><header><div><h1>Mise</h1><div class="muted">Restaurant invoice</div></div><div style="text-align:right"><b>${escapeHtml(invoice.id)}</b><div class="muted">${dateLabel(invoice.createdAt)}</div></div></header><p><b>Bill to</b><br>${escapeHtml(invoice.customer)}</p><table><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>${lines}</tbody></table><div class="totals"><p><span>Subtotal</span><span>${money(invoice.subtotal)}</span></p><p><span>Tax</span><span>${money(invoice.tax)}</span></p><p class="total"><span>Total</span><span>${money(invoice.total)}</span></p></div><p class="muted">Payment: ${escapeHtml(invoice.payment)} · ${escapeHtml(invoice.status)}</p><script>window.onload=()=>window.print()</script></body></html>`)
    popup.document.close()
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark"><Utensils size={19} strokeWidth={2.4} /></div><span>mise<span className="brand-period">.</span></span><span className="brand-tag">BETA</span></div>
        <div className="workspace-switch"><div className="workspace-avatar">A</div><div className="workspace-copy"><strong>Atelier Kitchen</strong><span>Accra · Main location</span></div><ChevronDown size={15} /></div>
        <div className="nav-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          {navItems.map(({ label, icon: Icon }) => <button key={label} className={`nav-link ${page === label ? 'active' : ''}`} onClick={() => setPage(label)}><Icon size={18} strokeWidth={1.9} /><span>{label}</span>{label === 'Inventory' && lowStock.length > 0 && <span className="nav-count">{lowStock.length}</span>}</button>)}
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card"><div className="help-orbit">✳</div><strong>Sample workspace</strong><p>Restore the original demo ingredients and transactions.</p><button onClick={() => { if (window.confirm('Restore the original sample data? This replaces changes saved in this browser.')) { setData(initialData); setCart({}); setToast('Sample workspace restored') } }}>Reset sample data <ArrowRight size={13} /></button></div>
          <div className="user-profile"><div className="user-avatar">AO</div><div className="user-copy"><strong>Andy Owusu</strong><span>Owner · Admin</span></div><MoreHorizontal size={19} /></div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb"><span>Atelier Kitchen</span><ChevronRight size={14} /><strong>{page}</strong></div>
          <div className="topbar-tools"><div className="search-wrap"><Search size={16} /><input ref={searchInput} value={search} onChange={(event) => { setSearch(event.target.value); if (event.target.value) setPage('Inventory') }} onKeyDown={(event) => { if (event.key === 'Enter') setPage('Inventory') }} placeholder="Search inventory..." aria-label="Search inventory" /><kbd>Ctrl/⌘ K</kbd></div><button className="icon-button notification-button" aria-label="Notifications" onClick={() => setToast(`${lowStock.length} items need a stock check`)}><Bell size={18} /><i /></button><div className="today-pill"><CalendarDays size={15} /> {new Intl.DateTimeFormat('en-GH', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date())}</div></div>
        </header>

        <div className="page-content">
          {page === 'Overview' && <Overview data={data} lowStock={lowStock} stockValue={stockValue} salesToday={salesToday} setPage={setPage} openProduct={setEditingProduct} />}
          {page === 'Inventory' && <InventoryPage products={filteredProducts} movements={data.movements} allProducts={data.products} category={category} setCategory={setCategory} onAdjust={setEditingProduct} onExport={exportInventory} />}
          {page === 'Point of sale' && <PosPage cart={cart} setCart={changeCartQuantity} addToCart={addToCart} canAddToCart={new Set(menuItems.filter((item) => !getCartShortage({ ...cart, [item.id]: (cart[item.id] || 0) + 1 }, data.products)).map((item) => item.id))} customer={customer} setCustomer={setCustomer} payment={payment} setPayment={setPayment} checkout={checkout} />}
          {page === 'Purchases' && <PurchasesPage orders={data.purchaseOrders} products={data.products} onNew={() => setPurchaseOpen(true)} onReceive={receivePurchase} />}
          {page === 'Invoices' && <InvoicesPage invoices={data.invoices} onOpen={setInvoiceOpen} onPrint={printInvoice} />}
          {page === 'Reports' && <ReportsPage data={data} stockValue={stockValue} onExport={exportInventory} />}
        </div>
      </main>

      {editingProduct && <AdjustModal product={editingProduct} onClose={() => setEditingProduct(null)} onSave={setInventoryCount} onCreate={createProduct} />}
      {purchaseOpen && <PurchaseModal products={data.products} onClose={() => setPurchaseOpen(false)} onCreate={createPurchase} />}
      {invoiceOpen && <InvoiceModal invoice={invoiceOpen} onClose={() => setInvoiceOpen(null)} onPrint={() => printInvoice(invoiceOpen)} onMarkPaid={() => markInvoicePaid(invoiceOpen.id)} />}
      {toast && <div className="toast"><CheckCircle2 size={17} />{toast}<button onClick={() => setToast('')} aria-label="Dismiss"><X size={15} /></button></div>}
    </div>
  )
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] || character)
}

function PageHeading({ eyebrow, title, subtitle, action }: { eyebrow: string; title: string; subtitle: string; action?: ReactNode }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{subtitle}</p></div>{action}</div>
}

function Overview({ data, lowStock, stockValue, salesToday, setPage, openProduct }: { data: AppData; lowStock: Product[]; stockValue: number; salesToday: number; setPage: (page: Page) => void; openProduct: (product: Product) => void }) {
  const paidInvoices = data.invoices.filter((invoice) => invoice.status === 'Paid')
  const chartDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() - (6 - index))
    const total = paidInvoices.filter((invoice) => new Date(invoice.createdAt).toDateString() === date.toDateString()).reduce((sum, invoice) => sum + invoice.total, 0)
    return { date, total, label: new Intl.DateTimeFormat('en-GH', { weekday: 'short' }).format(date) }
  })
  const chartTotal = chartDays.reduce((sum, day) => sum + day.total, 0)
  const chartMax = Math.max(...chartDays.map((day) => day.total), 1)
  const recent = data.invoices.slice(0, 4)
  return <>
    <PageHeading eyebrow={new Intl.DateTimeFormat('en-GH', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date()).toUpperCase()} title="A good day starts in order." subtitle="Here’s the pulse of Atelier Kitchen today." action={<button className="button button-primary" onClick={() => setPage('Point of sale')}><Plus size={17} /> New sale</button>} />
    <section className="stats-grid">
      <StatCard label="Sales today" value={money(salesToday)} detail={`${paidInvoices.filter((invoice) => new Date(invoice.createdAt).toDateString() === new Date().toDateString()).length} paid invoices recorded`} icon={Wallet} tone="mint" />
      <StatCard label="Stock on hand" value={money(stockValue)} detail={`${data.products.length} ingredients & supplies`} icon={Package} tone="lavender" />
      <StatCard label="Low stock items" value={String(lowStock.length).padStart(2, '0')} detail="Items below reorder point" icon={CircleAlert} tone="peach" trend="alert" />
      <StatCard label="Open invoices" value={String(data.invoices.filter((item) => item.status === 'Due').length).padStart(2, '0')} detail={money(data.invoices.filter((item) => item.status === 'Due').reduce((sum, item) => sum + item.total, 0)) + ' outstanding'} icon={FileText} tone="blue" />
    </section>

    <section className="overview-grid">
      <div className="panel sales-panel">
        <div className="panel-header"><div><div className="panel-kicker">REVENUE OVERVIEW</div><h2>Sales at a glance</h2></div><span className="select-button">Last 7 days</span></div>
        <div className="chart-summary"><strong>{money(chartTotal)}</strong><span className="muted">from {paidInvoices.filter((invoice) => chartDays.some((day) => day.date.toDateString() === new Date(invoice.createdAt).toDateString())).length} paid invoices · last 7 days</span></div>
        <div className="chart-area"><div className="chart-y"><span>{money(chartMax)}</span><span>{money(chartMax * .75)}</span><span>{money(chartMax * .5)}</span><span>{money(chartMax * .25)}</span><span>{money(0)}</span></div><div className="bars-area"><div className="grid-line grid-a" /><div className="grid-line grid-b" /><div className="grid-line grid-c" /><div className="grid-line grid-d" />{chartDays.map((day) => <div className="bar-group" key={day.date.toISOString()}><div className={`bar ${day.date.toDateString() === new Date().toDateString() ? 'bar-highlight' : ''}`} style={{ height: `${Math.max(day.total ? (day.total / chartMax) * 88 : 3, 3)}%` }} title={`${day.label}: ${money(day.total)}`} /><span>{day.label}</span></div>)}</div></div>
        <div className="chart-footer"><span><i className="legend-dot" /> Paid sales</span><span><i className="legend-dot pale" /> No sales</span><button onClick={() => setPage('Reports')}>View report <ArrowRight size={14} /></button></div>
      </div>
      <div className="panel stock-panel">
        <div className="panel-header"><div><div className="panel-kicker">NEEDS A LOOK</div><h2>Running low</h2></div></div>
        <div className="stock-list">{lowStock.length ? lowStock.slice(0, 4).map((item) => <div className="stock-row" key={item.id}><div className={`product-initial ${item.category === 'Packaging' ? 'initial-sand' : 'initial-coral'}`}>{item.name.slice(0, 1)}</div><div className="stock-name"><strong>{item.name}</strong><span>{item.category}</span></div><div className="stock-remaining"><strong>{quantity(item.onHand)} <small>{item.unit}</small></strong><span>Reorder at {quantity(item.reorderAt)}</span></div><button className="row-arrow" onClick={() => openProduct(item)} aria-label={`Adjust ${item.name}`}><ChevronRight size={16} /></button></div>) : <div className="empty-state">Everything is above its reorder point. Nice work.</div>}</div>
        <button className="panel-link" onClick={() => setPage('Inventory')}>View all inventory <ArrowRight size={14} /></button>
      </div>
    </section>

    <section className="overview-grid lower-grid">
      <div className="panel activity-panel">
        <div className="panel-header"><div><div className="panel-kicker">JUST HAPPENED</div><h2>Recent activity</h2></div></div>
        <div className="activity-list">{data.movements.slice(0, 4).map((movement) => {
          const product = data.products.find((item) => item.id === movement.productId)
          return <div className="activity-row" key={movement.id}><div className={`activity-icon ${movement.delta > 0 ? 'activity-in' : 'activity-out'}`}>{movement.delta > 0 ? <ArrowDownRight size={17} /> : <ArrowUpRight size={17} />}</div><div className="activity-copy"><strong>{movement.reason}</strong><span>{product?.name || 'Item'} · {movement.reference}</span></div><div className="activity-meta"><strong className={movement.delta > 0 ? 'text-green' : ''}>{movement.delta > 0 ? '+' : ''}{quantity(movement.delta)} {product?.unit}</strong><span>{timeLabel(movement.at)}</span></div></div>
        })}</div>
      </div>
      <div className="panel invoice-panel">
        <div className="panel-header"><div><div className="panel-kicker">THE LATEST</div><h2>Recent invoices</h2></div></div>
        <div className="invoice-list">{recent.map((invoice) => <div className="invoice-row" key={invoice.id}><div className="invoice-glyph"><FileText size={17} /></div><div className="invoice-copy"><strong>{invoice.id}</strong><span>{invoice.customer} · {dateLabel(invoice.createdAt)}</span></div><div className="invoice-total"><strong>{money(invoice.total)}</strong><span className={`status-pill ${invoice.status === 'Paid' ? 'status-paid' : 'status-due'}`}>{invoice.status}</span></div></div>)}</div>
        <button className="panel-link" onClick={() => setPage('Invoices')}>All invoices <ArrowRight size={14} /></button>
      </div>
    </section>
    <div className="footnote"><Sparkles size={14} /> Sample workspace data · your changes stay in this browser</div>
  </>
}

function StatCard({ label, value, detail, icon: Icon, tone, trend }: { label: string; value: string; detail: string; icon: LucideIcon; tone: string; trend?: 'up' | 'alert' }) {
  return <div className="stat-card"><div className="stat-top"><span>{label}</span><div className={`stat-icon ${tone}`}><Icon size={17} /></div></div><strong className="stat-value">{value}</strong><div className={`stat-detail ${trend === 'up' ? 'detail-positive' : ''} ${trend === 'alert' ? 'detail-alert' : ''}`}>{trend === 'up' && <TrendingUp size={13} />}{detail}</div></div>
}

function InventoryPage({ products, movements, allProducts, category, setCategory, onAdjust, onExport }: { products: Product[]; movements: AppData['movements']; allProducts: Product[]; category: string; setCategory: (category: string) => void; onAdjust: (product: Product) => void; onExport: () => void }) {
  const categories = ['All items', ...Array.from(new Set(allProducts.map((item) => item.category)))]
  const low = allProducts.filter((product) => product.onHand <= product.reorderAt).length
  const value = allProducts.reduce((sum, product) => sum + product.onHand * product.unitCost, 0)
  return <>
    <PageHeading eyebrow="STOCK CONTROL" title="Inventory" subtitle="Every ingredient and supply, accounted for." action={<div className="heading-actions"><button className="button button-secondary" onClick={onExport}><Download size={16} /> Export CSV</button><button className="button button-primary" onClick={() => onAdjust({ id: '', name: '', category: '', unit: '', onHand: 0, reorderAt: 0, unitCost: 0, supplier: '', sku: '' })}><Plus size={17} /> Add item</button></div>} />
    <div className="inventory-summary"><div><span>Stock value</span><strong>{money(value)}</strong></div><div><span>Total items</span><strong>{allProducts.length}</strong></div><div><span>Below reorder point</span><strong className={low ? 'text-amber' : ''}>{low} <small>items</small></strong></div><div className="summary-aside"><span><i className="summary-dot green-dot" /> In stock</span><span><i className="summary-dot amber-dot" /> Low stock</span></div></div>
    <div className="panel table-panel"><div className="table-toolbar"><div className="tabs-row">{categories.map((item) => <button key={item} className={`filter-tab ${category === item ? 'selected' : ''}`} onClick={() => setCategory(item)}>{item}</button>)}</div></div>
      <div className="table-scroll"><table className="data-table"><thead><tr><th>ITEM</th><th>SKU</th><th>CATEGORY</th><th>ON HAND</th><th>UNIT COST</th><th>STOCK VALUE</th><th>STATUS</th><th></th></tr></thead><tbody>{products.map((product) => <tr key={product.id}><td><div className="item-cell"><div className={`product-initial ${product.category === 'Packaging' ? 'initial-sand' : product.category === 'Produce' ? 'initial-green' : ''}`}>{product.name.slice(0, 1)}</div><div><strong>{product.name}</strong>{product.expiry && <span>Exp. {dateLabel(product.expiry)}</span>}</div></div></td><td className="sku-cell">{product.sku}</td><td>{product.category}</td><td><strong>{quantity(product.onHand)}</strong> <span className="unit-cell">{product.unit}</span><span className="reorder-note"> · reorder at {quantity(product.reorderAt)}</span></td><td>{money(product.unitCost)}</td><td>{money(product.onHand * product.unitCost)}</td><td><span className={`status-pill ${statusFor(product) === 'In stock' ? 'status-paid' : 'status-low'}`}><i />{statusFor(product)}</span></td><td><button className="more-button table-more" onClick={() => onAdjust(product)} aria-label={`Adjust stock for ${product.name}`}><MoreHorizontal size={19} /></button></td></tr>)}{products.length === 0 && <tr><td colSpan={8} className="table-empty">No inventory items match your search.</td></tr>}</tbody></table></div>
      <div className="table-footer"><span>Showing <strong>{products.length}</strong> of <strong>{allProducts.length}</strong> items</span></div>
    </div>
    <section className="panel movement-panel"><div className="panel-header"><div><div className="panel-kicker">AUDIT TRAIL</div><h2>Recent stock movements</h2></div></div><div className="movement-table"><div className="movement-head"><span>ITEM</span><span>CHANGE</span><span>REASON</span><span>REFERENCE</span><span>DATE</span></div>{movements.slice(0, 4).map((movement) => { const product = allProducts.find((item) => item.id === movement.productId); return <div className="movement-line" key={movement.id}><strong>{product?.name || 'Removed item'}</strong><span className={movement.delta > 0 ? 'text-green' : ''}>{movement.delta > 0 ? '+' : ''}{quantity(movement.delta)} {product?.unit}</span><span>{movement.reason}</span><span className="sku-cell">{movement.reference}</span><span>{dateLabel(movement.at)}</span></div> })}</div>{movements.length > 4 && <details className="movement-history"><summary>View full history ({movements.length} movements)</summary><div className="movement-table"><div className="movement-head"><span>ITEM</span><span>CHANGE</span><span>REASON</span><span>REFERENCE</span><span>DATE</span></div>{movements.map((movement) => { const product = allProducts.find((item) => item.id === movement.productId); return <div className="movement-line" key={movement.id}><strong>{product?.name || 'Removed item'}</strong><span className={movement.delta > 0 ? 'text-green' : ''}>{movement.delta > 0 ? '+' : ''}{quantity(movement.delta)} {product?.unit}</span><span>{movement.reason}</span><span className="sku-cell">{movement.reference}</span><span>{dateLabel(movement.at)}</span></div> })}</div></details>}</section>
  </>
}

function PosPage({ cart, setCart, addToCart, canAddToCart, customer, setCustomer, payment, setPayment, checkout }: { cart: Record<string, number>; setCart: (id: string, next: number) => void; addToCart: (id: string) => void; canAddToCart: Set<string>; customer: string; setCustomer: (value: string) => void; payment: Invoice['payment']; setPayment: (value: Invoice['payment']) => void; checkout: () => void }) {
  const [menuCategory, setMenuCategory] = useState('All')
  const [menuSearch, setMenuSearch] = useState('')
  const tabs = ['All', 'Bowls', 'Mains', 'Drinks']
  const visibleItems = menuItems.filter((item) => (menuCategory === 'All' || item.category === menuCategory) && `${item.name} ${item.description}`.toLowerCase().includes(menuSearch.toLowerCase()))
  const cartLines = Object.entries(cart).map(([id, count]) => ({ item: menuItems.find((menu) => menu.id === id)!, count })).filter((line) => line.item)
  const subtotal = cartLines.reduce((sum, line) => sum + line.item.price * line.count, 0)
  return <>
    <PageHeading eyebrow="FRONT OF HOUSE" title="Point of sale" subtitle="A quick checkout, with every ingredient counted." action={<div className="pos-service-pill"><span /> Demo mode · payments are recorded only</div>} />
    <div className="pos-layout"><section className="menu-section"><div className="menu-toolbar"><div className="tabs-row">{tabs.map((item) => <button key={item} className={`filter-tab ${menuCategory === item ? 'selected' : ''}`} onClick={() => setMenuCategory(item)}>{item}</button>)}</div><div className="menu-search"><Search size={15} /><input placeholder="Find a menu item" value={menuSearch} onChange={(event) => setMenuSearch(event.target.value)} aria-label="Find a menu item" /></div></div><div className="menu-grid">{visibleItems.map((item) => { const canAdd = canAddToCart.has(item.id); return <button key={item.id} className="menu-card" onClick={() => addToCart(item.id)} disabled={!canAdd} aria-label={`${item.name}, ${money(item.price)}${canAdd ? ', add to order' : ', not enough stock'}`}><div className={`menu-art art-${item.category.toLowerCase()}`}><span>{item.emoji}</span><i><Plus size={17} /></i></div><div className="menu-card-copy"><div><strong>{item.name}</strong><span>{item.description}</span></div><b>{money(item.price)}</b></div><div className={`menu-availability ${canAdd ? '' : 'menu-unavailable'}`}><span className="available-dot" /> {canAdd ? 'In stock · recipe tracked' : cart[item.id] ? 'Stock limit reached' : 'Out of stock'}</div></button> })}</div>{visibleItems.length === 0 && <div className="panel empty-search">No menu items match “{menuSearch}”.</div>}</section>
      <aside className="cart-panel"><div className="cart-head"><div><div className="panel-kicker">CURRENT ORDER</div><h2>New sale</h2></div><button className="icon-button subtle" onClick={() => Object.keys(cart).forEach((id) => setCart(id, 0))} aria-label="Clear order"><Trash2 size={17} /></button></div><label className="field-label">CUSTOMER</label><input className="text-input" value={customer} onChange={(event) => setCustomer(event.target.value)} placeholder="Walk-in customer" />
        <div className="cart-items">{cartLines.length ? cartLines.map(({ item, count }) => <div className="cart-item" key={item.id}><div className="cart-emoji">{item.emoji}</div><div className="cart-item-copy"><strong>{item.name}</strong><span>{money(item.price)} each</span></div><div className="quantity-control"><button onClick={() => setCart(item.id, count - 1)} aria-label="Decrease quantity"><Minus size={13} /></button><span>{count}</span><button onClick={() => addToCart(item.id)} aria-label="Increase quantity"><Plus size={13} /></button></div><strong className="line-total">{money(item.price * count)}</strong></div>) : <div className="cart-empty"><div><ShoppingBag size={22} /></div><strong>Your order is waiting</strong><span>Choose a menu item to start a sale.</span></div>}</div>
        <div className="cart-bottom"><div className="cart-subtotal"><span>Subtotal</span><strong>{money(subtotal)}</strong></div><div className="cart-subtotal"><span>Tax <small>(configured at 0%)</small></span><strong>{money(subtotal * TAX_RATE)}</strong></div><div className="cart-total"><span>Total</span><strong>{money(subtotal * (1 + TAX_RATE))}</strong></div><label className="field-label">PAYMENT METHOD</label><select className="text-input" value={payment} onChange={(event) => setPayment(event.target.value as Invoice['payment'])}><option>Mobile money</option><option>Cash</option><option>Card</option><option>Bank transfer</option></select><button className="button button-primary checkout-button" onClick={checkout}><Check size={17} /> Complete sale <span>{money(subtotal * (1 + TAX_RATE))}</span></button><div className="cart-note"><CheckCircle2 size={14} /> Ingredient usage will be deducted automatically</div></div>
      </aside></div>
  </>
}

function PurchasesPage({ orders, products, onNew, onReceive }: { orders: PurchaseOrder[]; products: Product[]; onNew: () => void; onReceive: (order: PurchaseOrder) => void }) {
  const ordered = orders.filter((order) => order.status === 'Ordered').length
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)
  const receivedThisMonth = orders.filter((order) => order.status === 'Received' && new Date(order.receivedAt || order.createdAt) >= monthStart)
  const receivedSpend = receivedThisMonth.reduce((sum, order) => sum + order.items.reduce((lineSum, line) => lineSum + line.quantity * line.unitCost, 0), 0)
  const suppliers = [...new Set([...products.map((product) => product.supplier), ...orders.map((order) => order.supplier)].filter((supplier) => supplier && supplier !== 'Unassigned'))]
  return <>
    <PageHeading eyebrow="SUPPLIER WORKFLOW" title="Purchases" subtitle="Keep supplier orders connected to the stock they replenish." action={<button className="button button-primary" onClick={onNew}><Plus size={17} /> New purchase order</button>} />
    <div className="purchase-cards"><div className="purchase-summary-card"><div className="summary-card-icon peach"><Truck size={18} /></div><span>In transit</span><strong>{ordered} <small>orders</small></strong><p>Awaiting delivery and stock receipt</p></div><div className="purchase-summary-card"><div className="summary-card-icon mint"><Package size={18} /></div><span>Received this month</span><strong>{receivedThisMonth.length} <small>orders</small></strong><p>{money(receivedSpend)} in stock received</p></div><div className="purchase-summary-card supplier-spotlight"><div className="supplier-avatars">{suppliers.slice(0, 3).map((supplier) => <span key={supplier}>{supplier.slice(0, 1)}</span>)}{suppliers.length > 3 && <i>+{suppliers.length - 3}</i>}</div><span>Active suppliers</span><strong>{suppliers.length} <small>partners</small></strong><p>Suppliers linked to items and orders</p></div></div>
    <div className="panel table-panel purchase-table-panel"><div className="panel-header padded-header"><div><div className="panel-kicker">ORDER TRACKER</div><h2>Purchase orders</h2></div></div><div className="table-scroll"><table className="data-table"><thead><tr><th>ORDER</th><th>SUPPLIER</th><th>ITEMS</th><th>ORDER TOTAL</th><th>EXPECTED</th><th>STATUS</th><th>ACTION</th></tr></thead><tbody>{orders.map((order) => { const total = order.items.reduce((sum, line) => sum + line.quantity * line.unitCost, 0); return <tr key={order.id}><td><strong>{order.id}</strong><span className="cell-sub">Created {dateLabel(order.createdAt)}</span></td><td><div className="supplier-cell"><div className="supplier-mark">{order.supplier.slice(0, 1)}</div><strong>{order.supplier}</strong></div></td><td>{order.items.length} {order.items.length === 1 ? 'item' : 'items'} <span className="cell-sub">{order.items.map((line) => products.find((product) => product.id === line.productId)?.name || 'Removed item').join(', ')}</span></td><td>{money(total)}</td><td>{dateLabel(order.expectedAt)}</td><td><span className={`status-pill ${order.status === 'Received' ? 'status-paid' : 'status-transit'}`}><i />{order.status}</span></td><td>{order.status === 'Ordered' ? <button className="small-action" onClick={() => onReceive(order)}><Check size={14} /> Receive</button> : <span className="received-label"><CheckCircle2 size={14} /> Done</span>}</td></tr> })}{orders.length === 0 && <tr><td colSpan={7} className="table-empty">No purchase orders yet. Create one to get started.</td></tr>}</tbody></table></div><div className="table-footer"><span><strong>{orders.length}</strong> purchase orders</span></div></div>
    <div className="purchase-tip"><div><Sparkles size={17} /></div><p><strong>Good to know</strong><br />Receiving an order adds the purchased quantity to your on-hand stock and records it in the movement history.</p></div>
  </>
}

function InvoicesPage({ invoices, onOpen, onPrint }: { invoices: Invoice[]; onOpen: (invoice: Invoice) => void; onPrint: (invoice: Invoice) => void }) {
  const totalDue = invoices.filter((invoice) => invoice.status === 'Due').reduce((sum, invoice) => sum + invoice.total, 0)
  const exportList = () => {
    const rows = [['Invoice', 'Customer', 'Date', 'Payment', 'Status', 'Amount'], ...invoices.map((invoice) => [invoice.id, invoice.customer, dateLabel(invoice.createdAt), invoice.payment, invoice.status, invoice.total])]
    const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'mise-invoices.csv'
    link.click()
    URL.revokeObjectURL(url)
  }
  return <>
    <PageHeading eyebrow="SALES RECORDS" title="Invoices" subtitle="A clear record of every sale, payment and open balance." action={<button className="button button-secondary" onClick={exportList}><Download size={16} /> Export list</button>} />
    <div className="invoice-stats"><div><span>Total invoiced</span><strong>{money(invoices.reduce((sum, invoice) => sum + invoice.total, 0))}</strong><small>Across {invoices.length} invoices</small></div><div><span>Paid</span><strong>{invoices.filter((invoice) => invoice.status === 'Paid').length}</strong><small>Settled invoices</small></div><div><span>Outstanding</span><strong className="text-amber">{money(totalDue)}</strong><small>{invoices.filter((invoice) => invoice.status === 'Due').length} invoice due</small></div><div><span>Average order</span><strong>{money(invoices.length ? invoices.reduce((sum, invoice) => sum + invoice.total, 0) / invoices.length : 0)}</strong><small>Per invoice</small></div></div>
    <div className="panel table-panel"><div className="panel-header padded-header"><div><div className="panel-kicker">ALL TRANSACTIONS</div><h2>Invoice history</h2></div></div><div className="table-scroll"><table className="data-table invoice-table"><thead><tr><th>INVOICE</th><th>CUSTOMER</th><th>DATE</th><th>PAYMENT</th><th>AMOUNT</th><th>STATUS</th><th></th></tr></thead><tbody>{invoices.map((invoice) => <tr key={invoice.id} onClick={() => onOpen(invoice)} className="clickable-row"><td><strong>{invoice.id}</strong><span className="cell-sub">{invoice.lines.length} line items</span></td><td><strong className="normal-weight">{invoice.customer}</strong></td><td>{dateLabel(invoice.createdAt)}</td><td>{invoice.payment}</td><td><strong>{money(invoice.total)}</strong></td><td><span className={`status-pill ${invoice.status === 'Paid' ? 'status-paid' : 'status-due'}`}><i />{invoice.status}</span></td><td><button className="icon-button table-print" onClick={(event) => { event.stopPropagation(); onPrint(invoice) }} aria-label={`Print ${invoice.id}`}><Printer size={16} /></button></td></tr>)}</tbody></table></div><div className="table-footer"><span>Showing <strong>{invoices.length}</strong> invoices</span></div></div>
  </>
}

function ReportsPage({ data, stockValue, onExport }: { data: AppData; stockValue: number; onExport: () => void }) {
  const categoryValues = Array.from(new Set(data.products.map((product) => product.category))).map((name) => ({ name, value: data.products.filter((product) => product.category === name).reduce((sum, product) => sum + product.onHand * product.unitCost, 0) })).sort((a, b) => b.value - a.value)
  const max = Math.max(...categoryValues.map((item) => item.value), 1)
  const expiring = data.products.filter((product) => product.expiry).sort((a, b) => (a.expiry || '').localeCompare(b.expiry || '')).slice(0, 4)
  const paidInvoices = data.invoices.filter((invoice) => invoice.status === 'Paid')
  const weekly = Array.from({ length: 7 }, (_, index) => {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() - (6 - index))
    const total = paidInvoices.filter((invoice) => new Date(invoice.createdAt).toDateString() === date.toDateString()).reduce((sum, invoice) => sum + invoice.total, 0)
    return { date, total, label: new Intl.DateTimeFormat('en-GH', { weekday: 'short' }).format(date) }
  })
  const weeklyTotal = weekly.reduce((sum, day) => sum + day.total, 0)
  const weeklyInvoiceCount = paidInvoices.filter((invoice) => weekly.some((day) => day.date.toDateString() === new Date(invoice.createdAt).toDateString())).length
  const weeklyMax = Math.max(...weekly.map((day) => day.total), 1)
  return <>
    <PageHeading eyebrow="BUSINESS PULSE" title="Reports" subtitle="The numbers behind a well-run kitchen." action={<button className="button button-secondary" onClick={onExport}><Download size={16} /> Export data</button>} />
    <div className="report-highlight"><div className="highlight-copy"><div className="panel-kicker">PAID SALES · LAST 7 DAYS</div><strong>{money(weeklyTotal)}</strong><p>{weeklyInvoiceCount} paid invoices in this window. New POS checkouts appear here automatically.</p></div><div className="report-chart">{weekly.map((day) => <div className="report-bar-group" key={day.date.toISOString()}><strong>{money(day.total)}</strong><div style={{ height: `${Math.max(day.total ? (day.total / weeklyMax) * 72 : 3, 3)}%` }} className={day.date.toDateString() === new Date().toDateString() ? 'report-bar active' : 'report-bar'} /><span>{day.label}</span></div>)}</div></div>
    <div className="reports-grid"><div className="panel report-panel"><div className="panel-header"><div><div className="panel-kicker">INVENTORY VALUE</div><h2>{money(stockValue)}</h2></div><span className="report-icon"><Package size={18} /></span></div><div className="category-bars">{categoryValues.map((item) => <div className="category-bar-row" key={item.name}><div><span>{item.name}</span><strong>{money(item.value)}</strong></div><div className="category-track"><span style={{ width: `${Math.max((item.value / max) * 100, 5)}%` }} /></div></div>)}</div><div className="report-panel-foot"><span>Current stock × unit cost</span><button onClick={onExport}>Download CSV <ArrowRight size={14} /></button></div></div>
      <div className="panel report-panel expiry-panel"><div className="panel-header"><div><div className="panel-kicker">FOOD SAFETY</div><h2>Expiry watch</h2></div><div className="expiry-icon"><Clock3 size={17} /></div></div><p className="panel-description">Keep an eye on the next ingredients to use.</p><div className="expiry-list">{expiring.map((product) => <div className="expiry-row" key={product.id}><div className="expiry-product"><span className="expiry-dot" /><div><strong>{product.name}</strong><span>{quantity(product.onHand)} {product.unit} on hand</span></div></div><span className="expiry-date">{dateLabel(product.expiry || '')}</span></div>)}</div></div></div>
    <div className="report-note"><CircleAlert size={16} /><span>Expiry dates are sample lot dates in this demo. A production setup should record expiry per received batch.</span></div>
  </>
}

function AdjustModal({ product, onClose, onSave, onCreate }: { product: Product; onClose: () => void; onSave: (productId: string, count: number, reason: string) => void; onCreate: (product: Omit<Product, 'id'>) => void }) {
  const isNew = !product.id
  const [count, setCount] = useState(String(product.onHand))
  const [reason, setReason] = useState('Stock count correction')
  if (isNew) return <AddItemModal onClose={onClose} onCreate={onCreate} />
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="adjust-dialog-title" onMouseDown={(event) => event.stopPropagation()}><div className="modal-header"><div><div className="panel-kicker">STOCK CONTROL</div><h2 id="adjust-dialog-title">Adjust quantity</h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={18} /></button></div><div className="modal-product"><div className="product-initial">{product.name.slice(0, 1)}</div><div><strong>{product.name}</strong><span>Currently {quantity(product.onHand)} {product.unit} on hand</span></div></div><label className="field-label" htmlFor="stock-count">NEW ON-HAND COUNT</label><div className="input-with-unit"><input id="stock-count" className="text-input" type="number" min="0" step="0.01" value={count} onChange={(event) => setCount(event.target.value)} /><span>{product.unit}</span></div><label className="field-label" htmlFor="stock-reason">REASON</label><select id="stock-reason" className="text-input" value={reason} onChange={(event) => setReason(event.target.value)}><option>Stock count correction</option><option>Damaged or wasted</option><option>Expired stock</option><option>Internal use</option><option>Opening balance</option></select><div className="modal-actions"><button className="button button-secondary" onClick={onClose}>Cancel</button><button className="button button-primary" onClick={() => onSave(product.id, Number(count), reason)} disabled={!count.trim() || !Number.isFinite(Number(count)) || Number(count) < 0}>Save adjustment</button></div></div></div>
}

function AddItemModal({ onClose, onCreate }: { onClose: () => void; onCreate: (product: Omit<Product, 'id'>) => void }) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState('Produce')
  const [unit, setUnit] = useState('kg')
  const [onHand, setOnHand] = useState('0')
  const [reorderAt, setReorderAt] = useState('1')
  const [unitCost, setUnitCost] = useState('0')
  const [supplier, setSupplier] = useState('')
  const [sku, setSku] = useState('')
  const submit = () => {
    const values = [onHand, reorderAt, unitCost]
    if (!name.trim() || values.some((value) => !value.trim() || !Number.isFinite(Number(value)) || Number(value) < 0)) return
    onCreate({ name: name.trim(), category, unit, onHand: Number(onHand), reorderAt: Number(reorderAt), unitCost: Number(unitCost), supplier: supplier.trim() || 'Unassigned', sku: sku.trim() || `NEW-${Date.now().toString().slice(-4)}` })
  }
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="add-item-dialog-title" onMouseDown={(event) => event.stopPropagation()}><div className="modal-header"><div><div className="panel-kicker">INVENTORY SETUP</div><h2 id="add-item-dialog-title">Add inventory item</h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={18} /></button></div><p className="modal-intro">Track ingredients, packaging or other supplies from their opening count.</p><label className="field-label">ITEM NAME</label><input className="text-input" autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Fresh ginger" /><div className="form-two-col"><div><label className="field-label">CATEGORY</label><select className="text-input" value={category} onChange={(event) => setCategory(event.target.value)}><option>Produce</option><option>Meat & poultry</option><option>Dairy & eggs</option><option>Grains & dry goods</option><option>Packaging</option><option>Beverages</option><option>Other</option></select></div><div><label className="field-label">UNIT</label><select className="text-input" value={unit} onChange={(event) => setUnit(event.target.value)}><option>kg</option><option>g</option><option>L</option><option>ml</option><option>pcs</option><option>box</option><option>pack</option></select></div></div><div className="form-two-col"><div><label className="field-label">OPENING COUNT</label><input className="text-input" type="number" min="0" step="0.01" value={onHand} onChange={(event) => setOnHand(event.target.value)} /></div><div><label className="field-label">REORDER AT</label><input className="text-input" type="number" min="0" step="0.01" value={reorderAt} onChange={(event) => setReorderAt(event.target.value)} /></div></div><div className="form-two-col"><div><label className="field-label">UNIT COST ({CURRENCY})</label><input className="text-input" type="number" min="0" step="0.01" value={unitCost} onChange={(event) => setUnitCost(event.target.value)} /></div><div><label className="field-label">SKU <span className="optional-label">OPTIONAL</span></label><input className="text-input" value={sku} onChange={(event) => setSku(event.target.value)} placeholder="Auto-generated" /></div></div><label className="field-label">SUPPLIER <span className="optional-label">OPTIONAL</span></label><input className="text-input" value={supplier} onChange={(event) => setSupplier(event.target.value)} placeholder="Supplier name" /><div className="modal-actions"><button className="button button-secondary" onClick={onClose}>Cancel</button><button className="button button-primary" onClick={submit} disabled={!name.trim() || [onHand, reorderAt, unitCost].some((value) => !value.trim() || !Number.isFinite(Number(value)) || Number(value) < 0)}>Add item</button></div></div></div>
}

function PurchaseModal({ products, onClose, onCreate }: { products: Product[]; onClose: () => void; onCreate: (items: { productId: string; quantity: number }[], supplier: string, expectedAt: string) => void }) {
  const suggested = products.find((product) => product.onHand <= product.reorderAt) || products[0]
  const [items, setItems] = useState([{ productId: suggested?.id || '', quantity: suggested ? String(Math.max(1, Math.ceil(suggested.reorderAt * 2 - suggested.onHand))) : '1' }])
  const [supplier, setSupplier] = useState(suggested?.supplier || '')
  const [expectedAt, setExpectedAt] = useState(new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10))
  const updateItem = (index: number, field: 'productId' | 'quantity', value: string) => {
    setItems((previous) => previous.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item))
  }
  const usedProductIds = new Set(items.map((item) => item.productId))
  const total = items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (products.find((product) => product.id === item.productId)?.unitCost || 0), 0)
  const valid = Boolean(supplier.trim() && expectedAt && items.length && items.every((item) => item.productId && Number.isFinite(Number(item.quantity)) && Number(item.quantity) > 0))
  const addItem = () => {
    const next = products.find((product) => !usedProductIds.has(product.id))
    if (next) setItems((previous) => [...previous, { productId: next.id, quantity: '1' }])
  }
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal purchase-modal" role="dialog" aria-modal="true" aria-labelledby="purchase-dialog-title" onMouseDown={(event) => event.stopPropagation()}><div className="modal-header"><div><div className="panel-kicker">SUPPLIER WORKFLOW</div><h2 id="purchase-dialog-title">New purchase order</h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={18} /></button></div><p className="modal-intro">Add several ingredients to one supplier order, then receive them together.</p><div className="purchase-order-lines">{items.map((item, index) => {
    const selected = products.find((product) => product.id === item.productId)
    return <div className="purchase-order-line" key={item.productId || index}><label className="field-label" htmlFor={`purchase-product-${index}`}>ITEM {index + 1}</label><div className="purchase-line-fields"><select id={`purchase-product-${index}`} className="text-input" value={item.productId} onChange={(event) => updateItem(index, 'productId', event.target.value)}>{products.map((product) => <option key={product.id} value={product.id} disabled={product.id !== item.productId && usedProductIds.has(product.id)}>{product.name} · {quantity(product.onHand)} {product.unit}</option>)}</select><div className="purchase-quantity"><input className="text-input" type="number" min="0.01" step="0.01" value={item.quantity} onChange={(event) => updateItem(index, 'quantity', event.target.value)} aria-label={`Quantity for item ${index + 1}`} /><span>{selected?.unit || 'units'}</span></div>{items.length > 1 && <button className="icon-button remove-purchase-line" aria-label={`Remove item ${index + 1}`} onClick={() => setItems((previous) => previous.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={16} /></button>}</div></div>
  })}</div><button className="add-purchase-line" onClick={addItem} disabled={usedProductIds.size >= products.length}><Plus size={15} /> Add another item</button><div className="purchase-date-supplier"><div><label className="field-label" htmlFor="purchase-expected-at">EXPECTED DELIVERY</label><input id="purchase-expected-at" className="text-input" type="date" value={expectedAt} onChange={(event) => setExpectedAt(event.target.value)} /></div><div><label className="field-label" htmlFor="purchase-supplier">SUPPLIER</label><input id="purchase-supplier" className="text-input" value={supplier} onChange={(event) => setSupplier(event.target.value)} placeholder="Supplier name" /></div></div><div className="po-total"><span>Estimated order total</span><strong>{money(total)}</strong></div><div className="modal-actions"><button className="button button-secondary" onClick={onClose}>Cancel</button><button className="button button-primary" onClick={() => onCreate(items.map((item) => ({ productId: item.productId, quantity: Number(item.quantity) })), supplier, expectedAt)} disabled={!valid}>Create order</button></div></div></div>
}

function InvoiceModal({ invoice, onClose, onPrint, onMarkPaid }: { invoice: Invoice; onClose: () => void; onPrint: () => void; onMarkPaid: () => void }) {
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal invoice-modal" role="dialog" aria-modal="true" aria-labelledby="invoice-dialog-title" onMouseDown={(event) => event.stopPropagation()}><div className="modal-header"><div><div className="panel-kicker">INVOICE</div><h2 id="invoice-dialog-title">{invoice.id}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={18} /></button></div><div className="invoice-preview-head"><div><span>Bill to</span><strong>{invoice.customer}</strong></div><div><span>Issued</span><strong>{dateLabel(invoice.createdAt)}</strong></div><span className={`status-pill ${invoice.status === 'Paid' ? 'status-paid' : 'status-due'}`}><i />{invoice.status}</span></div><div className="invoice-preview-lines">{invoice.lines.map((line, index) => <div className="preview-line" key={index}><span>{line.name}<small>{line.quantity} × {money(line.unitPrice)}</small></span><strong>{money(line.quantity * line.unitPrice)}</strong></div>)}</div><div className="invoice-preview-total"><div><span>Subtotal</span><strong>{money(invoice.subtotal)}</strong></div><div><span>Tax</span><strong>{money(invoice.tax)}</strong></div><div className="preview-grand"><span>Total</span><strong>{money(invoice.total)}</strong></div></div><div className="modal-actions"><button className="button button-secondary" onClick={onClose}>Close</button>{invoice.status === 'Due' && <button className="button button-secondary" onClick={onMarkPaid}><Check size={16} /> Mark as paid</button>}<button className="button button-primary" onClick={onPrint}><Printer size={16} /> Print invoice</button></div></div></div>
}

export default App
