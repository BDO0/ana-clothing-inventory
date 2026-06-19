// Sales — step-flow form with low-stock warnings using shadcn components
import { useEffect, useState } from "react"
import { AlertTriangle, ShoppingCart, ScanLine } from "lucide-react"
import { getAllProducts, getVariantsByProduct, getAllVariants } from "../engine/queries"
import { getStock } from "../engine/stock-engine"
import { recordSale } from "../engine/inventory-service"
import { onSyncPulled } from "../sync/sync-events"
import type { Product, Variant } from "../db/models"
import Card from "../ui/components/Card"
import BarcodeScanner from "../ui/components/BarcodeScanner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { colors } from "../ui/tokens"

export default function Sales() {
  const [products, setProducts] = useState<Product[]>([])
  const [variants, setVariants] = useState<Variant[]>([])
  const [pId, setPId] = useState("")
  const [vId, setVId] = useState("")
  const [qty, setQty] = useState("")
  const [note, setNote] = useState("")
  const [currentStock, setCurrentStock] = useState<number | null>(null)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [errors, setErrors] = useState<{ qty?: string; variant?: string }>({})
  const [showScanner, setShowScanner] = useState(false)
  const [allVariants, setAllVariants] = useState<Variant[]>([])

  useEffect(() => { getAllVariants().then(setAllVariants) }, [])

  useEffect(() => { getAllProducts().then((all) => { setProducts(all); setLoading(false) }) }, [])

  // Re-load product list whenever the sync engine pulls remote changes
  useEffect(() => onSyncPulled(() => {
    getAllProducts().then((all) => { setProducts(all); setLoading(false) })
    getAllVariants().then(setAllVariants)
  }), [])

  function onProductChange(id: string) {
    setPId(id); setVId(""); setCurrentStock(null); setErrors({})
    if (id) { getVariantsByProduct(id).then(setVariants) } else setVariants([])
  }

  function onVariantChange(id: string) {
    setVId(id); setErrors({})
    if (id) { getStock(id).then(setCurrentStock) } else setCurrentStock(null)
  }

  function validate(): boolean {
    const errs: { qty?: string; variant?: string } = {}
    if (!vId) errs.variant = "Please select a variant"
    const q = parseInt(qty, 10)
    if (!qty || isNaN(q) || q <= 0) errs.qty = "Quantity must be greater than 0"
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit() {
    setMessage(null)
    if (!validate()) return
    const q = parseInt(qty, 10)
    try {
      await recordSale(vId, q, note || undefined)
      setMessage({ type: "success", text: `✅ Sale of ${q} units recorded.` })
      const updated = await getStock(vId)
      setCurrentStock(updated)
      setQty(""); setNote(""); setPId(""); setVId(""); setVariants([]); setErrors({})
    } catch (err) {
      setMessage({ type: "error", text: `❌ ${err instanceof Error ? err.message : "Unknown error"}` })
    }
  }

  function onQtyChange(value: string) {
    setQty(value)
    if (errors.qty) setErrors((prev) => ({ ...prev, qty: undefined }))
  }

  async function handleBarcodeScan(code: string) {
    setShowScanner(false)
    const matched = allVariants.find(
      v => v.sku === code || (v as any).barcode === code
    )
    if (!matched) {
      setMessage({ type: "error", text: `❌ No variant found for barcode: ${code}` })
      return
    }
    const variantList = await getVariantsByProduct(matched.product_id)
    setVariants(variantList)
    setPId(matched.product_id)
    setVId(matched.id)
    setErrors({})
    const stock = await getStock(matched.id)
    setCurrentStock(stock)
  }

  const qNum = parseInt(qty, 10)
  const hasValidQty = qty && !isNaN(qNum) && qNum > 0
  const wouldGoNegative = currentStock !== null && hasValidQty && qNum > currentStock
  const projected = currentStock !== null && hasValidQty ? currentStock - qNum : null

  if (loading) {
    return (
      <div>
        <Skeleton className="h-6 w-[20%] mb-1" />
        <Skeleton className="h-3 w-[40%]" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <Skeleton className="h-[280px] rounded-xxl" />
          <Skeleton className="h-[180px] rounded-xxl" />
        </div>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-text tracking-tight m-0">Sales</h2>
      <p className="mt-1 text-[13px] text-muted mb-6">Record a sale</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        <Card className="!p-0">
          <div className="p-4 space-y-3">
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <Label>Product</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-accent gap-1 hover:bg-accent/5"
                  onClick={() => setShowScanner(true)}
                >
                  <ScanLine size={12} /> Scan SKU
                </Button>
              </div>
              <select value={pId} onChange={(e) => onProductChange(e.target.value)} className="flex h-9 w-full rounded-md border border-border bg-surface px-3 py-1 text-sm text-text shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent">
                <option value="">Select product</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            {pId && (
              <div className="mb-3">
                <Label>Variant</Label>
                <select value={vId} onChange={(e) => onVariantChange(e.target.value)} className={`flex h-9 w-full rounded-md border bg-surface px-3 py-1 text-sm text-text shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent ${errors.variant ? "border-error" : "border-border"}`}>
                  <option value="">Select variant</option>
                  {variants.map((v) => <option key={v.id} value={v.id}>{v.size ?? "N/A"} / {v.color ?? "N/A"} ({v.sku ?? "no SKU"})</option>)}
                </select>
                {errors.variant && <div className="text-xs text-error mt-1">{errors.variant}</div>}
                {currentStock !== null && (
                  <div className={`text-xs mt-1 ${currentStock <= 5 ? "text-error font-semibold" : "text-muted"}`}>
                    Current: <strong className={currentStock <= 5 ? "text-error" : "text-text"}>{currentStock}</strong> units{currentStock <= 5 && " ⚠️ Low"}
                  </div>
                )}
              </div>
            )}

            {vId && (
              <>
                <div className="mb-3">
                  <Label>Quantity</Label>
                  <Input type="number" min="1" value={qty} onChange={(e) => onQtyChange(e.target.value)} className={errors.qty ? "border-error" : ""} />
                  {errors.qty && <div className="text-xs text-error mt-1">{errors.qty}</div>}
                </div>
                {wouldGoNegative && (
                  <div className="mb-3 p-2 rounded-md bg-error/10 text-error text-xs flex gap-1.5 items-start">
                    <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
                    <span>Selling {qNum} exceeds stock ({currentStock}). Stock will go negative but sale will still be recorded.</span>
                  </div>
                )}
                <div className="mb-3">
                  <Label>Note (optional)</Label>
                  <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Walk-in sale" maxLength={500} />
                </div>
                <Button variant="destructive" className="w-full" onClick={handleSubmit} disabled={!hasValidQty}>
                  <ShoppingCart size={14} /> {wouldGoNegative ? "Record Sale (overstock)" : "Confirm Sale"}
                </Button>
              </>
            )}
          </div>
        </Card>

        <div>
          {vId && pId && currentStock !== null && projected !== null ? (
            <Card header="Preview">
              <div className="flex items-center gap-1.5 mb-2">
                <ShoppingCart size={18} color={colors.error} />
                <span className="font-bold text-[15px] text-error">-{qNum || "?"} SALE</span>
              </div>
              <div className="text-[13px] text-muted mb-2">
                {products.find((p) => p.id === pId)?.name}
                &nbsp;— {variants.find((v) => v.id === vId)?.size ?? "N/A"} / {variants.find((v) => v.id === vId)?.color ?? "N/A"}
              </div>
              <div className="flex justify-between p-2 bg-bg rounded-sm text-[13px] border border-border">
                <span className="text-muted">{currentStock} →</span>
                <span className="font-bold text-error">{projected} units</span>
              </div>
              {projected < 0 && <div className="text-[11px] text-muted mt-1.5">Negative stock allowed (event-driven system)</div>}
            </Card>
          ) : (
            <Card><div className="text-center py-3 text-muted text-[13px]">Select a product and variant</div></Card>
          )}
          {message && (
            <div className={`mt-3 px-3.5 py-2 rounded-md text-[13px] ${message.type === "success" ? "bg-success/10 text-success" : "bg-error/10 text-error"}`}>
              {message.text}
            </div>
          )}
        </div>
      </div>

      {showScanner && (
        <BarcodeScanner
          onScan={handleBarcodeScan}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  )
}