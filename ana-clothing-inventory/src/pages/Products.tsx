// Products — premium product card grid, responsive, maroon/dirty-white
import { useEffect, useState } from "react"
import { Plus, ChevronDown, ChevronRight, Edit2, Trash2 } from "lucide-react"
import { getAllProducts, getVariantsByProduct } from "../engine/queries"
import { getStock } from "../engine/stock-engine"
import { createProduct, createVariant, editProduct, removeProduct, editVariant, removeVariant } from "../engine/product-service"
import { db } from "../db/database"
import { onSyncPulled } from "../sync/sync-events"
import type { Product, Variant } from "../db/models"
import Card from "../ui/components/Card"
import Modal from "../ui/components/Modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"

export default function Products() {
  const [products, setProducts] = useState<Product[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [vData, setVData] = useState<Record<string, { variants: Variant[]; stocks: Record<string, number>; total: number }>>({})
  const [loading, setLoading] = useState(true)
  const [showProductModal, setShowProductModal] = useState(false)
  const [newProductName, setNewProductName] = useState("")
  const [productNameError, setProductNameError] = useState("")
  const [variantForm, setVariantForm] = useState<{ productId: string; size: string; color: string; sku: string } | null>(null)
  const [variantErrors, setVariantErrors] = useState<{ sku?: string }>({})
  const [editProductForm, setEditProductForm] = useState<{ id: string; name: string } | null>(null)
  const [editVariantForm, setEditVariantForm] = useState<{ id: string; productId: string; size: string; color: string; sku: string } | null>(null)

  async function loadProducts() {
    const all = await getAllProducts()
    setProducts(all)
    setLoading(false)

    // Prefetch variant list and stock for all products to show count summaries immediately
    const initialVData: Record<string, { variants: Variant[]; stocks: Record<string, number>; total: number }> = {}
    await Promise.all(
      all.map(async (p) => {
        const variants = await getVariantsByProduct(p.id)
        const stocks: Record<string, number> = {}
        let total = 0
        for (const v of variants) {
          const s = await getStock(v.id)
          stocks[v.id] = s
          total += s
        }
        initialVData[p.id] = { variants, stocks, total }
      })
    )
    setVData(initialVData)
  }
  useEffect(() => { loadProducts() }, [])
  // Re-load whenever the sync engine pulls remote changes
  useEffect(() => onSyncPulled(loadProducts), [])

  async function toggleExpand(id: string) {
    setExpanded((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
    if (!vData[id]) {
      const variants = await getVariantsByProduct(id)
      const stocks: Record<string, number> = {}
      let total = 0
      for (const v of variants) { const s = await getStock(v.id); stocks[v.id] = s; total += s }
      setVData((p) => ({ ...p, [id]: { variants, stocks, total } }))
    }
  }

  async function handleCreateProduct(e: React.FormEvent) {
    e.preventDefault()
    if (!newProductName.trim()) { setProductNameError("Product name is required"); return }
    setProductNameError("")
    await createProduct({ name: newProductName.trim() })
    setNewProductName("")
    setShowProductModal(false)
    await loadProducts()
  }

  async function handleCreateVariant(e: React.FormEvent) {
    e.preventDefault()
    if (!variantForm) return
    const { productId, size, color, sku } = variantForm
    if (!sku.trim()) { setVariantErrors({ sku: "SKU is required" }); return }
    
    // Check for duplicate SKU globally
    const existing = await db.variants.where("sku").equals(sku.trim()).first()
    if (existing) {
      setVariantErrors({ sku: "This SKU is already in use. SKUs must be globally unique." })
      return
    }

    setVariantErrors({})
    await createVariant({ product_id: productId, size, color, sku: sku.trim() })
    setVariantForm(null)
    const variants = await getVariantsByProduct(productId)
    const stocks: Record<string, number> = {}
    let total = 0
    for (const v of variants) { const s = await getStock(v.id); stocks[v.id] = s; total += s }
    setVData((p) => ({ ...p, [productId]: { variants, stocks, total } }))
  }

  async function handleEditProduct(e: React.FormEvent) {
    e.preventDefault()
    if (!editProductForm || !editProductForm.name.trim()) return
    await editProduct(editProductForm.id, { name: editProductForm.name.trim() })
    setEditProductForm(null)
    await loadProducts()
  }

  async function handleDeleteProduct(id: string) {
    if (!confirm("Are you sure you want to delete this product? This will also permanently delete all of its variants and inventory history!")) return
    await removeProduct(id)
    await loadProducts()
  }

  async function handleEditVariant(e: React.FormEvent) {
    e.preventDefault()
    if (!editVariantForm) return
    if (!editVariantForm.sku.trim()) { setVariantErrors({ sku: "SKU is required" }); return }

    // Check for duplicate SKU globally (ignoring the current variant)
    const existing = await db.variants.where("sku").equals(editVariantForm.sku.trim()).first()
    if (existing && existing.id !== editVariantForm.id) {
      setVariantErrors({ sku: "This SKU is already in use by another variant." })
      return
    }

    setVariantErrors({})
    await editVariant(editVariantForm.id, { size: editVariantForm.size, color: editVariantForm.color, sku: editVariantForm.sku.trim() })
    
    const productId = editVariantForm.productId
    setEditVariantForm(null)
    
    const variants = await getVariantsByProduct(productId)
    const stocks: Record<string, number> = {}
    let total = 0
    for (const v of variants) { const s = await getStock(v.id); stocks[v.id] = s; total += s }
    setVData((p) => ({ ...p, [productId]: { variants, stocks, total } }))
  }

  async function handleDeleteVariant(id: string, productId: string) {
    if (!confirm("Are you sure you want to delete this variant? This will permanently delete its inventory history!")) return
    await removeVariant(id)
    
    const variants = await getVariantsByProduct(productId)
    const stocks: Record<string, number> = {}
    let total = 0
    for (const v of variants) { const s = await getStock(v.id); stocks[v.id] = s; total += s }
    setVData((p) => ({ ...p, [productId]: { variants, stocks, total } }))
  }

  if (loading) {
    return (
      <div>
        <div className="flex justify-between mb-6">
          <div><Skeleton className="h-6 w-[120px] mb-1" /><Skeleton className="h-3 w-20" /></div>
          <Skeleton className="h-8 w-[100px] rounded-md" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 rounded-xxl" />)}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-xl font-semibold text-text tracking-tight m-0">Products</h2>
          <p className="mt-1 text-[13px] text-muted m-0">{products.length} product{products.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => { setShowProductModal(true); setProductNameError("") }}>
          <Plus size={14} />
          <span className="hidden md:inline">Add Product</span>
        </Button>
      </div>

      {products.length === 0 && (
        <Card><div className="text-center py-5 text-muted text-[13px]">No products yet. Add your first product.</div></Card>
      )}

      {products.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {products.map((p) => {
            const d = vData[p.id]
            const isExpanded = expanded.has(p.id)
            return (
              <Card key={p.id} className="!p-0 overflow-hidden">
                <div onClick={() => toggleExpand(p.id)} className="p-3.5 cursor-pointer flex items-center justify-between select-none hover:bg-black/[0.02] transition-colors">
                  <div className="flex items-center gap-1.5">
                    {isExpanded ? <ChevronDown size={14} className="text-muted" /> : <ChevronRight size={14} className="text-muted" />}
                    <span className="text-sm font-semibold text-text">{p.name}</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className="text-[10px] font-semibold bg-[#6B6661]/[0.08] px-2 py-0.5 rounded-full text-muted">
                      {d ? `${d.variants.length} var` : "..."}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      d ? (d.total <= 5 ? "bg-error/10 text-error" : "bg-success/10 text-success") : "bg-muted/10 text-muted"
                    }`}>
                      {d ? `${d.total} units` : "..."}
                    </span>
                    <div className="flex items-center ml-1 border-l border-border pl-2">
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:text-accent" onClick={(e) => { e.stopPropagation(); setEditProductForm({ id: p.id, name: p.name }) }}>
                        <Edit2 size={13} />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:text-error" onClick={(e) => { e.stopPropagation(); handleDeleteProduct(p.id) }}>
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </div>
                </div>
                {isExpanded && d && (
                  <div className="border-t border-border p-3 bg-black/[0.01]">
                    {d.variants.length === 0 && <p className="text-[13px] text-muted m-0 mb-2">No variants yet.</p>}
                    {d.variants.map((v) => {
                      const s = d.stocks[v.id] ?? 0
                      return (
                        <div key={v.id} className="flex justify-between items-center p-1.5 bg-surface border border-border rounded-sm mb-1 text-[13px] group">
                          <span>{v.size ?? "N/A"} / {v.color ?? "N/A"} <span className="text-muted text-[11px]">({v.sku ?? "no SKU"})</span></span>
                          <div className="flex items-center gap-3">
                            <span className={`font-semibold ${s <= 5 ? "text-error" : "text-success"}`}>{s}</span>
                            <div className="hidden group-hover:flex items-center gap-0.5 border-l border-border pl-2">
                              <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-muted hover:text-accent" onClick={() => setEditVariantForm({ id: v.id, productId: p.id, size: v.size ?? "", color: v.color ?? "", sku: v.sku ?? "" })}>
                                <Edit2 size={12} />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-muted hover:text-error" onClick={() => handleDeleteVariant(v.id, p.id)}>
                                <Trash2 size={12} />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    <Button variant="outline" size="sm" onClick={() => setVariantForm({ productId: p.id, size: "", color: "", sku: "" })} className="mt-2 border-dashed border-accent text-accent hover:bg-accent/5">
                      <Plus size={12} /> Add Variant
                    </Button>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      <Modal open={showProductModal} onClose={() => setShowProductModal(false)} title="Add Product">
        <form onSubmit={handleCreateProduct}>
          <Input
            placeholder="Product name"
            value={newProductName}
            onChange={(e) => { setNewProductName(e.target.value); if (productNameError) setProductNameError("") }}
            autoFocus
            maxLength={100}
            className={productNameError ? "border-error" : ""}
          />
          {productNameError && <div className="text-xs text-error mt-1">{productNameError}</div>}
          <div className="flex gap-2 justify-end mt-4">
            <Button type="button" variant="outline" onClick={() => setShowProductModal(false)}>Cancel</Button>
            <Button type="submit">Create</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!variantForm} onClose={() => setVariantForm(null)} title="Add Variant">
        {variantForm && (
          <form onSubmit={handleCreateVariant}>
            <div className="flex flex-col gap-2.5">
              <Input placeholder="Size (e.g. M, 32, XL)" value={variantForm.size} onChange={(e) => setVariantForm({ ...variantForm, size: e.target.value })} maxLength={50} />
              <Input placeholder="Color (e.g. Black, Navy)" value={variantForm.color} onChange={(e) => setVariantForm({ ...variantForm, color: e.target.value })} maxLength={50} />
              <Input placeholder="SKU" value={variantForm.sku} onChange={(e) => { setVariantForm({ ...variantForm, sku: e.target.value }); if (variantErrors.sku) setVariantErrors({}) }} maxLength={50} className={variantErrors.sku ? "border-error" : ""} />
              {variantErrors.sku && <div className="text-xs text-error -mt-1.5">{variantErrors.sku}</div>}
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <Button type="button" variant="outline" onClick={() => setVariantForm(null)}>Cancel</Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={!!editProductForm} onClose={() => setEditProductForm(null)} title="Edit Product">
        {editProductForm && (
          <form onSubmit={handleEditProduct}>
            <Input
              placeholder="Product name"
              value={editProductForm.name}
              onChange={(e) => setEditProductForm({ ...editProductForm, name: e.target.value })}
              autoFocus
              maxLength={100}
            />
            <div className="flex gap-2 justify-end mt-4">
              <Button type="button" variant="outline" onClick={() => setEditProductForm(null)}>Cancel</Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={!!editVariantForm} onClose={() => setEditVariantForm(null)} title="Edit Variant">
        {editVariantForm && (
          <form onSubmit={handleEditVariant}>
            <div className="flex flex-col gap-2.5">
              <Input placeholder="Size (e.g. M, 32, XL)" value={editVariantForm.size} onChange={(e) => setEditVariantForm({ ...editVariantForm, size: e.target.value })} maxLength={50} />
              <Input placeholder="Color (e.g. Black, Navy)" value={editVariantForm.color} onChange={(e) => setEditVariantForm({ ...editVariantForm, color: e.target.value })} maxLength={50} />
              <Input placeholder="SKU" value={editVariantForm.sku} onChange={(e) => { setEditVariantForm({ ...editVariantForm, sku: e.target.value }); if (variantErrors.sku) setVariantErrors({}) }} maxLength={50} className={variantErrors.sku ? "border-error" : ""} />
              {variantErrors.sku && <div className="text-xs text-error -mt-1.5">{variantErrors.sku}</div>}
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <Button type="button" variant="outline" onClick={() => setEditVariantForm(null)}>Cancel</Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}